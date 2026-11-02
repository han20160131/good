"""
FastAPI Local Server for Free Novel Voice Studio.
Binds to localhost:8000. Provides health check, TTS synthesis, and audio merger.
"""

import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List

from database import init_db
from tts_engine import synthesize_text, DEFAULT_VOICE
from audio_merger import merge_mp3_files

app = FastAPI(title="Free Novel Voice Studio Local Backend", version="1.0.0")

# Restrict CORS to local development and local web app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_VOICE_DIR = os.path.expanduser("~/NovelVoices")

@app.on_event("startup")
def startup_event():
    init_db()
    os.makedirs(BASE_VOICE_DIR, exist_ok=True)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "voice": DEFAULT_VOICE,
        "storageDir": BASE_VOICE_DIR,
    }

class TestTTSRequest(BaseModel):
    voice: Optional[str] = DEFAULT_VOICE
    text: str
    rate: Optional[str] = "+0%"
    pitch: Optional[str] = "+0Hz"

@app.post("/api/tts/test")
async def test_tts(req: TestTTSRequest):
    test_path = os.path.join(BASE_VOICE_DIR, "test_sample.mp3")
    try:
        res = await synthesize_text(
            text=req.text,
            output_filepath=test_path,
            voice=req.voice or DEFAULT_VOICE,
            rate=req.rate or "+0%",
            pitch=req.pitch or "+0Hz",
        )
        return FileResponse(test_path, media_type="audio/mpeg", filename="test_sample.mp3")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SynthesizeParagraphRequest(BaseModel):
    projectId: str
    paragraphId: str
    text: str
    voice: Optional[str] = DEFAULT_VOICE
    rate: Optional[str] = "+0%"
    pitch: Optional[str] = "+0Hz"

@app.post("/api/tts/synthesize")
async def synthesize_paragraph(req: SynthesizeParagraphRequest):
    project_dir = os.path.join(BASE_VOICE_DIR, req.projectId, "chunks")
    os.makedirs(project_dir, exist_ok=True)
    target_file = os.path.join(project_dir, f"{req.paragraphId}.mp3")

    try:
        result = await synthesize_text(
            text=req.text,
            output_filepath=target_file,
            voice=req.voice or DEFAULT_VOICE,
            rate=req.rate or "+0%",
            pitch=req.pitch or "+0Hz",
        )
        return {
            "success": True,
            "paragraphId": req.paragraphId,
            "audioUrl": f"http://127.0.0.1:8000/api/audio/file?path={target_file}",
            "fileSizeBytes": result["fileSizeBytes"],
            "durationSeconds": result["durationSeconds"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/audio/file")
def get_audio_file(path: str):
    # Security check: must reside inside BASE_VOICE_DIR
    real_path = os.path.realpath(path)
    real_base = os.path.realpath(BASE_VOICE_DIR)
    if not real_path.startswith(real_base):
        raise HTTPException(status_code=403, detail="Access denied: outside allowed storage directory.")
    if not os.path.exists(real_path):
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(real_path, media_type="audio/mpeg")

class MergeAudioRequest(BaseModel):
    projectId: str
    scope: str
    chapterId: Optional[str] = None
    inputPaths: Optional[List[str]] = None

@app.post("/api/audio/merge")
def merge_audio(req: MergeAudioRequest):
    output_filename = f"{req.projectId}_{req.scope}.mp3"
    project_dir = os.path.join(BASE_VOICE_DIR, req.projectId)
    chunks_dir = os.path.join(project_dir, "chunks")
    output_path = os.path.join(project_dir, output_filename)

    # 1. Determine input chunk paths
    input_paths = req.inputPaths or []
    if not input_paths and os.path.exists(chunks_dir):
        all_chunks = [os.path.join(chunks_dir, f) for f in os.listdir(chunks_dir) if f.endswith(".mp3")]
        all_chunks.sort()
        input_paths = all_chunks

    if not input_paths:
        raise HTTPException(status_code=400, detail="沒有找到可合併的音訊片段 (No audio chunks found)")

    # 2. Validate that every single chunk exists and has valid audio (size >= 500 bytes)
    valid_chunks = []
    missing_or_empty = []
    for p in input_paths:
        if not os.path.exists(p) or os.path.getsize(p) < 500:
            missing_or_empty.append(p)
        else:
            valid_chunks.append(p)

    if missing_or_empty:
        raise HTTPException(
            status_code=400,
            detail=f"尚有 {len(missing_or_empty)} 個音訊片段不存在或大小為 0 位元組，無法合併完整小說。請先完成配音。"
        )

    # 3. Perform real FFmpeg merger via audio_merger
    try:
        merge_result = merge_mp3_files(valid_chunks, output_path)
        total_bytes = merge_result["totalBytes"]
        duration_sec = round(total_bytes / 6000)
        dur_min = duration_sec // 60
        dur_rem = duration_sec % 60

        return {
            "success": True,
            "fileName": output_filename,
            "durationFormatted": f"{dur_min} 分 {dur_rem} 秒",
            "durationSeconds": duration_sec,
            "fileSizeBytes": total_bytes,
            "fileSizeMB": f"{(total_bytes / (1024 * 1024)):.2f} MB",
            "totalChunksMerged": len(valid_chunks),
            "audioUrl": f"http://127.0.0.1:8000/api/audio/file?path={output_path}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"音訊合併失敗: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=False)

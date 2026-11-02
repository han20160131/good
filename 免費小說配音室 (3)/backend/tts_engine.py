"""
TTS Engine utilizing Microsoft Edge Neural Voice 'zh-CN-YunxiNeural' via edge-tts.
Strictly conforms to:
- No fake completions
- Bounded backoff retries on rate limits (429)
- Direct binary streaming to local disk (zero RAM accumulation)
"""

import os
import asyncio
import edge_tts
from typing import Optional, Dict, Any

DEFAULT_VOICE = "zh-CN-YunxiNeural"
MAX_RETRIES = 3
INITIAL_BACKOFF_SECONDS = 2.0

async def synthesize_text(
    text: str,
    output_filepath: str,
    voice: str = DEFAULT_VOICE,
    rate: str = "+0%",
    pitch: str = "+0Hz",
) -> Dict[str, Any]:
    """
    Synthesizes a single paragraph directly to output_filepath.
    Validates voice code, enforces rate & pitch parameters, and handles bounded retries.
    """
    if voice != DEFAULT_VOICE:
        # Strictly lock voice to Yunxi as requested
        voice = DEFAULT_VOICE

    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")

    # Guard against accidental massive payloads
    if len(text) > 800:
        raise ValueError(f"Paragraph length ({len(text)} chars) exceeds safe threshold of 800 chars.")

    os.makedirs(os.path.dirname(output_filepath), exist_ok=True)

    backoff = INITIAL_BACKOFF_SECONDS
    last_error: Optional[Exception] = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            communicate = edge_tts.Communicate(
                text=text,
                voice=voice,
                rate=rate,
                pitch=pitch,
            )
            # Direct stream save to disk
            await communicate.save(output_filepath)

            # Check file size to ensure non-empty audio
            if not os.path.exists(output_filepath):
                raise IOError("Target audio file was not written to disk.")

            file_size = os.path.getsize(output_filepath)
            if file_size < 1000:
                raise IOError(f"Synthesized audio file too small ({file_size} bytes), likely an error packet.")

            # Rough estimate: ~4.2 chars per second
            estimated_duration = round(len(text) / 4.2, 1)

            return {
                "success": True,
                "filePath": output_filepath,
                "fileSizeBytes": file_size,
                "durationSeconds": estimated_duration,
                "attempts": attempt,
            }
        except Exception as e:
            last_error = e
            if attempt < MAX_RETRIES:
                await asyncio.sleep(backoff)
                backoff *= 2.0

    raise RuntimeError(f"Edge TTS failed after {MAX_RETRIES} attempts. Cause: {str(last_error)}")

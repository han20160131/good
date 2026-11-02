"""
Lossless FFmpeg Audio Stream Concatenator.
Merges segmented MP3 files without re-encoding and with low RAM overhead (<50MB).
"""

import os
import subprocess
from typing import List, Dict, Any

def merge_mp3_files(
    input_file_paths: List[str],
    output_merged_path: str,
) -> Dict[str, Any]:
    """
    Concatenates a list of MP3 chunk files into a single merged MP3 file using ffmpeg concat demuxer.
    """
    if not input_file_paths:
        raise ValueError("No input files provided for merger.")

    # Validate that every single file exists
    missing = [p for p in input_file_paths if not os.path.exists(p)]
    if missing:
        raise FileNotFoundError(f"Missing {len(missing)} audio chunks: {missing[:3]}...")

    os.makedirs(os.path.dirname(output_merged_path), exist_ok=True)
    list_file_path = output_merged_path + ".filelist.txt"

    try:
        # Write ffmpeg concat file
        with open(list_file_path, "w", encoding="utf-8") as f:
            for path in input_file_paths:
                f.write(f"file '{os.path.abspath(path)}'\n")

        # Execute stream copy (no re-encoding, extremely fast)
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", list_file_path,
            "-c", "copy",
            output_merged_path,
        ]

        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
        )

        total_bytes = os.path.getsize(output_merged_path)

        return {
            "success": True,
            "outputPath": output_merged_path,
            "totalBytes": total_bytes,
        }
    finally:
        if os.path.exists(list_file_path):
            try:
                os.remove(list_file_path)
            except OSError:
                pass

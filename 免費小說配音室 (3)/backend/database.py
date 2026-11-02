"""
SQLite Persistence Layer for Free Novel Voice Studio.
Ensures zero-loss resume, idempotent paragraph generation, and transactional status tracking.
"""

import sqlite3
import os
import json
from typing import Dict, Any, List, Optional

DB_DIR = os.path.expanduser("~/NovelVoices")
DB_PATH = os.path.join(DB_DIR, "studio.db")

def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT,
        total_words INTEGER DEFAULT 0,
        voice_code TEXT DEFAULT 'zh-CN-YunxiNeural',
        rate TEXT DEFAULT '+0%',
        pitch TEXT DEFAULT '+0Hz',
        status TEXT DEFAULT 'draft',
        output_dir TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        chapter_order INTEGER NOT NULL,
        title TEXT NOT NULL,
        total_words INTEGER DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS paragraphs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        chapter_id TEXT NOT NULL,
        chapter_order INTEGER NOT NULL,
        paragraph_order INTEGER NOT NULL,
        text TEXT NOT NULL,
        word_count INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0,
        audio_path TEXT,
        audio_duration_seconds REAL,
        file_size_bytes INTEGER,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_para_status ON paragraphs(project_id, status);")
    conn.commit()
    conn.close()

def get_connection():
    return sqlite3.connect(DB_PATH)

from __future__ import annotations

import os
from pathlib import Path

from app.core.config import settings


def database_path() -> Path:
    """Return the configured SQLite database path for operational tooling."""
    url = settings.database.get_database_url()
    prefix = "sqlite:///"
    if not url.startswith(prefix):
        raise ValueError("Sprint 0 backup supports SQLite only")
    return Path(url[len(prefix):]).resolve()


def backup_directory() -> Path:
    """Return the configured persistent backup directory."""
    return Path(os.getenv("WRITERS_ROOM_BACKUP_DIR", "/backups")).resolve()

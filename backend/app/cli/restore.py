from __future__ import annotations

import argparse
from pathlib import Path

from app.core.storage import database_path
from app.services.backup_service import restore_backup


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Restore an integrity-checked SQLite backup.")
    parser.add_argument("backup_path", type=Path, help="Backup path visible inside the backend container.")
    parser.add_argument("--force", action="store_true", help="Replace an existing database after creating a safety backup.")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    safety_backup = restore_backup(args.backup_path, database_path(), force=args.force)
    if safety_backup is not None:
        print(safety_backup)


if __name__ == "__main__":
    main()

from __future__ import annotations

import argparse

from app.core.storage import backup_directory, database_path
from app.services.backup_service import create_backup


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Create an integrity-checked SQLite backup.")
    parser.add_argument("--label", help="Optional safe label added to the backup filename.")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    created = create_backup(database_path(), backup_directory(), label=args.label)
    print(created)


if __name__ == "__main__":
    main()

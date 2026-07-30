#!/usr/bin/env python3
"""Generate and validate privacy-safe NovelForge acceptance build metadata."""

import argparse
import base64
import datetime as dt
import hashlib
import json
import os
import stat
import subprocess
import sys
from pathlib import Path


EXPECTED_KEYS = {
    "gitSha",
    "gitBranch",
    "gitDirty",
    "workspaceFingerprint",
    "builtAt",
    "composeProject",
}
COMPOSE_PROJECT = "writer-ready-fixture"
FINGERPRINT_PREFIX = b"novelforge-workspace-fingerprint-v1"


class MetadataError(RuntimeError):
    pass


def git_bytes(root: str, arguments: list[str]) -> bytes:
    try:
        return subprocess.run(
            ["git", *arguments],
            cwd=root,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        ).stdout
    except (OSError, subprocess.CalledProcessError) as error:
        raise MetadataError("Git metadata is unavailable") from error


def repository_root() -> str:
    root = git_bytes(os.getcwd(), ["rev-parse", "--show-toplevel"])
    try:
        return root.rstrip(b"\n").decode("utf-8")
    except UnicodeDecodeError as error:
        raise MetadataError("Git repository path is not UTF-8") from error


def sha256_file(path: bytes, initial: os.stat_result) -> bytes:
    try:
        with open(path, "rb") as handle:
            descriptor_stat = os.fstat(handle.fileno())
            if not stat.S_ISREG(descriptor_stat.st_mode) or (
                descriptor_stat.st_dev,
                descriptor_stat.st_ino,
            ) != (initial.st_dev, initial.st_ino):
                raise MetadataError("Untracked entry changed while being read")
            digest = hashlib.sha256()
            while chunk := handle.read(65536):
                digest.update(chunk)
    except OSError as error:
        raise MetadataError("Untracked regular file cannot be read") from error
    try:
        final = os.lstat(path)
    except OSError as error:
        raise MetadataError("Untracked entry disappeared") from error
    if not stat.S_ISREG(final.st_mode) or (final.st_dev, final.st_ino) != (
        initial.st_dev,
        initial.st_ino,
    ):
        raise MetadataError("Untracked entry changed while being read")
    return digest.hexdigest().encode("ascii")


def untracked_record(root: str, relative: bytes) -> bytes:
    root_bytes = os.fsencode(root)
    path = os.path.join(root_bytes, relative)
    try:
        initial = os.lstat(path)
    except OSError as error:
        raise MetadataError("Untracked entry disappeared") from error
    if stat.S_ISREG(initial.st_mode):
        return relative + b"\0file\0" + sha256_file(path, initial) + b"\0"
    if stat.S_ISLNK(initial.st_mode):
        try:
            target = os.readlink(path)
            final = os.lstat(path)
        except OSError as error:
            raise MetadataError("Untracked symlink cannot be read") from error
        if not stat.S_ISLNK(final.st_mode) or (final.st_dev, final.st_ino) != (
            initial.st_dev,
            initial.st_ino,
        ):
            raise MetadataError("Untracked entry changed while being read")
        target_bytes = target if isinstance(target, bytes) else os.fsencode(target)
        return relative + b"\0symlink\0" + hashlib.sha256(target_bytes).hexdigest().encode("ascii") + b"\0"
    raise MetadataError("Untracked entry has unsupported file type")


def metadata() -> dict[str, object]:
    root = repository_root()
    git_sha = git_bytes(root, ["rev-parse", "HEAD"]).strip().decode("ascii")
    branch_bytes = git_bytes(root, ["branch", "--show-current"]).rstrip(b"\n")
    try:
        branch = branch_bytes.decode("utf-8")
    except UnicodeDecodeError as error:
        raise MetadataError("Git branch is not UTF-8") from error
    if not branch:
        raise MetadataError("Git branch is unavailable")
    diff = git_bytes(root, ["diff", "--binary", "HEAD", "--"])
    raw_untracked = git_bytes(root, ["ls-files", "--others", "--exclude-standard", "-z"])
    untracked = [entry for entry in raw_untracked.split(b"\0") if entry]
    fingerprint = hashlib.sha256()
    fingerprint.update(FINGERPRINT_PREFIX)
    fingerprint.update(diff)
    for relative in sorted(untracked):
        fingerprint.update(untracked_record(root, relative))
    return {
        "gitSha": git_sha,
        "gitBranch": branch,
        "gitDirty": bool(diff or untracked),
        "workspaceFingerprint": fingerprint.hexdigest(),
        "builtAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "composeProject": COMPOSE_PROJECT,
    }


def is_valid_timestamp(value: object) -> bool:
    if not isinstance(value, str) or not value.endswith("Z"):
        return False
    try:
        parsed = dt.datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError:
        return False
    return parsed.tzinfo is not None and parsed.utcoffset() == dt.timedelta(0)


def valid_schema(value: object) -> bool:
    if not isinstance(value, dict) or set(value) != EXPECTED_KEYS:
        return False
    return (
        isinstance(value["gitSha"], str)
        and len(value["gitSha"]) == 40
        and all(character in "0123456789abcdef" for character in value["gitSha"])
        and isinstance(value["gitBranch"], str)
        and bool(value["gitBranch"])
        and isinstance(value["gitDirty"], bool)
        and isinstance(value["workspaceFingerprint"], str)
        and len(value["workspaceFingerprint"]) == 64
        and all(character in "0123456789abcdef" for character in value["workspaceFingerprint"])
        and is_valid_timestamp(value["builtAt"])
        and value["composeProject"] == COMPOSE_PROJECT
    )


def compact_json(value: dict[str, object]) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compare(actual_file: str) -> int:
    try:
        with open(actual_file, encoding="utf-8") as handle:
            actual = json.load(handle)
    except (OSError, json.JSONDecodeError):
        print("METADATA_MISMATCH field=schema expected=<redacted-value> actual=<redacted-value>", file=sys.stderr)
        return 1
    if not valid_schema(actual):
        print("METADATA_MISMATCH field=schema expected=<redacted-value> actual=<redacted-value>", file=sys.stderr)
        return 1
    expected = metadata()
    failures = [
        name
        for name in ("gitSha", "gitBranch", "gitDirty", "workspaceFingerprint", "composeProject")
        if actual[name] != expected[name]
    ]
    for name in failures:
        print(f"METADATA_MISMATCH field={name} expected=<redacted-value> actual=<redacted-value>", file=sys.stderr)
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser("emit")
    subcommands.add_parser("emit-base64")
    compare_parser = subcommands.add_parser("compare")
    compare_parser.add_argument("--actual-file", required=True)
    arguments = parser.parse_args()
    try:
        if arguments.command == "compare":
            return compare(arguments.actual_file)
        payload = compact_json(metadata())
        if arguments.command == "emit-base64":
            print(base64.b64encode(payload.encode("utf-8")).decode("ascii"))
        else:
            print(payload)
        return 0
    except MetadataError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

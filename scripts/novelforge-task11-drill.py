#!/usr/bin/env python3
"""Fixture-only helpers for the Writer Ready Task 11 restore drill."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, NoReturn


EXPECTED_BASE_URL = "http://127.0.0.1:18080"
WRITER_FIELDS = (
    "title",
    "content",
    "ai_context_template",
    "ai_context_template_review",
)
EXPECTED_ID_KEYS = {
    "projectId",
    "chapterCardId",
    "markdownCardId",
    "referenceCardId",
    "chapterTypeId",
    "markdownTypeId",
    "sceneTypeId",
}
MUTATED_SNAPSHOT = {
    "title": "Task 11 mutated scene",
    "content": {"content": "Task 11 synthetic restore mutation."},
    "ai_context_template": "Task 11 mutated generation template",
    "ai_context_template_review": "Task 11 mutated review template",
}


class DrillError(RuntimeError):
    pass


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(
        self,
        req: Any,
        fp: Any,
        code: int,
        msg: str,
        headers: Any,
        newurl: str,
    ) -> None:
        return None


def fail(message: str) -> NoReturn:
    raise DrillError(message)


def require_object(value: Any, context: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        fail(f"{context} must be a JSON object")
    return value


def load_ids(path: Path) -> dict[str, int]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        fail(f"Cannot read fixture IDs: {exc}")
    ids = require_object(payload, "fixture IDs")
    if set(ids) != EXPECTED_ID_KEYS:
        fail("fixture IDs do not match the canonical seeder contract")
    if any(type(ids[key]) is not int or ids[key] <= 0 for key in EXPECTED_ID_KEYS):
        fail("fixture IDs must be positive integers")
    return {key: ids[key] for key in EXPECTED_ID_KEYS}


def request(base_url: str, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    body = None if payload is None else json.dumps(payload, separators=(",", ":")).encode("utf-8")
    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    request_object = urllib.request.Request(
        f"{base_url}{path}", data=body, headers=headers, method=method
    )
    try:
        with urllib.request.build_opener(NoRedirectHandler()).open(request_object, timeout=15) as response:
            raw = response.read()
    except urllib.error.HTTPError as exc:
        fail(f"{method} {path} failed with HTTP {exc.code}")
    except urllib.error.URLError as exc:
        fail(f"{method} {path} failed: {exc.reason}")
    try:
        return require_object(json.loads(raw.decode("utf-8")), f"{method} {path} response")
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        fail(f"{method} {path} returned invalid JSON: {exc}")


def writer_snapshot(card: dict[str, Any], ids: dict[str, int]) -> dict[str, Any]:
    if card.get("id") != ids["chapterCardId"]:
        fail("card response does not identify the canonical synthetic chapter card")
    if card.get("project_id") != ids["projectId"]:
        fail("card response does not belong to the canonical synthetic project")
    snapshot = {field: card.get(field) for field in WRITER_FIELDS}
    if not isinstance(snapshot["title"], str):
        fail("writer title must be a string")
    if not isinstance(snapshot["content"], dict):
        fail("writer content must be an object")
    if not isinstance(snapshot["ai_context_template"], str):
        fail("writer generation template must be a string")
    if not isinstance(snapshot["ai_context_template_review"], str):
        fail("writer review template must be a string")
    return snapshot


def read_snapshot(path: Path) -> dict[str, Any]:
    try:
        snapshot = require_object(json.loads(path.read_text(encoding="utf-8")), "snapshot file")
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        fail(f"Cannot read snapshot: {exc}")
    if set(snapshot) != set(WRITER_FIELDS):
        fail("snapshot fields do not match the writer restore contract")
    return snapshot


def write_snapshot(path: Path, snapshot: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            json.dump(snapshot, output, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            output.write("\n")
        os.replace(temporary_name, path)
    finally:
        try:
            Path(temporary_name).unlink()
        except FileNotFoundError:
            pass


def capture(base_url: str, ids: dict[str, int], output: Path) -> None:
    card = request(base_url, "GET", f"/api/cards/{ids['chapterCardId']}")
    write_snapshot(output, writer_snapshot(card, ids))


def mutate(base_url: str, ids: dict[str, int], output: Path) -> None:
    response = request(
        base_url,
        "PUT",
        f"/api/cards/{ids['chapterCardId']}",
        MUTATED_SNAPSHOT,
    )
    actual = writer_snapshot(response, ids)
    if actual != MUTATED_SNAPSHOT:
        fail("writer mutation did not persist all four required fields")
    write_snapshot(output, actual)


def assert_snapshot(base_url: str, ids: dict[str, int], expected_path: Path) -> None:
    expected = read_snapshot(expected_path)
    actual = writer_snapshot(
        request(base_url, "GET", f"/api/cards/{ids['chapterCardId']}"), ids
    )
    if actual != expected:
        fail("fresh writer GET does not exactly match the expected four-field snapshot")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Task 11 fixture-only writer restore helper")
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--ids-file", required=True, type=Path)
    subcommands = parser.add_subparsers(dest="command", required=True)
    for name in ("capture", "mutate"):
        command = subcommands.add_parser(name)
        command.add_argument("output", type=Path)
    expected = subcommands.add_parser("assert-snapshot")
    expected.add_argument("expected", type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    parsed = urllib.parse.urlsplit(args.base_url)
    if args.base_url.rstrip("/") != EXPECTED_BASE_URL or parsed.query or parsed.fragment:
        fail(f"Task 11 drill only permits {EXPECTED_BASE_URL}")
    ids = load_ids(args.ids_file)
    base_url = EXPECTED_BASE_URL
    if args.command == "capture":
        capture(base_url, ids, args.output)
    elif args.command == "mutate":
        mutate(base_url, ids, args.output)
    else:
        assert_snapshot(base_url, ids, args.expected)


if __name__ == "__main__":
    try:
        main()
    except DrillError as exc:
        raise SystemExit(f"TASK11_DRILL_FAILED: {exc}")

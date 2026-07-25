from __future__ import annotations

import hashlib
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TextSelectionSnapshot(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_index: int = Field(alias="from")
    to_index: int = Field(alias="to")
    text: str
    document_hash: str = Field(alias="documentHash")


class PatchValidationResult(BaseModel):
    status: Literal["ok", "conflict", "already_applied"]
    reason: str | None = None


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _utf16_length(value: str) -> int:
    return len(value.encode("utf-16-le")) // 2


def _slice_utf16(value: str, from_index: int, to_index: int) -> str:
    length = _utf16_length(value)
    if (
        not isinstance(from_index, int)
        or isinstance(from_index, bool)
        or not isinstance(to_index, int)
        or isinstance(to_index, bool)
        or from_index < 0
        or to_index <= from_index
        or to_index > length
    ):
        raise ValueError("Invalid selection range")

    encoded = value.encode("utf-16-le")
    selected = encoded[from_index * 2 : to_index * 2]
    try:
        return selected.decode("utf-16-le")
    except UnicodeDecodeError as exc:
        raise ValueError("Selection range splits a UTF-16 surrogate pair") from exc


def capture_snapshot(document: str, from_index: int, to_index: int) -> TextSelectionSnapshot:
    selected = _slice_utf16(document, from_index, to_index)
    return TextSelectionSnapshot(
        from_index=from_index,
        to_index=to_index,
        text=selected,
        document_hash=_sha256(document),
    )


def validate_patch(
    snapshot: TextSelectionSnapshot,
    current_document: str,
    replacement: str,
    already_applied: bool,
) -> PatchValidationResult:
    if already_applied:
        return PatchValidationResult(status="already_applied")

    if not replacement.strip():
        return PatchValidationResult(status="conflict", reason="Replacement is empty")

    try:
        current_selection = _slice_utf16(
            current_document,
            snapshot.from_index,
            snapshot.to_index,
        )
    except ValueError:
        return PatchValidationResult(
            status="conflict",
            reason="Selection snapshot range is invalid",
        )

    if _sha256(current_document) != snapshot.document_hash:
        return PatchValidationResult(
            status="conflict",
            reason="Document changed after pipeline launch",
        )

    if current_selection != snapshot.text:
        return PatchValidationResult(
            status="conflict",
            reason="Selected text no longer matches",
        )

    return PatchValidationResult(status="ok")

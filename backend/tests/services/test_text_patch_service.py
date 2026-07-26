import pytest

from app.services.text_patch_service import capture_snapshot, validate_patch


def test_backend_patch_contract_accepts_unchanged_polish_selection() -> None:
    document = "Przed. Zażółć gęślą jaźń. Po."
    start = document.index("Zażółć")
    end = start + len("Zażółć gęślą jaźń")
    snapshot = capture_snapshot(document, start, end)

    result = validate_patch(snapshot, document, "Nowy tekst", already_applied=False)

    assert result.status == "ok"
    assert result.reason is None


def test_backend_patch_contract_blocks_changed_document() -> None:
    snapshot = capture_snapshot("Ala ma kota", 0, 3)

    result = validate_patch(snapshot, "Ala ma dwa koty", "Ola", already_applied=False)

    assert result.status == "conflict"
    assert result.reason == "Document changed after pipeline launch"


def test_backend_patch_contract_blocks_second_application() -> None:
    snapshot = capture_snapshot("Ala ma kota", 0, 3)

    result = validate_patch(snapshot, "Ala ma kota", "Ola", already_applied=True)

    assert result.status == "already_applied"


def test_backend_uses_javascript_utf16_selection_offsets() -> None:
    document = "A🙂B"

    snapshot = capture_snapshot(document, 1, 3)
    result = validate_patch(snapshot, document, "🌙", already_applied=False)

    assert snapshot.text == "🙂"
    assert result.status == "ok"


def test_backend_rejects_range_that_splits_surrogate_pair() -> None:
    with pytest.raises(ValueError, match="surrogate pair"):
        capture_snapshot("A🙂B", 1, 2)


def test_backend_rejects_invalid_capture_range() -> None:
    with pytest.raises(ValueError, match="Invalid selection range"):
        capture_snapshot("tekst", 4, 2)


def test_backend_blocks_empty_replacement() -> None:
    document = "Ala ma kota"
    snapshot = capture_snapshot(document, 0, 3)

    result = validate_patch(snapshot, document, "   ", already_applied=False)

    assert result.status == "conflict"
    assert result.reason == "Replacement is empty"


def test_backend_blocks_forged_original_text() -> None:
    document = "Ala ma kota"
    snapshot = capture_snapshot(document, 0, 3).model_copy(update={"text": "Ola"})

    result = validate_patch(snapshot, document, "Ela", already_applied=False)

    assert result.status == "conflict"
    assert result.reason == "Selected text no longer matches"


def test_snapshot_serializes_frontend_field_names() -> None:
    snapshot = capture_snapshot("Ala ma kota", 0, 3)

    payload = snapshot.model_dump(by_alias=True)

    assert payload["from"] == 0
    assert payload["to"] == 3
    assert payload["text"] == "Ala"
    assert len(payload["documentHash"]) == 64

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, NoReturn


FIXTURE_NAME = "WRITER-READY Fixture"
FIXTURE_DESCRIPTION = "Synthetic writer acceptance data"
REQUEST_TIMEOUT_SECONDS = 15

ID_KEYS = (
    "projectId",
    "chapterCardId",
    "markdownCardId",
    "referenceCardId",
    "chapterTypeId",
    "markdownTypeId",
    "sceneTypeId",
)

TYPE_SPECS = {
    "章节正文": {
        "model_name": "Chapter",
        "editor_component": "CodeMirrorEditor",
    },
    "通用文本": {
        "model_name": "Text",
        "editor_component": "MarkdownTextEditor",
    },
    "场景卡": {
        "model_name": "SceneCard",
        "editor_component": "GenericCardEditor",
    },
}


class SeederError(RuntimeError):
    pass


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(
        self,
        req: urllib.request.Request,
        fp: Any,
        code: int,
        msg: str,
        headers: Any,
        newurl: str,
    ) -> None:
        return None


def fail(message: str) -> NoReturn:
    raise SeederError(message)


def expect_dict(value: Any, context: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        fail(f"{context} must be a JSON object")
    return value


def expect_list(value: Any, context: str) -> list[Any]:
    if not isinstance(value, list):
        fail(f"{context} must be a JSON list")
    return value


def expect_positive_id(value: Any, context: str) -> int:
    if type(value) is not int or value <= 0:
        fail(f"{context} must be a positive integer")
    return value


class FixtureApi:
    def __init__(self, base_url: str) -> None:
        parsed = urllib.parse.urlsplit(base_url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            fail("--base-url must be an absolute http:// or https:// URL")
        if parsed.query or parsed.fragment:
            fail("--base-url must not contain a query or fragment")
        self.base_url = base_url.rstrip("/")
        self.opener = urllib.request.build_opener(NoRedirectHandler())

    def request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
    ) -> Any:
        if not path.startswith("/"):
            fail(f"Internal error: API path must start with '/': {path}")
        body = None if payload is None else json.dumps(payload).encode("utf-8")
        headers = {"Accept": "application/json"}
        if body is not None:
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=body,
            headers=headers,
            method=method,
        )
        try:
            with self.opener.open(
                request,
                timeout=REQUEST_TIMEOUT_SECONDS,
            ) as response:
                raw = response.read()
        except urllib.error.HTTPError as exc:
            location = exc.headers.get("Location")
            if 300 <= exc.code < 400:
                suffix = f" to {location}" if location else ""
                fail(
                    f"{method} {path} returned unexpected HTTP redirect "
                    f"{exc.code}{suffix}"
                )
            fail(f"{method} {path} failed with HTTP {exc.code} ({exc.reason})")
        except urllib.error.URLError as exc:
            fail(f"{method} {path} failed: {exc.reason}")
        except TimeoutError:
            fail(
                f"{method} {path} timed out after "
                f"{REQUEST_TIMEOUT_SECONDS} seconds"
            )

        if not raw:
            return None
        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            fail(f"{method} {path} returned invalid JSON: {exc}")

    @staticmethod
    def envelope_data(response: Any, context: str) -> Any:
        envelope = expect_dict(response, context)
        if "data" not in envelope:
            fail(f"{context} is missing ApiResponse data")
        return envelope["data"]

    def get_projects(self) -> list[dict[str, Any]]:
        data = self.envelope_data(
            self.request("GET", "/api/projects/"),
            "GET /api/projects/ response",
        )
        return [
            expect_dict(project, "project list item")
            for project in expect_list(data, "GET /api/projects/ data")
        ]

    def get_project(self, project_id: int) -> dict[str, Any]:
        data = self.envelope_data(
            self.request("GET", f"/api/projects/{project_id}"),
            "project detail response",
        )
        return expect_dict(data, "project detail data")

    def create_project(self) -> dict[str, Any]:
        data = self.envelope_data(
            self.request(
                "POST",
                "/api/projects/",
                {
                    "name": FIXTURE_NAME,
                    "description": FIXTURE_DESCRIPTION,
                    "template": None,
                },
            ),
            "project create response",
        )
        return expect_dict(data, "project create data")

    def delete_project(self, project_id: int) -> None:
        data = self.envelope_data(
            self.request("DELETE", f"/api/projects/{project_id}"),
            "project delete response",
        )
        if data is not None:
            fail("project delete ApiResponse data must be null")

    def get_card_types(self) -> list[dict[str, Any]]:
        response = expect_list(
            self.request("GET", "/api/card-types"),
            "GET /api/card-types response",
        )
        return [
            expect_dict(card_type, "CardType list item")
            for card_type in response
        ]

    def create_card_type(
        self,
        name: str,
        spec: dict[str, str],
    ) -> dict[str, Any]:
        response = self.request(
            "POST",
            "/api/card-types",
            {
                "name": name,
                "model_name": spec["model_name"],
                "editor_component": spec["editor_component"],
            },
        )
        return expect_dict(response, "CardType create response")

    def get_cards(self, project_id: int) -> list[dict[str, Any]]:
        response = expect_list(
            self.request("GET", f"/api/projects/{project_id}/cards"),
            "project cards response",
        )
        return [expect_dict(card, "card list item") for card in response]

    def get_card(self, card_id: int) -> dict[str, Any]:
        return expect_dict(
            self.request("GET", f"/api/cards/{card_id}"),
            "card detail response",
        )

    def create_card(
        self,
        project_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        return expect_dict(
            self.request(
                "POST",
                f"/api/projects/{project_id}/cards",
                payload,
            ),
            "card create response",
        )

    def update_card(
        self,
        card_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        return expect_dict(
            self.request("PUT", f"/api/cards/{card_id}", payload),
            "card update response",
        )


def load_ids(ids_path: Path) -> dict[str, int]:
    if not ids_path.is_file():
        fail(f"IDs file not found: {ids_path}")
    try:
        loaded = json.loads(ids_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        fail(f"Cannot read IDs file {ids_path}: {exc}")

    ids_object = expect_dict(loaded, "IDs file")
    actual_keys = set(ids_object)
    expected_keys = set(ID_KEYS)
    if actual_keys != expected_keys:
        missing = sorted(expected_keys - actual_keys)
        extra = sorted(actual_keys - expected_keys)
        fail(f"IDs file keys mismatch: missing={missing}, extra={extra}")

    ids = {
        key: expect_positive_id(ids_object[key], f"IDs file value {key}")
        for key in ID_KEYS
    }
    card_ids = [
        ids["chapterCardId"],
        ids["markdownCardId"],
        ids["referenceCardId"],
    ]
    if len(set(card_ids)) != 3:
        fail("Fixture card IDs must be distinct")
    return ids


def resolve_card_types(
    card_types: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    resolved: dict[str, dict[str, Any]] = {}
    for name, spec in TYPE_SPECS.items():
        same_name = [
            card_type
            for card_type in card_types
            if card_type.get("name") == name
        ]
        if len(same_name) > 1:
            fail(f"Duplicate CardType name {name}: {len(same_name)} matches")
        if not same_name:
            continue

        card_type = same_name[0]
        actual_editor = card_type.get("editor_component")
        expected_editor = spec["editor_component"]
        if actual_editor != expected_editor:
            fail(
                f"CardType {name} has editor_component {actual_editor!r}; "
                f"expected {expected_editor!r}"
            )
        expect_positive_id(card_type.get("id"), f"CardType {name} id")
        resolved[name] = card_type
    return resolved


def expected_cards(ids: dict[str, int]) -> dict[int, dict[str, Any]]:
    return {
        ids["chapterCardId"]: {
            "id": ids["chapterCardId"],
            "project_id": ids["projectId"],
            "title": "Scena główna",
            "content": {"content": "Syntetyczny akapit."},
            "card_type_id": ids["chapterTypeId"],
            "parent_id": None,
            "display_order": 10,
            "ai_context_template": "Szablon generowania",
            "ai_context_template_review": "Szablon recenzji",
            "needs_confirmation": False,
        },
        ids["markdownCardId"]: {
            "id": ids["markdownCardId"],
            "project_id": ids["projectId"],
            "title": "Scena poboczna",
            "content": {"content": "Drugi syntetyczny akapit."},
            "card_type_id": ids["markdownTypeId"],
            "parent_id": ids["chapterCardId"],
            "display_order": 20,
            "ai_context_template": "Szablon generowania",
            "ai_context_template_review": "Szablon recenzji",
            "needs_confirmation": False,
        },
        ids["referenceCardId"]: {
            "id": ids["referenceCardId"],
            "project_id": ids["projectId"],
            "title": "Karta referencyjna",
            "content": {"note": "Tylko referencja."},
            "card_type_id": ids["sceneTypeId"],
            "parent_id": ids["chapterCardId"],
            "display_order": 30,
            "ai_context_template": None,
            "ai_context_template_review": None,
            "needs_confirmation": False,
        },
    }


def verify_card(
    card: dict[str, Any],
    expected: dict[str, Any],
    card_id: int,
    source: str,
) -> None:
    for field, expected_value in expected.items():
        if field not in card:
            fail(f"{source} card {card_id} missing field {field}")
        actual_value = card.get(field)
        if field == "needs_confirmation":
            if actual_value is not False:
                fail(
                    f"{source} card {card_id} field needs_confirmation "
                    "must be exactly false"
                )
        elif actual_value != expected_value:
            fail(
                f"{source} card {card_id} field {field} mismatch: "
                f"actual={actual_value!r}, expected={expected_value!r}"
            )


def verify_fixture(api: FixtureApi, ids: dict[str, int]) -> None:
    project = api.get_project(ids["projectId"])
    if project.get("id") != ids["projectId"]:
        fail("Project ID mismatch")
    if project.get("name") != FIXTURE_NAME:
        fail("Project name mismatch")

    resolved_types = resolve_card_types(api.get_card_types())
    if set(resolved_types) != set(TYPE_SPECS):
        missing = sorted(set(TYPE_SPECS) - set(resolved_types))
        fail(f"Fixture CardTypes missing: {missing}")

    expected_type_ids = {
        "章节正文": ids["chapterTypeId"],
        "通用文本": ids["markdownTypeId"],
        "场景卡": ids["sceneTypeId"],
    }
    for name, expected_id in expected_type_ids.items():
        card_type = resolved_types[name]
        if card_type.get("name") != name:
            fail(f"CardType {name} name mismatch")
        if card_type.get("id") != expected_id:
            fail(f"CardType {name} ID mismatch")
        expected_editor = TYPE_SPECS[name]["editor_component"]
        if card_type.get("editor_component") != expected_editor:
            fail(f"CardType {name} editor_component mismatch")

    cards = api.get_cards(ids["projectId"])
    if len(cards) != 3:
        fail(f"Expected exactly 3 cards, got {len(cards)}")

    cards_by_id: dict[int, dict[str, Any]] = {}
    for card in cards:
        card_id = expect_positive_id(card.get("id"), "card list item id")
        if card_id in cards_by_id:
            fail(f"Duplicate card ID in project cards response: {card_id}")
        cards_by_id[card_id] = card

    expected_by_id = expected_cards(ids)
    if set(cards_by_id) != set(expected_by_id):
        fail(
            "Card ID mismatch: "
            f"actual={sorted(cards_by_id)}, expected={sorted(expected_by_id)}"
        )

    for card_id, expected in expected_by_id.items():
        verify_card(cards_by_id[card_id], expected, card_id, "collection")
        verify_card(api.get_card(card_id), expected, card_id, "detail")


def seed_fixture(
    api: FixtureApi,
    *,
    reset: bool,
) -> dict[str, int]:
    fixture_projects = [
        project
        for project in api.get_projects()
        if project.get("name") == FIXTURE_NAME
    ]
    fixture_projects.sort(
        key=lambda project: expect_positive_id(
            project.get("id"),
            "fixture project id",
        )
    )

    if reset:
        for project in fixture_projects:
            api.delete_project(project["id"])
    elif fixture_projects:
        ids = [project["id"] for project in fixture_projects]
        fail(
            f"{FIXTURE_NAME} already exists with IDs {ids}; "
            "rerun with --reset"
        )

    project = api.create_project()
    project_id = expect_positive_id(project.get("id"), "created project id")
    if project.get("name") != FIXTURE_NAME:
        fail("Created project name mismatch")

    resolved_types = resolve_card_types(api.get_card_types())
    for name, spec in TYPE_SPECS.items():
        if name not in resolved_types:
            created = api.create_card_type(name, spec)
            if created.get("name") != name:
                fail(f"Created CardType {name} name mismatch")
            if created.get("editor_component") != spec["editor_component"]:
                fail(f"Created CardType {name} editor_component mismatch")

    resolved_types = resolve_card_types(api.get_card_types())
    if set(resolved_types) != set(TYPE_SPECS):
        missing = sorted(set(TYPE_SPECS) - set(resolved_types))
        fail(f"CardTypes missing after create: {missing}")

    chapter_type_id = expect_positive_id(
        resolved_types["章节正文"].get("id"),
        "chapter CardType id",
    )
    markdown_type_id = expect_positive_id(
        resolved_types["通用文本"].get("id"),
        "markdown CardType id",
    )
    scene_type_id = expect_positive_id(
        resolved_types["场景卡"].get("id"),
        "reference CardType id",
    )

    chapter = api.create_card(
        project_id,
        {
            "title": "Scena główna",
            "content": {"content": "Syntetyczny akapit."},
            "card_type_id": chapter_type_id,
            "parent_id": None,
            "ai_context_template": "Szablon generowania",
            "ai_context_template_review": "Szablon recenzji",
        },
    )
    chapter_id = expect_positive_id(chapter.get("id"), "chapter card id")

    markdown = api.create_card(
        project_id,
        {
            "title": "Scena poboczna",
            "content": {"content": "Drugi syntetyczny akapit."},
            "card_type_id": markdown_type_id,
            "parent_id": chapter_id,
            "ai_context_template": "Szablon generowania",
            "ai_context_template_review": "Szablon recenzji",
        },
    )
    markdown_id = expect_positive_id(markdown.get("id"), "markdown card id")

    reference = api.create_card(
        project_id,
        {
            "title": "Karta referencyjna",
            "content": {"note": "Tylko referencja."},
            "card_type_id": scene_type_id,
            "parent_id": chapter_id,
        },
    )
    reference_id = expect_positive_id(reference.get("id"), "reference card id")

    for card_id, display_order in (
        (chapter_id, 10),
        (markdown_id, 20),
        (reference_id, 30),
    ):
        updated = api.update_card(
            card_id,
            {
                "display_order": display_order,
                "needs_confirmation": False,
            },
        )
        if updated.get("id") != card_id:
            fail(f"Updated card ID mismatch for {card_id}")
        if updated.get("display_order") != display_order:
            fail(f"Updated card display_order mismatch for {card_id}")
        if updated.get("needs_confirmation") is not False:
            fail(f"Updated card needs_confirmation mismatch for {card_id}")

    ids = {
        "projectId": project_id,
        "chapterCardId": chapter_id,
        "markdownCardId": markdown_id,
        "referenceCardId": reference_id,
        "chapterTypeId": chapter_type_id,
        "markdownTypeId": markdown_type_id,
        "sceneTypeId": scene_type_id,
    }
    verify_fixture(api, ids)
    return ids


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--base-url",
        required=True,
        help="Base URL for the API, e.g. http://127.0.0.1:18080",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete only exact WRITER-READY Fixture projects before seeding",
    )
    parser.add_argument("--ids-file", help="Path to write or load fixture IDs")
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify the fixture using GET requests only",
    )
    args = parser.parse_args()
    if args.verify and args.reset:
        parser.error("--verify cannot be combined with --reset")
    if args.verify and not args.ids_file:
        parser.error("--verify requires --ids-file")
    return args


def run() -> None:
    args = parse_args()
    api = FixtureApi(args.base_url)

    if args.verify:
        ids = load_ids(Path(args.ids_file))
        verify_fixture(api, ids)
        print("Verification PASSED")
        return

    ids = seed_fixture(api, reset=args.reset)
    if args.ids_file:
        ids_path = Path(args.ids_file)
        try:
            ids_path.write_text(
                json.dumps(ids, sort_keys=True) + "\n",
                encoding="utf-8",
            )
        except OSError as exc:
            fail(f"Cannot write IDs file {ids_path}: {exc}")
    print(json.dumps(ids, sort_keys=True))


def main() -> int:
    try:
        run()
    except SeederError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

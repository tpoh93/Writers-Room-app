import argparse
import json
import urllib.request
import urllib.parse
from typing import Any, Dict

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', required=True, help='Base URL for the API, e.g. http://127.0.0.1:18080')
    parser.add_argument('--reset', action='store_true', help='Reset the fixture project first')
    parser.add_argument('--ids-file', help='Path to write/load IDs JSON')
    parser.add_argument('--verify', action='store_true', help='Verify the seeded fixture')
    args = parser.parse_args()

    base_url = args.base_url.rstrip('/')
    url = f"{base_url}/"

    def request(method: str, path: str, data: dict | None = None) -> Dict[str, Any]:
        full_url = f"{base_url}{path}"
        headers = {'Content-Type': 'application/json'}
        body = None
        if data:
            body = json.dumps(data).encode('utf-8')
        req = urllib.request.Request(full_url, data=body, headers=headers, method=method)
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))

    def get_projects() -> list:
        return request('GET', '/api/projects/')['data']

    def post_project(data: dict) -> Dict[str, Any]:
        return request('POST', '/api/projects/', data=data)

    def get_card_types() -> list:
        return request('GET', '/api/card-types/')['data']

    def post_card_type(data: dict) -> Dict[str, Any]:
        return request('POST', '/api/card-types/', data=data)

    def get_cards(project_id: int) -> list:
        return request('GET', f'/api/projects/{project_id}/cards')['data']

    def put_card(card_id: int, data: dict) -> Dict[str, Any]:
        return request('PUT', f'/api/cards/{card_id}', data=data)

    if args.reset:
        projects = get_projects()
        wr_project = next((p for p in projects if p.get('name') == 'WRITER-READY Fixture'), None)
        if wr_project:
            delete_resp = request('DELETE', f"/api/projects/{wr_project['id']}/", None)
            if delete_resp.get('data') is None:
                raise ValueError("Reset failed")
        else:
            print("No existing WRITER-READY Fixture to reset")

    # Create project
    project_resp = post_project({
        'name': 'WRITER-READY Fixture',
        'description': 'Synthetic writer acceptance data',
        'template': None
    })
    project_id = project_resp['data']['id']

    # Create card types
    card_types = get_card_types()
    type_map = {t['name']: t['id'] for t in card_types}

    # Create missing types
    for name, editor, payload in [
        ('章节正文', 'CodeMirrorEditor', {'name': '章节正文', 'model_name': 'Chapter', 'editor_component': 'CodeMirrorEditor'}),
        ('通用文本', 'MarkdownTextEditor', {'name': '通用文本', 'model_name': 'Text', 'editor_component': 'MarkdownTextEditor'}),
        ('场景卡', 'GenericCardEditor', {'name': '场景卡', 'model_name': 'SceneCard', 'editor_component': 'GenericCardEditor'}),
    ]:
        if name not in type_map:
            post_card_type(payload)
            # refresh types
            card_types = get_card_types()
            type_map = {t['name']: t['id'] for t in card_types}

    # Get updated types
    card_types = get_card_types()
    type_map = {t['name']: t['id'] for t in card_types}

    chapter_type_id = type_map['章节正文']
    markdown_type_id = type_map['通用文本']
    scene_type_id = type_map['场景卡']

    # Create cards
    project_resp = request('GET', f'/api/projects/{project_id}/')
    project = project_resp['data']
    cards = []
    for i, (name, title, content, type_id, parent_id, display_order) in enumerate([
        ('章节正文', 'Scena główna', {'content': 'Syntetyczny akapit.'}, chapter_type_id, None, 10),
        ('通用文本', 'Scena poboczna', {'content': 'Drugi syntetyczny akapit.'}, markdown_type_id, project.cards[-1]['id'] if project.cards else None, 20),  # parent
        ('场景卡', 'Karta referencyjna', {'note': 'Tylko referencja.'}, scene_type_id, project.cards[-1]['id'] if project.cards else None, 30),
    ]):
        if name == '场景卡':
            parent = project.cards[0]['id'] if project.cards else None
        else:
            parent = None
        card_resp = request('POST', f'/api/projects/{project_id}/cards/', {
            'title': title,
            'content': content,
            'card_type_id': type_id,
            'parent_id': parent,
            'display_order': display_order,
        })
        card_id = card_resp['data']['id']
        cards.append({'id': card_id, 'name': name, 'type_id': type_id})

    chapter_id = [c['id'] for c in cards if c['name'] == '章节正文'][0]
    markdown_id = [c['id'] for c in cards if c['name'] == '通用文本'][0]
    scene_id = [c['id'] for c in cards if c['name'] == '场景卡'][0]

    # Update orders and needs_confirmation
    for card_id, order in [(chapter_id, 10), (markdown_id, 20), (scene_id, 30)]:
        put_card(card_id, {'display_order': order, 'needs_confirmation': False})

    # Update parents for deterministic tree
    put_card(chapter_id, {'parent_id': None, 'needs_confirmation': False})
    put_card(markdown_id, {'parent_id': chapter_id, 'needs_confirmation': False})
    put_card(scene_id, {'parent_id': chapter_id, 'needs_confirmation': False})

    # Write IDs
    ids = {
        'projectId': project_id,
        'chapterCardId': chapter_id,
        'markdownCardId': markdown_id,
        'referenceCardId': scene_id,
        'chapterTypeId': chapter_type_id,
        'markdownTypeId': markdown_type_id,
        'sceneTypeId': scene_type_id,
    }
    if args.ids_file:
        with open(args.ids_file, 'w') as f:
            json.dump(ids, f)
    print(json.dumps(ids))

    if args.verify:
        # Verify
        verify_project = request('GET', f'/api/projects/{project_id}/')['data']
        assert verify_project['name'] == 'WRITER-READY Fixture'
        verify_cards = request('GET', f'/api/projects/{project_id}/cards/')['data']
        assert len(verify_cards) == 3
        # Verify each
        for card in verify_cards:
            if card['name'] == 'Scena główna':
                assert card['content'] == {'content': 'Syntetyczny akapit.'}
                assert card['ai_context_template'] == 'Szablon generowania'
                assert card['ai_context_template_review'] == 'Szablon recenzji'
                assert card['parent_id'] is None
                assert card['display_order'] == 10
            elif card['name'] == 'Scena poboczna':
                assert card['content'] == {'content': 'Drugi syntetyczny akapit.'}
                assert card['ai_context_template'] == 'Szablon generowania'
                assert card['ai_context_template_review'] == 'Szablon recenzji'
                assert card['parent_id'] == chapter_id
                assert card['display_order'] == 20
            elif card['name'] == 'Karta referencyjna':
                assert card['content'] == {'note': 'Tylko referencja.'}
                assert card['ai_context_template'] == 'Szablon generowania'
                assert card['ai_context_template_review'] == 'Szablon recenzji'
                assert card['parent_id'] == chapter_id
                assert card['display_order'] == 30
        print('Verification PASSED')

if __name__ == '__main__':
    main()

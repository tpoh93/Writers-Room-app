# OpenRouter Three-Model Smoke

## Status

`PENDING LOCAL CREDENTIALS`

This acceptance test must run on the private local Writers Room runtime. Do not put a real OpenRouter key in GitHub Actions, repository files, screenshots, issue comments, shell transcripts, or committed evidence.

## Purpose

Prove that the deterministic `Thinking p*rn` pipeline also works with three real OpenRouter-backed LLM configurations while preserving selected-text safety and persisted checkpoint evidence.

## Synthetic fixture

Use only this invented text. Do not use canonical GUILT-3 prose.

```text
Przed sceną.

**Marta weszła do pustego warsztatu i zatrzymała się przy stole. Usłyszała metaliczny stuk za plecami, ale nie odwróciła się od razu.**

Po scenie.
```

Suggested brief:

```text
Wzmocnij napięcie i fizyczną ciągłość sceny. Zachowaj język polski, fakty, imię, punkt widzenia i znaczenie. Zwróć wyłącznie tekst zastępujący zaznaczenie.
```

## Private environment preparation

Start the canonical local stack:

```bash
cp .env.example .env
docker compose up --build -d
```

Enter the key without placing it in shell history:

```bash
read -rsp 'OpenRouter API key: ' OPENROUTER_API_KEY
printf '\n'
export OPENROUTER_API_KEY
```

Set the exact currently available OpenRouter model IDs selected for the three roles:

```bash
export KIMI_MODEL_ID='<exact-openrouter-model-id>'
export GROK_MODEL_ID='<exact-openrouter-model-id>'
export AION_MODEL_ID='<exact-openrouter-model-id>'
```

Run the preflight:

```bash
./scripts/smoke-openrouter.sh
```

The script checks:

- frontend and backend health through the same origin;
- key validity against the OpenRouter models endpoint;
- availability of all three exact model IDs;
- distinct model IDs;
- absence of the runtime key and common OpenRouter key patterns from tracked content.

It never prints the API key.

## Configure three local LLM records

In the local Writers Room LLM configuration UI, create or update three records:

| Display name | Provider | API base | Model ID |
|---|---|---|---|
| `Kimi - scene architect` | `openai_compatible` | `https://openrouter.ai/api/v1` | value of `KIMI_MODEL_ID` |
| `Grok - continuity` | `openai_compatible` | `https://openrouter.ai/api/v1` | value of `GROK_MODEL_ID` |
| `Aion - final polish` | `openai_compatible` | `https://openrouter.ai/api/v1` | value of `AION_MODEL_ID` |

Use the runtime key in the local UI only. The SQLite database and backups are excluded from Git.

Run each configuration's connection/capability test before the three-stage fixture.

## Fixture A: accepted result

1. Create a disposable test card containing the synthetic fixture.
2. Select only the bold content, without the Markdown `**` markers.
3. Open the context menu and choose `Thinking p*rn`.
4. Choose the three configured records in Kimi, Grok, Aion order.
5. Enter the suggested brief and run the pipeline.
6. Verify that all three stages finish and show persisted outputs.
7. Verify that Aion's final text is visible before document mutation.
8. Choose `Zastosuj`.
9. Verify that only the selected text changed and both surrounding paragraphs and Markdown markers are identical.
10. Use undo and verify that the exact fixture returns.

## Fixture B: rejected result

Repeat the pipeline on a fresh copy of the fixture and choose `Odrzuć`.

Verify that the entire document remains byte-for-byte identical.

## Fixture C: provider failure and resume

1. Temporarily change the Grok record to an invalid model ID.
2. Run the same synthetic fixture.
3. Verify:
   - Kimi completes and its output remains in node-state history;
   - Grok fails;
   - Aion does not run;
   - source text is unchanged.
4. Restore the valid Grok model ID.
5. Choose `Ponów nieudany krok`.
6. Verify that Kimi is not called again and Grok then Aion complete.

## Redacted evidence record

Record no prose beyond the public synthetic fixture. Do not record the key, full provider payloads, tailnet details, or private database content.

| Field | Value |
|---|---|
| Date/time UTC | `PENDING` |
| Workflow ID | `PENDING` |
| Accepted run ID | `PENDING` |
| Rejected run ID | `PENDING` |
| Provider-failure run ID | `PENDING` |
| Kimi display name | `Kimi - scene architect` |
| Kimi exact model ID | `PENDING` |
| Grok display name | `Grok - continuity` |
| Grok exact model ID | `PENDING` |
| Aion display name | `Aion - final polish` |
| Aion exact model ID | `PENDING` |
| Accepted fixture final status | `PENDING` |
| Reject changed zero characters | `PENDING` |
| Outside-selection text unchanged | `PENDING` |
| Undo restored exact source | `PENDING` |
| Kimi checkpoint survived Grok failure | `PENDING` |
| Resume skipped Kimi | `PENDING` |
| Input/output token counters inspected | `PENDING` |
| Secret scan | `PENDING` |

## Final secret scan

Run from the repository root:

```bash
git status --short
git grep -nE 'sk-or-v1-[A-Za-z0-9_-]{20,}' -- . || true
```

Expected result: no real credential and no private evidence in tracked or staged content.

## Completion rule

Task 9 becomes `LOOKS GOOD` only after all three fixtures pass and the table above contains redacted values. A deterministic fake-model pass does not replace this real-provider proof.

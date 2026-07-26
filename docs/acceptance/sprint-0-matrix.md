# Sprint 0 Acceptance Matrix

**Repository:** `tpoh93/Writers-Room-app`  
**Branch:** `spike/sprint-0-foundation`  
**Upstream baseline:** `ca7ca584580df0220a6a0d008309e5575b3dc449`  
**Status vocabulary:** `NOT RUN`, `PASS`, `FAIL`, `BLOCKED`

Evidence must not contain API keys or private writing. Store sensitive evidence outside Git under `evidence/private/`.

| ID | Acceptance criterion | Status | Command or evidence | Artifact | Reviewer |
|---|---|---:|---|---|---|
| A1 | Pinned upstream commit | PASS | `bash scripts/verify-upstream.sh` | `docs/architecture/upstream-sync.md` | Project owner |
| A2 | AGPL notices intact | PASS | `grep -i "GNU AFFERO GENERAL PUBLIC LICENSE" LICENSE` | `LICENSE` | Project owner |
| B1 | Compose builds | PASS | GitHub Actions run `30178048386`, `Canonical Compose smoke test` | `docs/acceptance/task-3-review.md` | Technical review |
| B2 | Backend healthy | PASS | Same-origin `/healthz/ready` and Docker health passed in run `30178048386` | `docs/acceptance/task-3-review.md` | Technical review |
| B3 | Frontend healthy | PASS | Same-origin health and Vue application shell passed in run `30178048386` | `docs/acceptance/task-3-review.md` | Product review |
| B4 | Data persists | PASS | Real SQLite marker survived restore and container recreation in run `30178352257` | `docs/acceptance/task-4-review.md` | Technical review |
| B5 | Secrets absent from Git | NOT RUN | Secret scan plus review of tracked environment files | Scan output | Security review |
| C1 | Trusted Tailscale device reaches app | NOT RUN | Manual approved-tailnet device test pending | `docs/operations/tailscale-local.md` | Project owner |
| C2 | No public route | NOT RUN | Static unsafe-bind tests passed in run `30178613413`; outside-tailnet and router checks pending | `docs/acceptance/task-5-review.md` | Security review |
| D1 | Three model configs execute in order | PASS | Deterministic Kimi → Grok → Aion run `30179737596` | `docs/acceptance/task-7-review.md` | AI workflow review |
| D2 | Intended handoff verified | PASS | Grok received Kimi; Aion received Kimi and Grok in run `30179737596` | `docs/acceptance/task-7-review.md` | AI workflow review |
| D3 | Final diff visible | PASS | Dialog before/after and final Aion output tests in run `30180434799` | `docs/acceptance/task-8-review.md` | Product review |
| D4 | Accept changes only selection | PASS | One CodeMirror transaction plus exact outside-range and undo tests in run `30180434799` | `docs/acceptance/task-8-review.md` | Editor safety review |
| D5 | Reject changes nothing | PASS | Dialog reject test emitted no replacement in run `30180434799` | `docs/acceptance/task-8-review.md` | Editor safety review |
| D6 | Changed document blocks apply | PASS | Live SHA-256 conflict and stale-snapshot application tests in run `30180434799` | `docs/acceptance/task-8-review.md` | Editor safety review |
| E1 | Clean Linux start | PASS | Ubuntu runner built and started the canonical Compose stack in run `30178048386` | `docs/acceptance/task-3-review.md` | Deployment review |
| E2 | Restored data usable | PASS | Backup restored the earlier database value and survived restart in run `30178352257` | `docs/acceptance/task-4-review.md` | Data review |
| E3 | No code change required | NOT RUN | Compare deployed commit before and after portability drill | Commit identifiers | Deployment review |

## Gate rules

- Gate A passes only when `A1` and `A2` are `PASS`.
- Gate B passes only when `B1` through `B5` are `PASS`.
- Gate C passes only when `C1` and `C2` are `PASS`.
- Gate D passes only when `D1` through `D6` are `PASS`.
- Gate E passes only when `E1` through `E3` are `PASS`.
- A `FAIL` or unresolved `BLOCKED` result prevents a Sprint 0 GO decision.
- Every status change must include reproducible evidence and a named reviewer role.

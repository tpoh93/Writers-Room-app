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
| B1 | Compose builds | NOT RUN | `docker compose build` | Build log | Technical review |
| B2 | Backend healthy | NOT RUN | `curl -fsS http://127.0.0.1:8080/healthz/ready` | Readiness response | Technical review |
| B3 | Frontend healthy | NOT RUN | Open canonical web address and load editor shell | Screenshot or smoke log | Product review |
| B4 | Data persists | NOT RUN | Create test project, recreate containers, reopen project | Redacted persistence record | Technical review |
| B5 | Secrets absent from Git | NOT RUN | Secret scan plus review of tracked environment files | Scan output | Security review |
| C1 | Trusted Tailscale device reaches app | NOT RUN | Access through approved tailnet device | Redacted device/access evidence | Project owner |
| C2 | No public route | NOT RUN | Negative test from non-tailnet connection; no router forwarding | Network evidence | Security review |
| D1 | Three model configs execute in order | NOT RUN | Pipeline event log shows Kimi, Grok, Aion sequence | Redacted run record | AI workflow review |
| D2 | Intended handoff verified | NOT RUN | Inspect prompts/inputs preserved for each completed step | Redacted node-state evidence | AI workflow review |
| D3 | Final diff visible | NOT RUN | UI displays before/after result before mutation | Screenshot with synthetic text | Product review |
| D4 | Accept changes only selection | NOT RUN | Automated editor test and manual synthetic-text check | Test output | Editor safety review |
| D5 | Reject changes nothing | NOT RUN | Automated editor test and manual synthetic-text check | Test output | Editor safety review |
| D6 | Changed document blocks apply | NOT RUN | Mutate document after launch; application reports conflict | Test output | Editor safety review |
| E1 | Clean Linux start | NOT RUN | Start documented Compose stack on clean Linux environment | Portability log | Deployment review |
| E2 | Restored data usable | NOT RUN | Restore backup and open project, prompts, configs, history | Restore evidence | Data review |
| E3 | No code change required | NOT RUN | Compare deployed commit before and after portability drill | Commit identifiers | Deployment review |

## Gate rules

- Gate A passes only when `A1` and `A2` are `PASS`.
- Gate B passes only when `B1` through `B5` are `PASS`.
- Gate C passes only when `C1` and `C2` are `PASS`.
- Gate D passes only when `D1` through `D6` are `PASS`.
- Gate E passes only when `E1` through `E3` are `PASS`.
- A `FAIL` or unresolved `BLOCKED` result prevents a Sprint 0 GO decision.
- Every status change must include reproducible evidence and a named reviewer role.

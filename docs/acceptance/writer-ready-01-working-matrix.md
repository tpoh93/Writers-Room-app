# WRITER-READY-01 Browser and Operational Evidence Matrix

| row | scenario | observed result | artifact reference | status |
|-----|----------|-----------------|-------------------|--------|
| WR-01 | Project → scene → writing card creation | NOT VERIFIED | /tmp/writer-ready-fixture-ids.json | NOT VERIFIED |
| WR-02 | Local draft timing | NOT VERIFIED | browser console / recovery store | NOT VERIFIED |
| WR-03 | Backend autosave cadence | NOT VERIFIED | browser console / network | NOT VERIFIED |
| WR-04 | Manual save through Zapisz | NOT VERIFIED | browser UI | NOT VERIFIED |
| WR-05 | Manual save through Cmd/Ctrl+S | NOT VERIFIED | browser UI | NOT VERIFIED |
| WR-06 | Scene/card change | NOT VERIFIED | browser navigation | NOT VERIFIED |
| WR-07 | Project change | NOT VERIFIED | browser navigation | NOT VERIFIED |
| WR-08 | Controlled close | NOT VERIFIED | browser view close | NOT VERIFIED |
| WR-09 | Force-close recovery | NOT VERIFIED | browser force-close | NOT VERIFIED |
| WR-10 | Network failure simulation | NOT VERIFIED | browser save error | NOT VERIFIED |
| WR-11 | Backend/persistence failure | NOT VERIFIED | browser save error | NOT VERIFIED |
| WR-12 | Reopen canonical content | NOT VERIFIED | browser reopen | NOT VERIFIED |
| WR-13 | Recovery case A | NOT VERIFIED | browser recovery UI | NOT VERIFIED |
| WR-14 | Recovery case B | NOT VERIFIED | browser recovery UI | NOT VERIFIED |
| WR-15 | Recovery case C, both variants | NOT VERIFIED | browser recovery UI | NOT VERIFIED |
| WR-16 | Rebase after older save response | NOT VERIFIED | browser reopen | NOT VERIFIED |
| WR-17 | Version-history policy | NOT VERIFIED | browser history | NOT VERIFIED |
| WR-18 | TXT export | NOT VERIFIED | downloaded TXT | NOT VERIFIED |
| WR-19 | Markdown export | NOT VERIFIED | downloaded Markdown | NOT VERIFIED |
| WR-20 | JSON export | NOT VERIFIED | downloaded JSON | NOT VERIFIED |
| WR-21 | Polish fixture full-artifact CJK scan | NOT VERIFIED | downloaded artifact scan | NOT VERIFIED |
| WR-22 | Export with unsaved text / failed flush | NOT VERIFIED | browser blocked export | NOT VERIFIED |
| WR-23 | Compose restart | NOT VERIFIED | docker compose restart | NOT VERIFIED |
| WR-24 | Backup → mutate → guarded restore | NOT VERIFIED | backup/restore log | NOT VERIFIED |
| WR-25 | Evidence closure | NOT VERIFIED | matrix review | NOT VERIFIED |

## Notes
- All rows start as NOT VERIFIED.
- Only observed evidence becomes PASS.
- Author-CJK preserved in fixtures.
- Evidence paths outside repo unless required.

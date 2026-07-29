# NovelForge WRITER-READY-01 Task 10 account handoff

Status:

  INCOMPLETE — SAFE ACCOUNT HANDOFF

Repository:

  tpoh93/Writers-Room-app

Local path:

  /Users/jupiter/Developer/Writers-Room-app

Branch:

  feature/writer-ready-01-acceptance

Pre-handoff parent:

  8d8f6d5548c6d690b2fc5e37cf98c72edd981a5d

Base/main:

  0de5a3af296057f18a8bff652afec45ddda47de4

Protected stash:

  stash@{0}
  8f7fc15e803b739fd2dcd3678f7130028a8f2d1a

## Scope and protected state

- Never inspect, apply, pop, drop or overwrite the protected stash.
- Task 10 executable scope is WR-01 through WR-23.
- WR-24 is deferred to Task 11.
- WR-25 is deferred to Task 12.
- Task 11 and Task 12 must not start yet.

## Latest automated verification

- focused GenericCardEditor integration: 22/22 PASS;
- writerSaveCoordinator + GenericCardEditor: 40/40 PASS;
- full frontend suite: 91/91 PASS;
- frontend typecheck: PASS;
- git diff check: PASS;
- targeted backend gate: 11/11 PASS;
- external fixture harness: 8/8 PASS;
- seeder verification previously passed;
- frontend and backend Compose services were previously healthy.

## Browser-confirmed Task 10 status

PASS:

- WR-01;
- WR-02;
- WR-03;
- WR-04;
- WR-05;
- WR-06;
- WR-10.

FAIL:

- WR-08.

NOT VERIFIED:

- WR-07;
- WR-09;
- WR-11;
- WR-12;
- WR-13;
- WR-14;
- WR-15;
- WR-16;
- WR-17;
- WR-18;
- WR-19;
- WR-20;
- WR-21;
- WR-22;
- WR-23.

Deferred:

- WR-24 to Task 11;
- WR-25 to Task 12.

## Confirmed WR-08 defect

- An approved writer contained dirty visible content.
- Clicking the visible NovelForge logo navigated to `Biblioteka projektów`.
- No technical flush PUT occurred before navigation.
- The transition also proceeded while offline.
- Navigation was therefore not blocked on failed persistence.
- Only local recovery remained.
- This is a route-leave / controlled-close guard bypass.

## Next implementation task

Fix the dirty eligible writer route-leave guard so that:

- clean sessions leave immediately without a PUT;
- dirty sessions wait for one technical flush;
- successful flush permits navigation;
- failed flush blocks navigation and keeps the editor mounted;
- repeated clicks do not create duplicate requests;
- stale responses cannot mark newer content saved;
- the real NovelForge logo/dashboard transition is covered;
- the fix is centralized where practical rather than special-cased only inside the logo.

## Post-fix sequence

1. focused RED/GREEN route-navigation tests;
2. full frontend suite;
3. typecheck;
4. git diff check;
5. rebuild frontend only;
6. browser smoke for WR-08:
   - online dirty logo transition saves before leaving;
   - offline dirty logo transition remains in the editor;
7. continue remaining NOT VERIFIED Task 10 rows;
8. do not start Task 11 or Task 12.

## Environment caveat

- Chrome DevTools can open `http://127.0.0.1:18080`.
- Some Codex shell sessions cannot access the Docker socket or host localhost.
- Do not classify shell sandbox access failure as an application failure.
- Use Chrome DevTools as browser-access authority.
- Do not repeat dependency or environment setup unless genuinely required.

## Fixture state

- At the end of B1C, canonical cards 1 and 2 were restored.
- Recovery keys were removed.
- Visible seeded values were re-confirmed:
  - `Scena główna`: `Syntetyczny akapit.`
  - `Scena poboczna`: `Drugi syntetyczny akapit.`
- Temporary project 2 was removed.

## Latest B1C evidence

- WR-01 PASS: temporary project 2; CodeMirror card 10; Markdown card 11; SceneCard 12; temporary project removed.
- WR-06 PASS: successful card-change flush PUT reqid 424; offline requests reqids 483/484 failed; navigation remained blocked; failed-save recovery retained exact content.
- WR-08 FAIL: NovelForge logo bypassed flush and blocking both online and offline.

The `/tmp` evidence paths may be ephemeral. The handoff document, acceptance
matrix and committed implementation are the portable sources of truth.

Task 10 is incomplete. This document does not claim B1 PASS or Task 10 PASS.

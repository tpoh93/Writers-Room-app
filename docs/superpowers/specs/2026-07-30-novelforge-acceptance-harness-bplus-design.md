# NovelForge Acceptance Harness B+ — design

## Status i decyzja

Ten dokument zamyka projektowanie Acceptance Harness B+. Właściciel zaakceptował podział na B+1, B+2 i B+3. Do wykonania na podstawie towarzyszącego planu przeznaczona jest tylko faza B+1; B+2 i B+3 wymagają osobnych zatwierdzonych planów.

B+ implementation base to 19af546c069f9dd4e472a58e586124eb363ab927 na branchu feature/writer-ready-01-acceptance. Aktualny lokalny stan jest zawsze rozstrzygany przez git branch --show-current, git rev-parse HEAD i git status --short. Chroniony stash jest lokalnym ograniczeniem kapsuły wykonawczej: należy go zweryfikować przed pracą, lecz jego tożsamość nie należy do committowanego stanu repozytorium.

## Problem i dowody

Task 10 korzystał z izolowanego projektu Compose writer-ready-fixture pod http://127.0.0.1:18080, ale docs/operations/local-compose.md wymaga ręcznych poleceń, w tym down -v --remove-orphans. Taka procedura łatwo traci stałe projektu, adresu i portu, a także usuwa wolumen fixture zamiast zwykłego zatrzymania. Główny stos działa domyślnie na 8080, więc przypadkowe przejście na ten port miesza dowody acceptance z normalnym runtime.

Frontend buduje się wyłącznie z kontekstu frontend/. Obecny obraz nie dostaje informacji o Git ani o dirty working tree. GET /build-meta.json musi więc powstać z danych obliczonych przez runner w root repo i przekazanych jako jawny build argument. Metadane nie mogą być obliczane przy żądaniu HTTP, ponieważ muszą identyfikować konkretny uruchomiony obraz.

Macierz pokazuje WR-11 i WR-16 jako NOT VERIFIED: DevTools umożliwił Offline, ale nie deterministyczny HTTP 500 ani kontrolowane opóźnienie writer PUT. Historyczny WR-08 FAIL został rozwiązany w 19af546c069f9dd4e472a58e586124eb363ab927 przez fix(writer): guard logo navigation with controlled flush. Browser QA potwierdził clean bez PUT, dirty success z jednym PUT przed nawigacją, offline block z recovery/Retry, retry po sieci oraz repeated clicks z jednym PUT i jedną nawigacją. B+ nie naprawia go ponownie; B+3 jedynie godzi stale matrix/handoff z tym checkpointem. Handoff rozdziela WR-24 do Task 11 oraz WR-25 do Task 12.

## Cel architektury

B+ ustanawia jedną bezpieczną ścieżkę do fixture acceptance, dowód pochodzenia uruchomionego frontendu, a następnie kontrolowane warunki potrzebne do dokończenia QA bez ponawiania potwierdzonych obserwacji. Nie jest to warstwa produktu ani nowy system testowy dla zwykłego stosu writers-room.

~~~mermaid
flowchart LR
  R["novelforge-acceptance.sh"] --> M["build metadata generator"]
  M --> C["Compose project writer-ready-fixture"]
  C --> F["frontend image"]
  F --> J["GET /build-meta.json"]
  R --> J
  R --> S["existing fixture seeder"]
  B2["B+2 fault controls"] -. fixture-only extension .-> C
  B3["B+3 matrix and QA batches"] -. records observed evidence .-> D["acceptance control document"]
~~~

## Wspólne niezmienne reguły

- Jedyny projekt acceptance to writer-ready-fixture.
- Jedyny bind to 127.0.0.1; jedyny port to 18080; jedyny base URL to http://127.0.0.1:18080.
- Runner wywołuje fixture Compose wyłącznie jako docker compose -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture i nigdy nie wydaje poleceń przeciw projektowi writers-room.
- Zwykłe down zachowuje wolumeny: nie używa -v, prune, reset, clean ani stash.
- Runner nie przechowuje sekretów, .env, absolutnych ścieżek ani danych autorskich w metadata, logach lub dokumentach acceptance.
- Shell jest autorytetem dla Compose, readiness, seeding i provenance. Chrome DevTools służy tylko do obserwacji UI oraz ruchu przeglądarki; nie zastępuje statusu kontenerów ani porównania build metadata.

## B+1 — Acceptance foundation

### Odpowiedzialność

B+1 tworzy kanoniczny control document, bezpieczny runner, metadane uruchomionego frontendu, testy bez Dockera oraz końcowy smoke Compose. Nie ingeruje w writer-save behavior, UI, macierz, fault injection, backup/restore ani browser QA.

### Runner

Planowany scripts/novelforge-acceptance.sh ma dokładnie osiem poleceń:

~~~
./scripts/novelforge-acceptance.sh up
./scripts/novelforge-acceptance.sh rebuild-frontend
./scripts/novelforge-acceptance.sh status
./scripts/novelforge-acceptance.sh ready
./scripts/novelforge-acceptance.sh seed-writer-ready
./scripts/novelforge-acceptance.sh verify-writer-ready
./scripts/novelforge-acceptance.sh metadata
./scripts/novelforge-acceptance.sh down
~~~

up wykonuje preflight portu, generuje build metadata, buduje i uruchamia tylko fixture przez bazowy i acceptance Compose file, następnie czeka w ograniczonym czasie na /healthz/ready. rebuild-frontend przekazuje nowe metadata, buduje tylko usługę frontend, a potem odtwarza tylko tę usługę bez zależności. status pokazuje stan tylko fixture. ready sprawdza readiness pod kanonicznym URL. seed-writer-ready i verify-writer-ready wywołują istniejący scripts/seed-writer-ready-fixture.py z kanonicznym URL; runner nie kopiuje jego logiki. metadata pobiera uruchomiony plik i porównuje go z bieżącym repo. down zawsze zatrzymuje tylko fixture i zachowuje wolumeny.

Przed up i rebuild-frontend runner pyta Dockera o kontenery publikujące 18080. Jeżeli port publikuje istniejący kontener z etykietą Compose project równą writer-ready-fixture, operacja jest dozwolona i może bezpiecznie odtworzyć własną usługę. Kontener z inną lub pustą etykietą Compose project kończy te operacje komunikatem wskazującym obcy projekt i statusem non-zero; runner niczego nie zatrzymuje ani nie usuwa. Listener hostowy bez odpowiadającego mu kontenera projektu writer-ready-fixture jest traktowany jako obcy. Guard nie dotyczy down: down zawsze wykonuje wyłącznie fixture command i nie może zatrzymać obcego projektu. Brak dostępu do socketu Dockera jest raportowany jako DOCKER_UNAVAILABLE, nie jako failure aplikacji. Odpowiedź ready po terminie raportuje ostatni błąd HTTP lub połączenia oraz stan usług fixture.

### Runtime build metadata

Narzędzie standardowej biblioteki scripts/novelforge-build-meta.py będzie uruchamiane z root repo. Wygeneruje jednoliniowy JSON i kodowanie Base64 tego samego JSON do bezpiecznego przekazania przez środowisko Compose:

~~~
{
  "gitSha": "pełny SHA",
  "gitBranch": "nazwa brancha",
  "gitDirty": false,
  "workspaceFingerprint": "sha256",
  "builtAt": "ISO-8601 UTC",
  "composeProject": "writer-ready-fixture"
}
~~~

workspaceFingerprint jest SHA-256 binarnego, wersjonowanego strumienia: stały prefiks novelforge-workspace-fingerprint-v1, dokładny git diff --binary HEAD -- oraz posortowane bajtowo rekordy każdego git ls-files --others --exclude-standard -z. Dla regular file rekord to ścieżka NUL file NUL SHA-256-zawartości NUL. Dla symlink generator używa lstat, nie otwiera celu, a rekord to ścieżka NUL symlink NUL SHA-256-surowych-bajtów-link-targetu NUL. Directory, special file, FIFO, socket i device kończą generator czytelnym non-zero. Obejmuje staged i unstaged tracked diff oraz każdy nieignorowany untracked wpis; raw path bytes nie są dekodowane ani przed sortowaniem, ani przed porównaniem. gitDirty jest true wtedy i tylko wtedy, gdy diff lub lista untracked nie są puste. Nazwy i treści nie trafiają do JSON; nie ma w nim ścieżek absolutnych, użytkownika ani wartości środowiskowych.

Runner przekazuje Base64 jako NOVELFORGE_BUILD_META_B64 tylko dla operacji budujących frontend: up oraz rebuild-frontend. Nowy compose.acceptance.yaml deklaruje frontend build argument z pustą wartością domyślną `${NOVELFORGE_BUILD_META_B64:-}`, dzięki czemu operacje niewykonujące buildu, w szczególności status i down, działają również bez tej zmiennej. Runner przed każdym acceptance buildem generuje niepustą wartość i odmawia builda, jeżeli jej wygenerowanie się nie powiedzie. Bazowy compose.yaml nie wymaga tego argumentu i nadal buduje zwykły writers-room na 8080. frontend/Dockerfile.web generuje asset tylko wtedy, gdy argument jest niepusty. Przy braku argumentu zwykły build działa bez /build-meta.json. Przy jego obecności walidator Node dekoduje Base64, wymusza dokładnie sześć kluczy i zapisuje frontend/src/renderer/public/build-meta.json tylko w warstwie build. Vite kopiuje plik do dist-web; repo nie zyskuje wygenerowanego artefaktu. frontend/nginx.conf obsługuje dokładny URL /build-meta.json statycznie z Cache-Control: no-store i bez SPA fallbacku. Acceptance runner traktuje brak pliku jako failure podczas komendy metadata i każdej bramki evidence.

metadata pobiera nagłówki i body, wymaga HTTP 200 oraz Cache-Control zawierającego no-store, waliduje typy i dokładny zestaw kluczy, po czym porównuje gitSha, gitBranch, gitDirty, workspaceFingerprint i composeProject z nowo obliczonym lokalnym JSON. builtAt jest wymaganym poprawnym czasem UTC, lecz nie jest porównywany z bieżącym czasem. Brak pliku, niepoprawny JSON, nadmiarowy klucz lub dowolna różnica kończą się non-zero i wypisują nazwę każdego niespójnego pola. Sukces nie jest możliwy przez domyślny fallback aplikacji.

### Control document

docs/acceptance/novelforge-acceptance-control.md będzie krótkim, kanonicznym indeksem operacyjnym Task 10–12. Zawiera B+ implementation base 19af546c069f9dd4e472a58e586124eb363ab927, runner, URL, procedurę metadata, rozdział odpowiedzialności Shell/DevTools, status B+1/B+2/B+3, aktualną klasyfikację WR, aktywny batch QA, otwarte decyzje oraz dokładnie jeden aktualny next step. Nie zawiera dynamicznego pola SHA ani lokalnego indeksu stash. Mówi wyłącznie: Runner never invokes stash, reset or clean. Protected stash identity is a local execution-capsule constraint and must be verified before work. Aktualny lokalny stan rozstrzygają git branch --show-current, git rev-parse HEAD i git status --short; uruchomiony frontend rozstrzyga /build-meta.json.

### Błędy i bezpieczeństwo

| Warunek | Zachowanie B+1 |
|---|---|
| Socket Dockera niedostępny | Non-zero z DOCKER_UNAVAILABLE; bez wniosku o stanie aplikacji. |
| 18080 zajęty przez inny projekt Compose | Non-zero przed up/rebuild-frontend; bez zatrzymania obcego kontenera. down pozostaje dozwolone. |
| Fixture niezdrowy przed terminem | Non-zero z ostatnim błędem i docker compose -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture ps; bez automatycznego down. |
| Seed lub verify zwraca błąd | Przekazanie oryginalnego statusu seederowi; bez dodatkowej mutacji. |
| /build-meta.json nie istnieje, nie jest cache-safe lub różni się | Non-zero METADATA_MISMATCH; nie oznaczać build jako zgodny. |
| down | Tylko docker compose -f compose.yaml -f compose.acceptance.yaml -p writer-ready-fixture down --remove-orphans; nigdy -v i bez foreign-port guard. |

### Kryteria zakończenia B+1

1. Control document wskazuje jedną ścieżkę operacyjną i B+ implementation base bez dynamicznego pola SHA lub stash identity.
2. Runner ma pokryte atrapą Dockera zachowania sukcesu, timeoutu, konfliktu 18080 dla up/rebuild, dozwolonego istniejącego właściciela writer-ready-fixture, socketu, ścieżki seed/verify, zakazu writers-room, obu Compose files, metadata wyłącznie przy buildach oraz bezwolumenowego down także przy obcym listenerze.
3. Generator metadanych ma testy czystego repo, tracked diff, zmiany untracked content oraz symlink wskazujący poza repo bez odczytu celu; każdy przypadek daje oczekiwany kontrakt JSON/fingerprint.
4. Budowa frontendu umieszcza walidowany plik /build-meta.json, a konfiguracja i smoke sprawdzają Cache-Control: no-store.
5. Gdy Docker jest dostępny, osobna końcowa bramka potwierdza up, ready, metadata, seed, verify i down; jej brak z powodu ograniczenia środowiska pozostaje wyraźnie NOT VERIFIED, nie zastępuje testów bez Dockera.

## B+2 — Deterministic fault controls

### Granica i interfejs z B+1

B+2 nie należy do B+1. Doda fixture-only kontrolę pojedynczego writer PUT HTTP 500, opóźnienia odpowiedzi oraz zawieszenia i jawnego zwolnienia requestu; po każdym użyciu będzie można wyłączyć fault i wykonać cleanup. Celem są deterministyczne dowody WR-11 i WR-16, nie nowe zachowanie produkcyjnego API.

B+1 dostarcza stabilny projekt, URL, build provenance i runner. B+2 rozszerzy wyłącznie runner fixture o osobne nazwane komendy oraz zastosuje fault mode tylko wtedy, gdy Compose project jest writer-ready-fixture i jawnie potwierdza acceptance-only konfigurację. B+2 nie zmienia znaczenia istniejących ośmiu poleceń B+1 ani nie pozwala odwołać się do writers-room. Szczegóły transportu, endpointów i lifecycle faultów należą do osobnego planu B+2.

### Kryteria zakończenia B+2

1. Każdy fault jest pojedynczy, adresowany wyłącznie do writer PUT i ma potwierdzalny cleanup.
2. Jest niemożliwy do włączenia poza fixture acceptance.
3. Batcher QA może uzyskać powtarzalne dowody WR-11 i WR-16 bez interceptowania przez DevTools.

## B+3 — Matrix reconciliation and batched QA

### Granica i interfejs z B+1

B+3 nie należy do B+1 ani nie jest zmianą bieżącej macierzy. Zaktualizuje kanoniczny status WR, sklasyfikuje wykonalność scenariuszy, uzyska decyzję product/spec dla WR-07, przeprowadzi batch Recovery oraz batch Failure/Export/Restart i zamknie evidence bez powtarzania istniejących PASS.

B+3 używa tylko control documentu B+1 jako indexu, runnera jako jedynej procedury środowiska oraz metadata jako dowodu, że obserwacja dotyczy właściwego buildu. Każdy nowy wpis evidence zawiera wynik metadata z tego samego uruchomienia. B+3 nie może podnieść NOT VERIFIED do PASS bez obserwacji; ma uzgodnić stale matrix/handoff tak, aby WR-08 wskazywał rozwiązany historyczny FAIL z checkpointu 19af546c069f9dd4e472a58e586124eb363ab927.

### Kryteria zakończenia B+3

1. Control document i working matrix mają zgodną, jednoznaczną klasyfikację wszystkich WR.
2. WR-07 ma odnotowaną decyzję product/spec przed testowaniem.
3. Każdy batch ma provenance, minimalny zestaw nowych obserwacji oraz kończy się PASS, FAIL albo NOT VERIFIED.
4. Task 11 i Task 12 pozostają w swoich oddzielnych, zatwierdzonych zakresach.

## Rozszerzenie do Task 11 i Task 12

Task 11 odziedziczy izolowany runner, provenance i control document, lecz backup/restore pozostają poza komendami B+1. Jego plan może dodać własną proceduralną bramkę tylko po osobnej autoryzacji. Task 12 wykorzysta B+3 do evidence closure, nie zmieni runtime metadata i nie zapisze PASS wyłącznie z wyników unit tests.

## Non-goals

- Ponowna naprawa WR-08, zmiana WR-07 lub modyfikacja writer UI/API.
- B+2 fault injection oraz B+3 reconciliation/batched browser QA.
- Uruchamianie Dockera, Chrome, Task 11, Task 12 albo aktualizacja working matrix podczas fazy projektowej.
- Backup/restore, operacje na wolumenach fixture lub głównego stosu, interakcja z chronionym lokalnym stash.
- Wyświetlanie provenance w normalnym UI, rejestrowanie sekretów lub przechowywanie prywatnej prozy.

## Ryzyka i ograniczenia

- Docker Desktop może być niedostępny w sandboxie; testy z atrapą pozostają obowiązkowym dowodem zachowania runnera, a smoke jest osobną bramką środowiskową.
- Ręczne użycie bazowego Compose nie ma metadata celowo; dokumentacja kieruje acceptance do runnera i compose.acceptance.yaml, a metadata wykrywa stary lub niezgodny fixture image.
- Fingerprint świadomie jest kosztem liniowym względem nieignorowanych untracked files; dzięki hashowaniu zawartości nie ujawnia ich treści w metadata.
- Mechanizm portu rozróżnia własny kontener writer-ready-fixture od obcego projektu. Proces hosta bez odpowiadającego kontenera fixture wymaga odmowy przed up lub rebuild-frontend, lecz nigdy nie blokuje bezpiecznego down.

# Writers Room App: Local-First, VPS-Ready Design

**Status:** proposed baseline for owner review  
**Upstream baseline:** `RhythmicWave/NovelForge` commit `ca7ca584580df0220a6a0d008309e5575b3dc449` (`v0.9.6`)  
**Repository:** `tpoh93/Writers-Room-app`  
**Primary user:** Piotr  
**Optional trusted user:** Martyna

## 1. Goal

Adapt NovelForge into a private AI writing cockpit that runs locally on Piotr's Mac, is reachable from trusted devices through Tailscale, and can later be moved to a VPS without rebuilding the application architecture.

The first product milestone is not a public SaaS. It is a reliable personal writing tool for long-form fiction, especially workflows based on selected text, multi-model pipelines, review, diff, and controlled replacement.

## 2. Frozen deployment decision

Version 1 uses the following model:

- the application runs on Piotr's Mac;
- the canonical runtime is the web application and FastAPI backend started through Docker Compose;
- trusted remote access is provided by Tailscale;
- no public ports are exposed to the Internet;
- no public registration or account system is added;
- the database and uploaded files live in explicit persistent volumes;
- all runtime configuration is supplied through environment variables and mounted secrets;
- the same container images and volume layout must work on a later VPS deployment.

Electron may remain available as an optional local shell, but it is not the deployment source of truth. The browser version is the canonical product path because it minimizes the difference between local Mac hosting and VPS hosting.

## 3. Why this architecture

### Local-first now

- no server subscription is required;
- project data remains on Piotr's machine;
- API keys stay under Piotr's control;
- remote access is private and limited to the Tailscale network;
- development and daily use can begin before production hosting exists.

### VPS-ready later

- backend and frontend are containerized from the start;
- storage paths are not hard-coded to macOS user directories;
- secrets are external to images and source control;
- health checks, backups, and startup ordering are part of the local design;
- moving to a VPS means copying configuration and persistent data, then starting the same Compose stack.

## 4. System boundaries

### 4.1 Frontend

Existing NovelForge Vue 3 frontend remains the primary UI foundation.

Responsibilities:

- project and card navigation;
- chapter and scene editing;
- text selection capture;
- pipeline selection and launch;
- live progress display;
- per-step output review;
- final diff and accept/reject controls;
- settings for model configurations, prompts, and context;
- Polish localization for all screens used in Version 1.

The frontend communicates only with the backend API. It never calls OpenRouter or other model providers directly.

### 4.2 Backend

Existing FastAPI backend remains the application authority.

Responsibilities:

- database access;
- project, card, prompt, and workflow persistence;
- LLM provider configuration;
- pipeline execution;
- token, cost, duration, and status tracking;
- checkpointing and retry;
- safe application of text patches;
- backup and restore operations;
- health endpoints used by Docker and later VPS monitoring.

### 4.3 Database

SQLite remains the Version 1 primary database because the product is single-owner and local-first.

Requirements:

- the database file lives in a named persistent volume;
- migrations run explicitly and create a pre-migration backup;
- backup files are stored outside the live database directory;
- the application must support restoring a backup into a clean local installation;
- the schema must not depend on absolute host paths.

PostgreSQL is not introduced in Version 1. A future multi-user product would require a separate migration design.

### 4.4 Knowledge graph

Neo4j remains optional.

Version 1 must not require Neo4j for basic editing, selected-text pipelines, project structure, prompt management, or backup. If enabled, it runs as a separate optional Compose profile with its own persistent volume.

### 4.5 Model providers

OpenRouter is the primary provider through NovelForge's OpenAI-compatible transport.

Requirements:

- provider endpoint, API key, headers, and model name are configuration data;
- API keys are never committed to Git;
- API keys are not returned in frontend API responses;
- each pipeline step may reference a different LLM configuration;
- provider failure must not corrupt source text;
- model usage statistics must be recorded per pipeline step.

Direct OpenAI, Anthropic, Google, and other existing providers may remain supported, but they are not required for the first acceptance milestone.

## 5. Canonical local runtime

The repository will provide a root-level Docker Compose setup with these services:

1. `backend`
   - FastAPI and Uvicorn;
   - mounted application-data volume;
   - mounted backup volume;
   - health check;
   - no public Internet exposure by default.

2. `frontend`
   - built web frontend served by a small web server;
   - reverse proxy to the backend API;
   - one private application address inside the Tailscale network.

3. `neo4j` as an optional profile
   - disabled by default;
   - enabled only when graph functionality is explicitly tested and accepted.

The first local deployment may bind to the Mac's Tailscale address or to localhost with Tailscale Serve. It must not bind an unauthenticated service to all public interfaces by default.

## 6. Remote access model

Tailscale is the only supported remote-access mechanism in Version 1.

Rules:

- trusted devices join Piotr's private Tailscale network;
- the application is not indexed or publicly reachable;
- no router port forwarding is used;
- no Cloudflare Tunnel is required for Version 1;
- no custom domain is required;
- access is limited by Tailscale identity and network policy;
- optional application-level authentication may be added later, but it is not a substitute for private network isolation.

Martyna may receive access as a trusted user. This does not turn the product into a public multi-user platform.

## 7. VPS migration contract

A VPS migration is considered easy only when all of the following are true:

1. The same Compose file or a small production override starts the application.
2. No application code changes are required.
3. The SQLite database and uploaded assets can be copied from named volumes or documented host paths.
4. Environment variables and secrets are recreated without modifying images.
5. The application starts against the restored data and passes health checks.
6. Existing projects, prompts, model configurations, pipeline definitions, and run history remain available.
7. A rollback to the local Mac deployment remains possible from the same backup set.

The future VPS may add Caddy, Traefik, or another TLS reverse proxy, but this is a deployment layer and must not alter application behavior.

## 8. Product scope for the first functional milestone

The first functional milestone proves one complete flow:

1. User opens a chapter or scene.
2. User selects a text range.
3. User selects the `Thinking p*rn` pipeline.
4. User adds or confirms the task brief.
5. Step 1 runs with Kimi.
6. Step 2 receives the selected source and Kimi output, then runs with Grok.
7. Step 3 receives the relevant prior outputs, then runs with Aion.
8. The application shows step results and a final before/after diff.
9. User accepts or rejects the final patch.
10. Acceptance replaces only the original selected range.
11. Rejection leaves the document unchanged.
12. The run record preserves inputs, outputs, model identities, status, timing, token use, and estimated cost.

## 9. Text safety contract

Selected-text replacement is destructive only after explicit user acceptance.

The implementation must:

- store the selected text and selection coordinates at launch time;
- calculate a fingerprint of the surrounding document state;
- refuse automatic application when the source document changed incompatibly during generation;
- show a conflict state instead of guessing where to insert text;
- prevent double application of the same run;
- create an undoable editor transaction;
- preserve text outside the selected range byte-for-byte where possible;
- preserve Polish characters and Markdown formatting;
- never apply partial output from a failed pipeline unless the user explicitly chooses a step result.

## 10. Failure handling

### Provider failure

- mark the affected step as failed;
- retain all completed prior step outputs;
- offer retry for the failed step;
- do not modify the source document.

### Application restart

- persist pipeline run state after every completed step;
- restore the run history after restart;
- resume only from a supported checkpoint;
- otherwise offer restart from the failed step using preserved inputs.

### Database migration failure

- stop startup;
- keep the original database untouched;
- record the error;
- provide the path to the pre-migration backup.

### Storage failure

- do not claim a save succeeded when persistence failed;
- surface a blocking error;
- avoid continuing destructive operations while the database is unavailable.

## 11. Security and secrets

Version 1 security requirements:

- `.env` files and secret mounts are ignored by Git;
- example environment files contain no real keys;
- backend logs redact API keys and authorization headers;
- frontend never stores provider API keys in local storage;
- Docker images contain no secrets;
- backups are treated as sensitive because they contain private writing;
- Tailscale is required for remote access;
- no anonymous public endpoint is enabled by default.

## 12. Licensing

The fork remains under the upstream AGPLv3 licensing model unless a later legal and commercial decision changes the distribution strategy.

Version 1 is a private-use deployment, but the source repository remains public as required by the fork model and to preserve a clean upstream relationship.

The repository must:

- retain the upstream license and notices;
- document major modifications;
- make the corresponding source available to any trusted remote user of the deployed version;
- avoid presenting the fork as an original clean-room implementation;
- avoid offering a closed commercial hosted service without separate licensing review and, where required by upstream terms, commercial authorization.

## 13. Explicit non-goals for Version 1

The following are excluded:

- public SaaS;
- user registration;
- password reset;
- billing and subscriptions;
- organization accounts;
- per-user data isolation;
- public sharing links;
- marketplace for prompts or pipelines;
- mobile native applications;
- PostgreSQL migration;
- Kubernetes;
- automatic public deployment;
- redesign of every NovelForge feature;
- full translation of unused administration and graph screens before the core writing flow works.

## 14. Testing strategy

### Local runtime tests

- clean build on Piotr's Mac;
- Compose startup from a clean checkout;
- persistent data survives container recreation;
- Tailscale access from another trusted device;
- no access through an untrusted public interface;
- backup and restore into a clean installation.

### Pipeline tests

- three different LLM configurations in one sequential run;
- retry of the second step without rerunning the first;
- cancellation during each step;
- restart after the first completed step;
- provider timeout;
- invalid model response;
- accurate final state after accept and reject.

### Editor safety tests

- one-word selection;
- multiple paragraphs;
- dialogue punctuation;
- Polish diacritics;
- Markdown emphasis;
- document changed while pipeline runs;
- double-click on accept;
- undo after acceptance;
- no changes outside the selected range.

### VPS portability test

Before declaring Version 1 VPS-ready, run the stack on a clean Linux virtual machine or equivalent local Linux environment using only repository instructions, environment configuration, and restored persistent data.

## 15. Acceptance gates

### Gate A: upstream baseline

- fork points to upstream `v0.9.6` commit;
- upstream license is intact;
- branch strategy and upstream remote instructions are documented.

### Gate B: local container runtime

- frontend and backend start through Compose;
- data persists after restart;
- health checks pass;
- secrets remain outside Git.

### Gate C: private remote access

- application is reachable from an approved Tailscale device;
- application is not publicly reachable;
- no router port forwarding is required.

### Gate D: selected-text pipeline spike

- three configured models run sequentially;
- each step receives the intended inputs;
- final output is previewed as a patch;
- accept changes only the selected range;
- reject changes nothing.

### Gate E: portability

- the same stack starts in a clean Linux environment;
- restored data is usable;
- no code modification is required.

## 16. Recommended branch model

- `main`: stable fork baseline and accepted changes;
- `upstream-sync/*`: temporary branches for importing upstream changes;
- `spike/*`: disposable technical investigations;
- `feature/*`: implementation work after a spike passes;
- `docs/*`: specifications and plans.

No direct feature work should be committed to `main`.

## 17. First implementation sequence after approval

1. Record upstream baseline and synchronization procedure.
2. Audit existing local and web startup paths.
3. Add root-level container orchestration without changing product behavior.
4. Prove persistent SQLite backup and restore.
5. Prove Tailscale-only access.
6. Audit selected-text edit path and workflow engine interfaces.
7. Build the smallest possible three-step selected-text pipeline spike.
8. Run the acceptance gates.
9. Decide GO or NO-GO for full adaptation.

A GO decision means the fork can safely become the product foundation. A NO-GO decision preserves the fork and spike evidence but prevents further customization until the blocking architecture problem is resolved.

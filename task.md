# TRACE implementation backlog and validation record

Version 1.0 · 12 October 2026 (web progress reconciled 2026-10-17). This file records the **web half** (`trace-web`) of each task; the backend half is in `trace-api/task.md`. Task statuses below are authoritative; tasks without a progress-log entry are NOT STARTED. Documentation drafting/audit is distinct from implemented/tested software. Coding agent owns status updates.

## Workflow

Statuses: TODO, IN_PROGRESS, BLOCKED, DONE. Select a task only when dependencies pass. On each update record date, commit(s), changed requirements, exact checks/results, limitations and next task. A screenshot or green UI toast is not completion evidence. Preserve IDs when splitting tasks (e.g. T-012a). If scope changes, update PRD/architecture/ontology and affected tests together. Do not remove later-phase requirements to make current release appear complete.

## P1 — Foundation and code knowledge

### T-001 · Compatibility and deployment spike · TODO (not a web task; no version matrix recorded)
Dependencies: none. Requirements: all architecture foundations.
Deliver: lock tested Python/Node/Next.js/FastAPI/Neo4j/OpenAI SDK/Graphify versions; verify chosen model availability; validate Graphify CLI/output schema on Python+TypeScript fixtures; check hosting memory/process/SSE support, provisioned database capabilities and backup limits. Record exact official provider docs/version/date for active integrations. Validate Graphify redistribution notices for shipped dependencies. No token-saving/performance claim adopted without local measurement.
Acceptance: reproducible local build; real Graphify sample yields expected identities/edges/source locators; tested version matrix; incompatible capability fails visibly. Blocks enabling providers until their own spike passes.

### T-002 · Backend/web repositories, CI and contracts · IN_PROGRESS (web half)
Dependencies: T-001. Requirements: R-002, architecture A3/A5.
Deliver: two repo layouts, config validation, secret-free env examples, lint/typecheck/test commands, migrations, OpenAPI→TS generation and CI drift check. Add correlation IDs, safe error envelope, live/ready health.
Acceptance: clean checkout installs locked versions; invalid config fails with field name only; frontend compiles generated types; CI runs meaningful checks.

### T-003 · Auth, membership, role policy and audit · DONE for now (scope cut: no login)
Dependencies: T-002. Requirements: R-001,R-019.
Deliver: sign-in/signup/reset/session handling, invitation/membership flow, project grants, JWT verification, server authz, RLS, audit and own-preferences endpoints. Owner/Admin/Approver/Investigator/Viewer permissions tested independently. Audit export restricted.
Acceptance: unauthorized/cross-project/revoked tests; login deep link return; secret-free logs; Admin privilege not confused with independent patch approval.

### T-004 · Responsive shell and landing · DONE (acceptance checks pass 2026-10-17; limitations recorded)
Dependencies: T-003. Requirements: R-001,R-002,R-020.
Deliver: final prototype navigation, breadcrumbs/scope/command palette, theme, mobile drawer, stable routes, query cache, local table scroll and empty/error components. Landing truthful sample labels.
Acceptance: keyboard/reduced-motion and 1440/1024/768/390/320px browser checks; no whole-page overflow; scope change clears unauthorized cached data.

### T-005 · Projects, wizard and domain scope · IN_PROGRESS (wizard built and browser-checked; GitHub-connected paths not verified for real)
Dependencies: T-003,T-004. Requirements: R-015,R-019.
Deliver: project list/detail/team, draft wizard in prototype order, unique names, owner/envs, repository-service mappings, ready-by-capability checklist, review/edit/resume and future-provider disabled states. Mirror non-secret scope via outbox.
Acceptance: skip/resume persists; project name race conflict; one-repo-many-services support; membership enforcement.

### T-006 · Durable jobs, outbox and GitHub credentials · IN_PROGRESS (web half: connection UI against the real API; no real GitHub App run)
Dependencies: T-005. Requirements: R-016,R-019.
Deliver: queue leases/heartbeat/cancel/retry/dead-letter, cross-store receipts/reconciliation, encrypted versioned credentials, GitHub cloud read installation, R-016 provider capability gates and separately provisioned future remediation identity, real verify/discover, rotate/disconnect, inventory and audit.
Acceptance: process kill during graph commit reconciles once; credential replacement failure preserves working version; disconnect stops queued work; webhook signature/deduplication; no credentials in browser/model/events.

### T-007 · Graphify/source indexing and graph migrations · IN_PROGRESS (web half: Code tab graph generation card)
Dependencies: T-006. Requirements: R-017; ontology O1–O7.
Deliver: safe SHA checkout, extraction adapter/limits, normalizer, deterministic IDs, graph constraints/indexes, chunks, build versioning/staging/publication, manifest, history and partial coverage. No customer script execution.
Acceptance: Python/TS fixtures; identical symbol names/revisions isolation; idempotent rebuild; invalid endpoints fail; failed rebuild leaves previous graph; cleanup after cancellation; cited source exact hash.

### T-008 · Code/source/architecture graph experience · IN_PROGRESS (code graph, system map and DB views exist; source viewer and accessible table not verified)
Dependencies: T-007,T-004. Requirements: R-009,R-017,R-020.
Deliver: repository browser/import states, archived filters/unsupported TFVC, source viewer/path/revision links, code settings and diagnostics, D3 graph controls, communities/most-connected, uses/used-by, bounded reverse blast and accessible table.
Acceptance: source selected from correct manifest; full graph not loaded by default; relation filters/pan/zoom/fit/keyboard work; static reachability never shown as runtime degradation.

## P2 — Real investigations

### T-009 · Generic telemetry ingestion and log console · IN_PROGRESS (Logs tab; drain not exercised for real)
Dependencies: T-006,T-007. Requirements: R-018,R-016.
Deliver: signed/scoped generic events API, redaction/dedupe/time mapping/gaps, durable normalization, generic deployment events and service/environment/revision mapping required for P2 code correlation, stored logs search, explicit bounded source-fetch contract, cursor and freshness/coverage UI.
Acceptance: malformed/oversize/duplicate/out-of-order events; cursor doesn't advance before graph acknowledgement; zero rows vs no source; no cross-project query results.

### T-010 · Tickets and explicit Investigate · IN_PROGRESS (tickets done; Investigate button wired)
Dependencies: T-009,T-005. Requirements: R-004.
Deliver: manual/API intake/revisions/dedupe, attachments text cap, assignment/filters/owner/status, graph ticket sync, Investigate/rerun command and active-run uniqueness.
Acceptance: assignment/refresh/page open enqueue no investigation; two simultaneous clicks one run; missing scope prompt; required evidence sync pending; ticket close independent of run.

### T-011 · Neo4j retrieval tools and GraphRAG evaluation · TODO (backend; web only shows run evidence)
Dependencies: T-007,T-009. Requirements: R-008,R-009; ontology O8–O12.
Deliver: exact/full-text retrieval, source/deploy/diff lookups, typed graph traversal, rankings/contradictions, manifests/citations/gaps/limits, parameterized templates; no arbitrary model query.
Acceptance: corpus tests for missing logs, wrong revision, misleading names, cycles, late evidence, ambiguous dependencies, graph isolation and budget truncation; record retrieval recall and cost rather than assumed gains.

### T-012 · State-machine orchestrator and investigation workspace · IN_PROGRESS (run list, step trace, evidence, ask; no SSE resume, cancel or replay yet)
Dependencies: T-010,T-011. Requirements: R-005,R-006,R-008,R-009.
Deliver: parent/skills, GPT-4o mini structured outputs, retry/repair/budgets, durable steps/assessments/findings, SSE resume, lists/context panels/timeline, historical step snapshots, read-only replay/cancel/rerun.
Acceptance: model invalid citation rejected; provider outage/worker restart/stream drop handled; historical context excludes later evidence; competing hypotheses and insufficient-evidence completion; no hidden reasoning exposed.

### T-013 · Human questions and manual diagnostics · TODO
Dependencies: T-012. Requirements: R-007.
Deliver: pending requests/schema options/manual instructions, eligible actor responses, raw-redacted observation provenance, pause/resume/expiry.
Acceptance: duplicate/stale/unauthorized submission denied; one resume; human result never becomes provider telemetry; user instructions cannot grant tools authority.

### T-014 · TRACE Bot, Home and user work queues · IN_PROGRESS (Home shows only real ticket/project counts; Bot panel is an honest placeholder)
Dependencies: T-012,T-013. Requirements: R-003,R-010.
Deliver: scoped chat/history/versioned regenerate/copy/stop/citations/follow-ups, bounded follow-up jobs, real Home counters/Needs-you/progress/project gaps and unread events.
Acceptance: interrupted answer marked partial; citations resolvable; scope switch safe; completing question removes matching queue item; no mock percentages or timers.

### T-015 · P2 end-to-end gate · TODO
Dependencies: T-008 through T-014. Requirements: R-001–R-010,R-015–R-020 as phase-applicable.
Deliver: documented authorized fixture project/run walkthrough, scope-isolation/restore/reconnect/cancellation/evaluation results, source retention check, screenshots at target widths.
Acceptance: actual ticket→click→evidence→hypotheses→impact→finding→question flow; independent reviewer checks citations and uncertainty; all enabled buttons have real behavior; baseline usage measured.

## P3 — Controlled remediation and verification

### T-016 · Changes, immutable patch proposals and diffs · TODO
Dependencies: T-015. Requirements: R-011,R-010.
Deliver: observed changes ingestion/diff at base manifest, proposal and patch versions/hash, rationale/risk/impact, diff annotations/maximize/edit, bot patch cards, stale-base detection.
Acceptance: edit creates new version; source paths/repo scope validated; no patch applied on display; proposed test never presented as executed.

### T-017 · Environment governance and approval controls · TODO (no settings UI by decision)
Dependencies: T-016. Requirements: R-012,R-019.
Deliver: policy versions, scoped approvers/CODEOWNERS/author exclusion, count, target branch, freeze timezone, emergency reason/review, required ticket, approval/revoke, settings UI.
Acceptance: self-approval/impersonation prevented; edit invalidates approval; delayed dispatch rechecks policy; DST freeze tests; missing independent reviewers blocks rather than fakes approval.

### T-018 · Isolated validation and authorized external writers · TODO (Jira writer CANCELLED)
Dependencies: T-017,T-006. Requirements: R-011,R-012.
Deliver: bounded secret-free sandbox adapter (explicit unavailable state if host not provisioned), test artifacts, GitHub draft PR create/update, ~~separately authorized minimal Jira change-ticket writer (P3)~~ (CANCELLED), operation reconciliation/audit. Broad ticket-provider intake/discovery remains P4.
Acceptance: timeout doesn't duplicate PR/ticket; unauthorized branch/writes denied; base movement requires re-review; sandbox no provider/DB keys; TRACE cannot merge/deploy/rollback.

### T-019 · Deployment correlation and recovery · TODO
Dependencies: T-018,T-009. Requirements: R-013.
Deliver: deployment ingestion/API, revision overlap/exposure mapping, criteria/baseline/window checks, observations detail/graphs, watching/recovered/regressed/inconclusive states, explicit reopen.
Acceptance: merge alone insufficient; low traffic/absent latency data cannot pass; regression reopening creates new run; ticket not auto-closed; confounding changes disclosed.

### T-020 · P3 governance and recovery gate · TODO
Dependencies: T-016–T-019.
Deliver: authorized sandbox-repo end-to-end test, approval race/revocation/stale hash/uncertain external result/recovery coverage evidence.
Acceptance: actual approved draft PR and separately scoped change ticket tested with configuration; no production execution; checkpoint replay cannot issue repeated writes.

## P4 — Catalog and advanced product completeness

### T-021 · Remaining source connectors · TODO (scope reduced: Vercel and GitHub hardening only)
Dependencies: T-015,T-006; P3 permissions before writes. Requirements: R-016,R-018.
Subtasks: T-021a Azure (CANCELLED); b AWS (CANCELLED); c GCP (CANCELLED); d Vercel (promoted into P1/P2/P3 work); e Railway (CANCELLED); f Azure DevOps repositories (CANCELLED); g Jira (CANCELLED); h ServiceNow (CANCELLED); i Azure Boards (CANCELLED); j Supabase log/history connector (CANCELLED). Each preserves the R-016 provider setup fields/modes with honest capability gating and gets official-doc capability review, auth/scopes, discovery, pagination/cursors, rate limits, error states, scoped UI form, real verify and account smoke test. Ticket adapters explicitly separate intake from change-ticket output. Generic Other remains supported.
Acceptance per adapter: actual bounded authorized read ingests to graph; unsupported plan/capability disabled honestly; token refresh/expiry/revoke handled; customer database rows never queried; write enabled only with policy and explicit action.

### T-022 · Schema/config extraction and extended architecture · IN_PROGRESS (interim: Database view from a read-only Postgres connection)
Dependencies: T-007,T-021. Requirements: R-009,R-016,R-017.
Deliver: supported source schema/migration parsing, schema viewer/locators/relations, confidence/drift display, system graph cross-repo evidence linking. Optional docs semantic extraction requires explicit project consent, data scope and model/cost choice; disabled until tested.
Acceptance: schema intent not claimed deployed fact; community not treated as service; model-derived links marked; invalid schema/unsupported file yields coverage gap.

### T-023 · Reviews, analytics, notifications and advanced settings · TODO (preferences, notifications, on-call removed by decision)
Dependencies: T-015,T-019. Requirements: R-003,R-014,R-019.
Deliver: human review workflow and formulas/cohorts/sample sizes, audit exports, per-user preferences, in-app and configured email questions/fixes/PR/digest, deduped delivery/retries, unread sidebar, separate usage byte/tool/token meters, configured on-call metadata if used.
Acceptance: N/A for no data; no model self-grading; timezone/daily reset consistent; opt-out honored; notification links authorized; email service selection/configuration required before email toggle claims delivery.

### T-024 · Full prototype parity and operations gate · TODO
Dependencies: all prior phase tasks.
Deliver: independent validation of every PRD coverage row, browser route/action checks, all widths/keyboard/reduced-motion, load/retention/restore drills, evaluated model costs and provider capability docs, final gap register.
Acceptance: no unexplained missing item; deferred/unsupported features visible; all enabled actions verified; no fabricated provider/graph/metric/recovery success. Update this file with reviewer/date/test evidence and known limitations.

## Amendments by user decision (2026-10-16, applied to the web repo 2026-10-17)

Recorded in full in `trace-api/docs/PLAN.md` section 1 (it overrides `TRACE/`). Impact on this half:
- Repos are `trace-api` (Python) and `trace-web` (Next.js).
- **Settings is dropped for now.** No `/settings` routes, no preferences, notification, credentials, member-admin or audit UI (T-003, T-017, T-023 reduced accordingly). The Team tab of a project only lists project members.
- **Connectors: Vercel (hosting) and GitHub (code) only**, plus the generic app-log source. Supabase, Azure, AWS, GCP, Railway, Azure DevOps, Jira, ServiceNow and Azure Boards are out. T-021 subtasks a, b, c, e, f, g, h, i, j are **CANCELLED**; d (Vercel) is part of P1 to P3 work and T-021 becomes hardening of the two adapters. The earlier web decision that listed Supabase as a connector is superseded.
- **The wizard has no Tickets step:** Basics, Hosting (Vercel), Log scope, Code (GitHub), Review. Tickets arrive by manual form, API or the PulseLab export import. The Jira change-ticket writer in T-018 is **CANCELLED**; a change ticket is a manually linked external reference.
- **Auth is deferred.** The API runs with `AUTH_MODE=off`; the web app has no login, no session cookie and no token (T-003 is DONE for now as a scope cut, not as an implemented auth flow).
- Wave plan: `.omc/plans/trace-completion.md` in the workspace root (W1 reconcile and audit, then one web wave per backend wave).

## Validation checklist for every phase

- [ ] User-visible behavior mapped to requirement IDs and current prototype overrides.
- [ ] Backend authority, idempotency, permissions and failure path implemented.
- [ ] Graph identity/project/environment/revision/time boundaries tested.
- [ ] Citation and evidence source checks pass; no fallback to untracked live content.
- [ ] Loading/empty/partial/auth/rate-limit/retry/cancel states checked where applicable.
- [ ] Metrics have definition/source/window/denominator/freshness.
- [ ] UI keyboard/responsive and streaming reconnect checks pass.
- [ ] Status record contains actual tests/results, not claims of future verification.

## Documentation audit and decision register

Independent static prototype audit completed against final V12–V17 overrides. This is source inspection, not interactive browser testing. All active feature families map to PRD coverage matrix. Current decisions supersede autostart on assignment, merge-based recovery, impersonated approvals, broad database access and simulated production apply actions.

Implementation gates still requiring actual environment verification: pinned dependency compatibility, provider-specific permission/plan availability, licensed UI dependency availability if chosen, SMTP delivery service, sandbox capacity, hosting resource limits, retention/backup capacity. These are explicit tasks rather than hidden omissions. Product defaults are specified; no remaining question blocks beginning P1.

Final five-document review completed 12 October 2026 by an independent validation agent. Static source inspection covered final navigation and active V3–V17 functions/overrides, compared 28 coverage families with R-001–R-020 and T-001–T-024, and reviewed architecture/ontology boundaries. Corrections added provider-specific setup parity and capability gating, separate GitHub remediation credentials, safe provider URL handling, precise abstention denominators, and canonical bot entity names. Explicit Investigate, Neo4j-only retrieval, immutable revisions, approval invalidation and deployment-based recovery remain consistent. Limitations: no browser interaction, provider account/API validation, package compatibility execution, Cypher integration execution or working-application tests were performed in this document audit; these remain implementation gates. The earlier T-4 text match was within GPT-4o, not an undefined task reference.

## Agent progress log

| Date | Task | Status | Evidence / next action |
|---|---|---|---|
| 2026-10-12 | Specification | Reviewed | Five TRACE-only documents; implementation not started; next T-001 after document handoff |
| 2026-10-16 | Scaffold | Done | `52c9218` Next.js 16 / React 19 / Tailwind 4 (no preflight) port of the prototype CSS, `.env.example`, `PORTING.md`. `fdfb07b` plans (`TRACE/`), this task file, project instructions, prototype shell/UI components. Sample-data fixtures at this point; since removed. |
| 2026-10-17 | T-002 (web half), T-003 (scope cut), T-004 (first cut), T-005, T-006 | IN_PROGRESS | `ce2f104` Deleted all sample data (`src/data` keeps brand logos only), the demo login (`proxy.ts`, `/api/demo-session`, auth pages) and Settings. Typed client `src/lib/api.ts`, `call.ts`, `useApi.tsx` (polling, `invalidate()`), honest states (`components/ui/States.tsx`). Wired Projects list/detail (Connectors, Code, Log scope, Team), the server-saved resumable wizard, GitHub connect redirect, Vercel token connect with staged checks, Tickets (server views, search, filters, assign, resolve, new ticket, PulseLab import), Home (real ticket and project counts only), command palette search, nav badge from real counts. Types are hand-written, not generated from `docs/openapi.json`; no CI drift check. |
| 2026-10-17 | T-007, T-008 | IN_PROGRESS | `ce2f104` Code tab "Generate graph" card (polls index runs) and the live code graph view with symbol detail and blast radius. `3d59429` Architecture tab: System map (from configured structure and provider metadata, unknown links listed as gaps) and Database view (schema metadata from a read-only Postgres connection card; deviation from PRD D-06 by user decision), recorded in `PORTING.md`. |
| 2026-10-17 | T-004 (landing) | IN_PROGRESS | `4edb822` Landing: illustrated product screens, each frame labelled "Sample data" (invented content, not imported by the workspace). |
| 2026-10-17 | T-009 | IN_PROGRESS | `a5ce8ee` Logs tab: freshness per resource (unknown is never shown healthy), explicit live capture, drain setup, stored log search. `8c2ddfe` drain endpoint on the Vercel connector and Logs tab. `fa9f195` "Send logs from your app": setup, endpoint, secret shown once, forwarder snippet. Not verified: a real Vercel drain (needs Pro and a public URL). |
| 2026-10-17 | T-009 (capture reporting review) | IN_PROGRESS | Projects → Logs now shows capture read, accepted and duplicate totals; each scoped Vercel resource's outcome and counts; and the API's note that live runtime capture is partial. `npx tsc --noEmit` clean; `npx next build` succeeded (10 routes). A new live capture was not possible: no local TRACE API is listening and no deployed API URL was provided. |
| 2026-10-17 | T-010, T-012 (web part) | IN_PROGRESS | `981e14c` Investigate: run list, step trace, evidence views (log text, source lines with pinned hash), hypotheses, ask a question about a run, rerun. Starting a run is only the Investigate click. Not built: SSE resume, cancel, replay, human question answers (W2). |
| 2026-10-17 | W1 audit: T-004 | DONE | Commit `c577e74`. Real browser (Chrome via playwright-core) against the real API at 1440/1024/768/390/320 px on 15 routes (landing, home, tickets, investigate, changes, observability, projects, wizard, six project tabs, 404) and the same widths on 7 routes with synthetic, scratch-only API fixtures (long names, tickets, a bound repository): no page-wide horizontal overflow anywhere. Keyboard: skip link, Tab order, sidebar drawer is `inert` while closed at <=900 px (before this change eight off-screen links were tabbable), opens with focus inside, Escape and scrim close it and return focus, Ctrl K palette opens with focus in its input and Escape closes it, project scope select shows a focus ring. Reduced motion: transitions and animations resolve to 0.01 ms under `prefers-reduced-motion`. Scope: the project selector appears only on Investigate (the only page that reads it) and filters it, resets to All if the project is no longer authorized, and every scope change calls `invalidate()` so no previous-scope result stays mounted (there is no client cache). Nav badge is the real "tickets without a project" count or hidden. Landing: removed "Sign in" (there is no login), removed Supabase, labelled example figures, no personal name in the sample frame. Limitations: `useApi` refetches rather than caching (no TanStack Query), so "scope change clears cached data" holds because nothing is cached; landing keeps labelled illustrations by T-004 ("truthful sample labels"); not tested with a screen reader. |
| 2026-10-17 | W1 audit: T-005, T-006 (web) | IN_PROGRESS | Commit `15c3a0e`. Against the real API (`AUTH_MODE=off`, local Postgres): wizard Basics, Hosting, Log scope, Code, Review; skip on each step persists as `skipped` and a page reload restores the draft; Projects now lists "Unfinished setups" (`GET /project-drafts`) with Resume and Discard; "Save and exit" keeps the draft. Name conflict: checked on Continue (`GET /projects?q=`, case-insensitive) and again on activate (`project_name_taken` keeps the draft and links back to Basics), shown next to the field. Review lists environments, services, per-environment log scope names and repositories with refs, with Edit links. Provider gating from `GET /providers`: the GitHub App is shown unavailable with the API's reason ("not configured on this deployment") and its button is disabled; the labelled trial-mode fine-grained token form appears because the API reports it available; Vercel integration mode shown unavailable with its reason. An invalid Vercel token (test value) went through the real worker and showed the real failed check; a check pending for more than 20 s says the worker may not be running. Project Code tab now has Services and per-repository mappings (one repository to many services with folder prefixes, plus stack-trace path mappings). **Not verified for real:** GitHub connect (no App key on this machine), repository selection and mappings against a real binding (mappings UI exercised with scratch fixtures only; the request body matched `MappingsPut`), wizard activation (would create a permanent project; covered by backend tests), project member editing (Team tab is read-only; no org-member listing endpoint). |
| 2026-10-17 | Checks for the W1 commits | Done | `npx tsc --noEmit` clean; `npx next build` passes; code-review skill (medium) run on the diff, findings fixed (mappings double-save and refetch overwrite, scope reset beyond 100 projects, drawer Escape handler purity, name-conflict message, providers error shown, tokens cleared after a failed send). Next: W2 Investigate workspace on SSE, cancel/rerun/replay, human question answers (after backend wave B2). |
| 2026-10-17 | T-010 (repeat Investigate routing) | IN_PROGRESS | `ApiError` retains structured error details; the ticket Investigate action uses `run_active` details to open `/investigate/{project_id}/{run_id}`, with a fallback to the list for legacy responses. Checks: `npx tsc --noEmit` clean; `npx next build` passes. Browser end-to-end not run because local API/web endpoints at ports 8000/3000 did not respond. Next: W2 investigation streaming/workspace after backend wave B2. |
| 2026-10-17 | T-010 (ticket live logs) | IN_PROGRESS | Ticket drawer now polls stored project logs every 5 seconds while open, bounded to ±15 minutes around its reported window (or opened time), with project, environment, exact service hint and optional reporter-supplied request ID filters. Displays explicit unassigned, no source, no events and query failure states; row source labels come from the stored provider. Reporter-supplied PulseLab summary counts and request IDs are labelled and shown only from the safe ticket summary; no raw export is loaded and PulseLab remains no telemetry source. Checks: `npx tsc --noEmit` clean; `npx next build` passes. Browser check unavailable because local API/web ports 8000/3000 did not respond. No commit. Next: parent review and browser verification when services are available. |
| 2026-10-17 | T-009 (partial capture failure reporting) | IN_PROGRESS | Projects → Logs keeps the failed status and provider error visible, and when the failed job includes stored partial results it also shows aggregate counts, resource outcomes, and the existing partial-capture note. Checks: `npm run lint` (`tsc --noEmit`) clean; `npm run build` passes. A browser run with a partial provider failure was not performed; backend fixture coverage verifies the API contract. |
| 2026-10-17 | T-009 (cancelled capture partial totals) | IN_PROGRESS | Projects → Logs keeps the cancelled status visible and shows any stored partial event totals and per-resource outcomes supplied by the API. `npm run lint` (`tsc --noEmit`) clean; browser interaction not performed. |
| 2026-10-17 | TRACE Bot panel | Panel built per the prototype: Chat/History, thinking block listing the real graph queries, streamed answer with citation chips and source list, copy/regenerate/rating, follow-ups, suggestions, context badges. Talks to `POST /bot/chat` (API answers from the Neo4j evidence graph); history is browser-only. Investigate page sets the bot focus, `Ask about this` opens the bot, in-page Q&A card removed. Checks: `tsc --noEmit` clean, `next build` ok, API call verified live. Limits: chips for tickets/runs/deploys open no viewer (log and code chips do). |

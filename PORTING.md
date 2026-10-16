# trace-web porting log

Source of truth: `D:\Trace\Plan's And Artifacts\Artifacts\index.html` (the prototype), plus `Plans/TRACE/*`.
Rules taken from the plans: Next.js + TypeScript + Tailwind (no preflight, prototype CSS is global), real routes
(no hash routing), auth behind an interface (no localStorage session), responsive thresholds 1260/1180/1100/900/640.

**Connector scope (user decision): only GitHub (code), Vercel (hosting) and Supabase (database/backend add-on) are supported.** Everything else in the
prototype catalog (AWS, Azure, GCP, GitLab, Bitbucket, Azure DevOps, databases, migration tools, CI tools, OTel, Jira,
ServiceNow, Railway) is removed from catalogs, wizards, landing marquee and copy. Sample incident data that
named those providers was reworded to Vercel runtime logs / GitHub diffs; change tickets use GitHub Issues.

## The prototype is layered
Later definitions override earlier ones (V3…V17). Final behaviour is the *last* definition: router `route()` (~3095)
wrapped by `_route12` (~3454), nav `NAV7` (~3449). The earlier Overview / Incidents / Knowledge / Organization / Logs /
Topology pages are superseded (PRD D-10) and are not ported as routes.

## Status
- [x] scaffold (next 16, react 19, tailwind 4 without preflight, d3), prototype CSS carried over verbatim
- [x] data layer (typed fixtures in `src/data`, connectors reduced to GitHub + Vercel)
- [x] shell: sidebar (collapse + mobile drawer), crumbs, project switch, command palette, toast/overlay, theme
- [x] auth: login/signup, demo session cookie + `proxy.ts` deep-link return (replace with Supabase Auth, T-003)
- [x] landing: pinned hero, live product preview from the real screens, capabilities, integrations, CTA
- [x] home · tickets · investigate (list, project, run with impact/timeline/hypotheses/evidence) · changes & PRs · observability
- [x] projects: list, connectors sheet, GitHub + Vercel connection forms (verify/save/edit/replace/disconnect),
      CI/CD, databases, log scope, logs console, code import + graph generation, architecture (map / d3 code graph / ERD), team, new-project wizard
- [x] settings: environment rules, approvers, credentials, members, roles, audit, preferences, notifications
- [x] TRACE Bot: streamed thinking + cited answers, sources, follow-ups, history, PR-update diff card
- [x] browser checks at 1440 / 390 (see README); flows exercised with Playwright (login deep link, approvals, tickets, bot, connectors, wizard, graph, settings)
- [ ] formal 1024 / 768 / 320 screenshot pass and keyboard / reduced-motion audit (T-004 acceptance)
- [ ] replace sample data with generated API types (T-002), Supabase Auth (T-003), TanStack Query layer

## Deliberate differences from the prototype
- Ticket assignment only assigns; the new **Investigate** button starts a run (PRD R-004 / D-01).
- Social sign-in buttons are shown but disabled (PRD R-001); GitHub Enterprise Server option is shown but gated (PRD R-016);
  "include docs in graph" is shown but disabled (PRD R-017).
- Connection checks, imports and graph builds are sample timers and say so on screen; real ones need the backend (T-006/T-007).
- "Approve as <person>" and "Mark as merged" stay as labelled demo controls so the approval/recovery flow can be shown.
- Fixed prototype bugs: "Expand hidden lines" now expands the whole hidden block; editing an already-installed connection no
  longer asks to install the app again.

## 2026-10-17: mock data removed, real API wired (user decision)
- Deleted `src/data/*` (except brand logos), the demo login (`proxy.ts`, `/api/demo-session`, auth pages), Settings, Investigate/Changes/Observability
  screens, code/architecture graph screens, sample sidebar widgets (away feed, usage meter, on-call) and the landing page's sample product preview.
- Wired to trace-api: Projects list/detail (Connectors, Code, Log scope, Team), the new-project wizard (draft saved server-side, resumable),
  GitHub connect (redirect to GitHub, return to the wizard), Vercel token connect with real staged checks, Tickets (server-side views, search, filters,
  sort, paging, new ticket, PulseLab export import, assign, resolve), Home (ticket and project counts only), command palette search, project switcher,
  nav badge (tickets needing a project).
- "Not available yet" states (no sample rows): Investigate, Changes & PRs, Observability, Architecture and Logs tabs, TRACE Bot, Home sections for runs/changes.
- Known gaps: filters are component state, not yet in the URL; service/path mappings UI not built (API exists); types are hand-written in
  `src/lib/types.ts` until generated from `trace-api/docs/openapi.json`; `next build` was not run because another session's dev server owns `.next`.
  Another session also edits this repo (graph pages, `src/lib/api.ts` graph types); `src/lib/call.ts` wraps its `api()`.

## 2026-10-17: Architecture tab (System map, Database) on real data
- System map: built by `GET /projects/{id}/system-map` from configured structure (services, environments, log scope, repository mappings) and provider
  metadata (deployments with commit SHA). Edges are labelled configured / provider metadata; unknown links are listed under "Not known yet", never drawn.
- Database: schema metadata read from a Postgres the user connects on the Connectors tab (read-only session, no rows). It moves to graph-derived schema later.
- Code graph (other session's `CodeGraph`) is kept as the middle view.


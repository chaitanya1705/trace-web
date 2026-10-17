# trace-web

Web frontend for **TRACE**, the incident investigation and change-impact workspace. This repository is a
Next.js port of the HTML prototype, built to the TRACE plans in `TRACE/` (PRD, architecture, ontology, tasks) as amended by
`../trace-api/docs/PLAN.md`.

> The workspace reads the real `trace-api` (see `src/lib/call.ts`, `src/lib/useApi.tsx`). There is no sample data in the workspace: screens whose
> API does not exist yet show a "not available yet" state. The public landing page has illustrated product screens that are labelled as sample data.
> See `PORTING.md` for decisions and `task.md` for status.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run lint       # type-check (tsc --noEmit)
```

Open `/` and choose **Open workspace**. There is no login: the API runs with `AUTH_MODE=off` (`NEXT_PUBLIC_API_URL`, default
`http://localhost:8000`). Start it from `trace-api` with `python -m app.serve`, and the worker with `python -m app.worker_main` (connection checks, graph
builds and log capture run there).

## Scope

- **Connectors: GitHub (code) and Vercel (hosting).** Plus an app log source and an optional read-only Postgres schema connection. Settings is dropped for now.
- Navigation: Home, Tickets, Investigate, Changes & PRs, Observability, Projects.
- Real routes, no hash routing:

| Route | Screen |
|---|---|
| `/` | Landing (pinned hero, live product preview, capabilities, integrations) |
| `/home` | Real ticket and project counts, needs-you queue; runs and changes show "not available yet" |
| `/tickets` | Org-wide inbox; assign a project, then **Investigate** (assignment never starts a run) |
| `/investigate`, `/investigate/<project>/<run>` | Run list, step trace, evidence, ask a question about a run |
| `/changes`, `/changes/<id>` | Not available yet (honest placeholder) |
| `/observability`, `/observability/<id>` | Not available yet (honest placeholder) |
| `/projects`, `/projects/<id>/<tab>`, `/projects/new/<step>` | Connectors, code (repositories, services, mappings, graph), log scope, architecture (map / code graph / database), logs, team, setup wizard (Basics, Hosting, Log scope, Code, Review) |

The command palette (Ctrl K) searches real tickets and projects. The TRACE Bot panel is a placeholder until the bot is built.

## Layout

```
src/app/            routes ((public), (workspace)), globals.css (prototype design system, verbatim), responsive.css (layout fixes)
src/components/     ui/ charts/ shell/ bot/
src/features/       home tickets investigate projects landing
src/data/           brand logos only (no sample data)
src/lib/            API client (api, call, useApi), UI state, theme, utilities
```

## Responsive behaviour

Prototype thresholds are kept (≈1260 / 1180 / 1100 / 900 / 640 px): the sidebar becomes a drawer at 900 px, tables scroll
locally, the landing page switches from the pinned hero to a stacked layout. Checked at 1440, 1024, 768, 390 and 320 px.

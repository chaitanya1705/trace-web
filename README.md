# trace-web

Web frontend for **TRACE**, the incident investigation and change-impact workspace. This repository is a
Next.js port of the HTML prototype (`Plan's And Artifacts/Artifacts/index.html`), built to the TRACE plans in
`Plan's And Artifacts/Plans/TRACE/` (PRD, architecture, ontology, tasks).

> Everything shown in the workspace is **sample data** (`src/data`). The backend, Supabase Auth, Neo4j and the
> provider adapters are separate work (see `PORTING.md` and the plan's tasks T-002 … T-024).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run lint       # type-check (tsc --noEmit)
```

Open `/`, choose **Sign in**, and use any valid email plus an 8+ character password. The session is a demo
cookie (`/api/demo-session`, gated by `src/proxy.ts`); it is a stand-in for Supabase Auth and is flagged as such in code.

## Scope

- **Connectors: GitHub (code), Vercel (where it runs) and Supabase (database/backend add-on, logs only).** Everything else in the prototype catalog was removed.
- Navigation: Home · Tickets · Investigate · Changes & PRs · Observability · Projects; Settings in the toolbar.
- Real routes, no hash routing:

| Route | Screen |
|---|---|
| `/` | Landing (pinned hero, live product preview, capabilities, integrations) |
| `/login`, `/signup` | Authentication |
| `/home` | Needs-you queue, active runs, projects, recent changes |
| `/tickets` | Org-wide inbox; assign a project, then **Investigate** (assignment never starts a run) |
| `/investigate`, `/investigate/p/<project>`, `/investigate/<id>` | Project list, project incidents, streamed run with impact / timeline / hypotheses / evidence |
| `/changes`, `/changes/<id>` | Proposed fixes, diff, blast radius, approvals, freeze windows, draft PR |
| `/observability`, `/observability/analytics`, `/observability/<id>` | Post-merge recovery, analytics |
| `/projects`, `/projects/<id>/<tab>`, `/projects/new/<step>` | Connectors, code import + graph, log scope, architecture (map / code graph / database), logs, team, wizard |
| `/settings/<section>` | Environment rules, approvers, credentials, members, roles, audit, preferences, notifications |

The TRACE Bot panel (chat, history, streamed cited answers, PR-update cards) and the command palette (Ctrl K) are
available on every workspace screen.

## Layout

```
src/app/            routes ((public), (auth), (workspace)), globals.css (prototype design system, verbatim)
src/components/     ui/ charts/ graph/ shell/ bot/ evidence/ auth/
src/features/       home tickets investigate changes observability projects settings landing
src/data/           typed sample fixtures (labelled; never production data)
src/lib/            store, state, bot engine, theme, utilities
```

## Responsive behaviour

Prototype thresholds are kept (≈1260 / 1180 / 1100 / 900 / 640 px): the sidebar becomes a drawer at 900 px, tables scroll
locally, the landing page switches from the pinned hero to a stacked layout. Checked at 1440, 1024, 768, 390 and 320 px.

# trace-web: instructions for Claude

Next.js frontend for TRACE. Read `README.md`, `PORTING.md` and `task.md` (the web half of the backlog) first. The authoritative plans are in the
API repo (`../trace-api/`): `docs/PLAN.md` (user decisions that override the spec), `task.md`, `docs/WEB_INTEGRATION.md` (screen to endpoint map)
and the original spec package in `TRACE/` (`Context.md`, `PRD.md`, `architecture.md`, `ontology.md`; a copy is in `TRACE/` here). The workspace
wave plan is `../.omc/plans/trace-completion.md`. Only **GitHub (code) and Vercel (hosting)** connectors are supported (plus the generic app-log source);
Supabase is excluded and Settings is dropped (PLAN.md section 1).

## Tools to use
- **Code review:** before calling a task done, run the `/code-review` skill (add `--fix` to apply findings) on the changed files.
- **Playwright:** verify UI changes in a real browser rather than by reading code. Check 1440, 1024, 768, 390 and 320 px and
  confirm there is no page-wide horizontal overflow. Use the Playwright plugin or MCP if it is installed; otherwise use
  `playwright-core` with `channel: 'chrome'` from a scratch folder outside the repo. In Git Bash, prefix URL-path arguments with `MSYS_NO_PATHCONV=1`.
- **Architecture:** check new work against `architecture.md` (layer boundaries, route layout, UI state ownership) and use an
  architecture/planning plugin or agent if one is installed. Record any decision that departs from the plans in `PORTING.md`.

If a plugin above is not installed, say so and use the fallback named here instead of skipping the check.

## Rules
- Run `npx tsc --noEmit` and `npx next build` before finishing.
- **No mock data.** Screens read the real API (`src/lib/useApi.tsx` over `src/lib/call.ts`); screens whose API does not exist show an honest "not available yet" state (`components/ui/States.tsx`). `src/data` holds only brand logos. Never add sample rows.
- **No login.** The backend runs with AUTH_MODE=off; the app calls it with no token. See `trace-api/docs/WEB_INTEGRATION.md` for the screen-to-endpoint map.
- No credentials in the repo or browser storage.
- Keep the prototype's design system (`src/app/globals.css`) as is; put layout fixes in `src/app/responsive.css`.

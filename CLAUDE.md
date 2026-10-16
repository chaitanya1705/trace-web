# trace-web: instructions for Claude

Next.js frontend for TRACE. Read `README.md`, `PORTING.md` and the plans in `D:\Trace\Plan's And Artifacts\Plans\TRACE\` first
(`Context.md`, `PRD.md`, `architecture.md`, `tasks.md`). Only GitHub, Vercel and Supabase connectors are supported for now.

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

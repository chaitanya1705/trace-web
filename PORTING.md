# trace-web porting log

Source of truth: `D:\Trace\Plan's And Artifacts\Artifacts\index.html` (the prototype), plus `Plans/TRACE/*`.
Rules taken from the plans: Next.js + TypeScript + Tailwind (no preflight, prototype CSS is global), real routes
(no hash routing), auth behind an interface (no localStorage session), responsive thresholds 1260/1180/1100/900/640.

**Connector scope (user decision): only GitHub (code) and Vercel (hosting) are supported.** Everything else
in the prototype catalog (AWS, Azure, GCP, GitLab, Bitbucket, Azure DevOps, databases, migration tools,
CI tools, OTel, Jira, ServiceNow, Railway, Supabase) is removed from catalogs, wizards, landing marquee and copy.

## Prototype is layered
Later definitions override earlier ones (V3…V17). The final behaviour is the *last* definition. Live router is
`route()` at ~3095 wrapped by `_route12` (~3454); nav is `NAV7` (~3449). Earlier Overview/Incidents/Knowledge/
Organization/Logs/Topology top-level pages are superseded (PRD D-10).

## Status
- [x] scaffold (next 16, react 19, tailwind 4 without preflight, d3)
- [x] globals.css (verbatim prototype css)
- [x] IconSprite / Icon
- [ ] data layer
- [ ] shell (sidebar, topbar, crumbs, project switcher, bot panel, command palette, layer/toast)
- [ ] auth (login/signup + demo session + proxy)
- [ ] landing
- [ ] home
- [ ] tickets
- [ ] investigate (list, project, run, side panels, human checks)
- [ ] changes & PRs (+ fix detail, governance)
- [ ] observability (+ analytics, detail)
- [ ] projects (list, detail tabs, connectors, code, architecture graph, new-project wizard)
- [ ] settings (rules, approvers, members, credentials, prefs)
- [ ] TRACE Bot (history, patch cards)
- [ ] responsive pass (1440/1024/768/390/320) + screenshots

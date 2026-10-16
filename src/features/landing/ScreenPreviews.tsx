import type { ReactNode } from "react";
import { Badge, Chip, EnvBadge, SevBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Kpis } from "@/components/ui/Kpis";
import { PageHead } from "@/components/ui/PageHead";

/**
 * ILLUSTRATIONS for the public landing page only. Every name, number and log line below is invented sample content,
 * and the frame says so ("Sample data"). Nothing here is imported by the workspace, and none of it is real evidence.
 */

const Card = ({ children, title }: { children: ReactNode; title?: string }) => (
  <div className="card">
    {title ? <h3 className="ct" style={{ marginBottom: 8 }}>{title}</h3> : null}
    {children}
  </div>
);

function TicketsPreview() {
  const rows: Array<[string, string, string, string, string, ReactNode, string]> = [
    ["Checkout receipts differ from the calculated price", "TKT-12 · POST /api/checkout", "ShopFlow", "production", "SEV-2", <Badge key="a" c="warn">Open</Badge>, "9 min ago"],
    ["Login latency spike after 22:00", "TKT-11 · auth-api", "", "production", "SEV-2", <Badge key="b" c="warn">New</Badge>, "23 min ago"],
    ["Webhook deliveries failing intermittently", "TKT-10 · webhook-receiver", "", "production", "SEV-3", <Badge key="c" c="warn">New</Badge>, "41 min ago"],
    ["Staging redirect loop after release candidate", "TKT-9 · web-storefront", "ShopFlow", "staging", "SEV-3", <Badge key="d" c="good">Resolved</Badge>, "2 h ago"],
  ];
  return (
    <div className="page">
      <PageHead title="Tickets" lede="Every incident that comes in. Assign each ticket to a project, then choose Investigate." chips={<Chip d="a">2 without a project</Chip>} />
      <Kpis items={[["Need a project", 2, "assign, then investigate"], ["Open", 3, ""], ["Resolved or closed", 1, ""], ["All tickets", 4, ""]]} />
      <div className="card pad0" style={{ marginTop: 16 }}>
        <div className="scroll-x">
          <table className="tbl">
            <thead><tr><th>Ticket</th><th>Project</th><th>Environment</th><th>Severity</th><th>Status</th><th>Opened</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[1]}>
                  <td><div style={{ fontWeight: 500 }}>{r[0]}</div><div className="xs muted mono">{r[1]}</div></td>
                  <td>{r[2] ? <span className="sm">{r[2]}</span> : <span className="btn sm" style={{ pointerEvents: "none" }}>Assign to project…</span>}</td>
                  <td><EnvBadge e={r[3]} /></td>
                  <td><SevBadge s={r[4]} /></td>
                  <td>{r[5]}</td>
                  <td className="sm ink2">{r[6]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const STEPS: Array<{ ic: string; tool: string; title: string; body: ReactNode; wait?: boolean }> = [
  { ic: "eye", tool: "plan", title: "Set the scope", body: <div className="tres sm">Checkout service in production, the 30 minutes around the ticket.</div> },
  { ic: "search", tool: "query_logs", title: "Count errors per minute", body: (
    <>
      <div className="tq"><pre className="tqp">{"level:error service:checkout\n| summarize errors = count() by minute"}</pre><div className="xs muted" style={{ padding: "6px 10px" }}>35 rows · 38 MB scanned · cap 500</div></div>
      <div className="tres sm">Errors rise from 2 per minute to 186 per minute at 12:04.</div>
    </>
  ) },
  { ic: "commit", tool: "list_deploys", title: "Find deployments in the window", body: <div className="tres sm">One deployment at 11:58, commit a3f9c1e. Nothing else changed.</div> },
  { ic: "code", tool: "read_diff", title: "Read what the deployment changed", body: <div className="tres sm">The provider timeout was lowered from 2000 ms to 800 ms.</div> },
  { ic: "users", tool: "ask_user", title: "Ask about the connection pool", wait: true, body: <div className="sm">What is the cache client pool size in production?<div className="row wrapr" style={{ gap: 6, marginTop: 8 }}><span className="btn sm">1–20</span><span className="btn sm">21–50</span><span className="btn sm ghost">I don&apos;t know</span></div></div> },
];

function InvestigatePreview() {
  return (
    <div className="page">
      <PageHead title="Payment authorizations failing at checkout" chips={<><Badge c="crit">SEV-2</Badge><EnvBadge e="production" /><Chip>5 steps</Chip><Badge c="good">Finding: Supported</Badge></>} />
      <div className="invgrid">
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Investigation steps</div>
          <div className="trace">
            {STEPS.map((s) => (
              <div key={s.tool} className={`tstep${s.wait ? " wait" : ""}`}>
                <div className="tdot"><Icon n={s.ic} c="sm" /></div>
                <div className="tcd">
                  <div className="thd" style={{ cursor: "default" }}><span className="mono xs tname">{s.tool}</span><span className="ttl">{s.title}</span><span className="sp1" />{s.wait ? <Badge c="warn">Waiting on you</Badge> : null}</div>
                  <div className="tbd">{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="stack">
          <div className="card callout vio"><div className="eyebrow">Current finding</div><div style={{ fontWeight: 500, marginTop: 6, lineHeight: 1.45 }}>The timeout change is the best-supported cause. Provider latency did not change, and failures cluster at the new limit.</div></div>
          <Card title="Hypotheses">
            {[["H1", "Timeout lowered to 800 ms", "supported", "good"], ["H2", "Provider latency degraded", "contradicted", "crit"], ["H3", "Connection pool exhausted", "plausible", "warn"]].map((h) => (
              <div key={h[0]} className="row" style={{ justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--line)" }}><span className="sm"><span className="mono xs muted">{h[0]}</span> {h[1]}</span><Badge c={h[3]}>{h[2]}</Badge></div>
            ))}
          </Card>
          <Card title="Do the logs cover this?">
            {[["Error pattern and timing", "good", "✓"], ["Stack trace to code", "good", "✓"], ["Pool saturation metrics", "crit", "×"]].map((c) => (
              <div key={c[0]} className="chk"><span className={`badge b-${c[1]}`} style={{ minWidth: 24, justifyContent: "center" }}>{c[2]}</span><span style={{ flex: 1, fontSize: 13 }}>{c[0]}</span></div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ChangesPreview() {
  const lines: Array<[string, string]> = [["", "paygate:"], ["", "  base_url: https://api.provider.example"], ["del", "  timeout_ms: 800"], ["add", "  timeout_ms: 2000"], ["", "  retries: 1"]];
  return (
    <div className="page">
      <PageHead title="Restore the provider timeout to 2000 ms" chips={<><Badge c="warn">Proposed</Badge><EnvBadge e="production" /><Badge c="good">Low risk</Badge></>} />
      <div className="grid g-side">
        <div className="stack">
          <Card title="Why this change"><p className="sm ink2" style={{ margin: 0 }}>The last deployment lowered the provider timeout to 800 ms. About a third of provider calls take longer, so they are aborted. Provider latency did not change.</p></Card>
          <Card title="Proposed code change">
            <div className="mono" style={{ fontSize: 12.5, border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "6px 10px", background: "var(--bg2)" }}>config/payment.yaml</div>
              {lines.map((l, i) => (
                <div key={i} style={{ padding: "2px 10px", whiteSpace: "pre", background: l[0] === "add" ? "color-mix(in srgb,var(--good) 14%,transparent)" : l[0] === "del" ? "color-mix(in srgb,var(--crit) 14%,transparent)" : undefined }}>{l[0] === "add" ? "+" : l[0] === "del" ? "−" : " "} {l[1]}</div>
              ))}
            </div>
          </Card>
        </div>
        <div className="stack">
          <Card title="Approval">
            <p className="cs" style={{ marginBottom: 10 }}>Rule for production: two independent reviewers · ticket required</p>
            {["Reviewer A", "Reviewer B"].map((n) => <div key={n} className="chk"><span className="av" style={{ width: 26, height: 26, fontSize: 11 }}>{n.slice(-1)}</span><span style={{ flex: 1 }}>{n}</span><span className="xs muted">Waiting</span></div>)}
            <div className="xs muted" style={{ marginTop: 8 }}>The investigator cannot approve their own proposal. After approval TRACE opens a draft pull request.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ObservabilityPreview() {
  const rows: Array<[string, string, string, string, ReactNode]> = [
    ["Restore the provider timeout", "production", "Today 12:41", "340 → 4", <Badge key="a" c="good">Recovered</Badge>],
    ["Add backoff to webhook retry", "production", "Yesterday", "310 → 305", <Badge key="b" c="crit">Regressed</Badge>],
    ["Fix redirect loop", "staging", "2 d ago", "88 → 0", <Badge key="c" c="good">Recovered</Badge>],
  ];
  return (
    <div className="page">
      <PageHead title="Observability" lede="After a change is merged and deployed, TRACE keeps reading the same logs to confirm the system recovered." />
      <Kpis items={[["Watching", 0, "waiting for traffic"], ["Recovered", 2, ""], ["Regressed", 1, "needs a look"]]} />
      <div className="card pad0" style={{ marginTop: 16 }}>
        <table className="tbl">
          <thead><tr><th>Change</th><th>Environment</th><th>Deployed</th><th>Errors per hour, before → after</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r[0]}><td><b>{r[0]}</b></td><td><EnvBadge e={r[1]} /></td><td className="sm">{r[2]}</td><td className="tnum">{r[3]}</td><td>{r[4]}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="xs muted" style={{ marginTop: 10 }}>A merge alone never counts as recovery: TRACE waits for the deployment and enough traffic.</p>
    </div>
  );
}

function ProjectsPreview() {
  const rows: Array<[string, string, string, string[]]> = [
    ["ShopFlow", "Vercel", "GitHub", ["Basics ✓", "Hosting ✓", "Log scope !", "Code ✓", "Code graph ✓"]],
    ["Accounts", "Vercel", "GitHub", ["Basics ✓", "Hosting ✓", "Log scope ✓", "Code ✓", "Code graph !"]],
  ];
  return (
    <div className="page">
      <PageHead title="Projects" lede="A project is one system: where it runs, where its code lives, and which logs belong to it." chips={<Chip d="v">2 projects</Chip>} />
      <div className="card pad0">
        <table className="tbl">
          <thead><tr><th>Project</th><th>Host</th><th>Code</th><th>Readiness</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r[0]}><td><b>{r[0]}</b></td><td className="sm">{r[1]}</td><td className="sm">{r[2]}</td>
              <td><span className="row wrapr" style={{ gap: 4 }}>{r[3].map((b) => <Badge key={b} c={b.endsWith("✓") ? "good" : "warn"}>{b}</Badge>)}</span></td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="callout sm" style={{ marginTop: 14 }}>Readiness is shown per capability: a project can have code indexed before its logs are connected.</div>
    </div>
  );
}

/** One illustrated screen per landing tab. */
export function ScreenPreview({ k }: { k: string }) {
  return (
    <div className="page-host">
      {k === "tickets" ? <TicketsPreview /> : k === "investigate" ? <InvestigatePreview /> : k === "changes" ? <ChangesPreview /> : k === "observability" ? <ObservabilityPreview /> : <ProjectsPreview />}
    </div>
  );
}

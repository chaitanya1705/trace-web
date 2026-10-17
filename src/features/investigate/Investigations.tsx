"use client";
import Link from "next/link";
import { useState } from "react";
import { S } from "@/lib/state";
import { useStore } from "@/lib/store";
import { useApi } from "@/lib/useApi";
import { Badge, Chip, EnvBadge, FindingBadge, SevBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { PageHead } from "@/components/ui/PageHead";
import { Empty, ErrorState, Loading } from "@/components/ui/States";
import { FINDING, STEP_TITLE, ago, type RunRow } from "./types";

const active = (r: RunRow) => r.status === "queued" || r.status === "running";

/** All investigations the person can see. Each one is a run over the project's evidence graph; open one to watch the steps. */
export function Investigations() {
  useStore();
  const res = useApi<RunRow[]>("/investigations", (d) => (d.some(active) ? 2000 : false));
  const [view, setView] = useState<"act" | "all">("all");
  const [q, setQ] = useState("");
  const rows = (res.data || []).filter((r) => (S.proj === "All" || r.project_id === S.proj) && (view === "all" || active(r)) && (r.title + (r.ticket_display_id || "") + (r.project_name || "")).toLowerCase().includes(q.toLowerCase()));
  const scoped = (res.data || []).filter((r) => S.proj === "All" || r.project_id === S.proj);
  const running = scoped.filter(active).length;

  return (
    <div className="page">
      <PageHead
        title="Investigate"
        lede="Each investigation is TRACE working through the logs and the code, one visible step at a time. Start one from a ticket: it is always an explicit action."
        chips={<Chip d={running ? "r pulse" : "g"}>{running ? `${running} running` : "None running"}</Chip>}
        right={<Link className="btn pri" href="/tickets"><Icon n="alert" />Open tickets</Link>}
      />
      {res.error ? <ErrorState error={res.error} onRetry={res.reload} /> : null}
      <div className="tbox2" style={{ marginTop: 16 }}>
        <div className="tb-views">
          <div className="seg">
            <button className={view === "act" ? "on" : ""} onClick={() => setView("act")}>Active <span className="n">{running}</span></button>
            <button className={view === "all" ? "on" : ""} onClick={() => setView("all")}>All <span className="n">{scoped.length}</span></button>
          </div>
        </div>
        <div className="tb-bar">
          <div className="tb-search">
            <Icon n="search" c="sm" />
            <input type="search" placeholder="Search investigations" aria-label="Search investigations" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="tb-body">
          {res.loading && !res.data ? <div style={{ padding: 16 }}><Loading label="Loading investigations" /></div> : null}
          {res.data && !rows.length ? (
            <div style={{ padding: 16 }}>
              <Empty title={res.data.length ? "Nothing matches" : "No investigations yet"} lede={res.data.length ? "Clear the search or switch to All." : "Open a ticket that belongs to a project and choose Investigate. TRACE never starts one by itself."}
                action={<Link className="btn" href="/tickets">Go to Tickets</Link>} />
            </div>
          ) : null}
          {rows.length ? (
            <div className="scroll-x">
              <table className="tbl hov">
                <thead><tr><th>Investigation</th><th>Project</th><th>Environment</th><th>Status</th><th>Steps</th><th>Latest step</th><th>Finding</th><th>Started</th></tr></thead>
                <tbody>
                  {rows.map((r, i) => {
                    const f = r.finding_status ? FINDING[r.finding_status] || ["ins", r.finding_status] : null;
                    return (
                      <tr key={r.id} className="click trow" style={{ ["--i" as string]: Math.min(i, 12) }}>
                        <td>
                          <Link href={`/investigate/${r.project_id}/${r.control_run_id}`} style={{ color: "inherit", textDecoration: "none" }}>
                            <div style={{ fontWeight: 500 }}>{r.title}</div>
                            <div className="xs muted mono">{r.ticket_display_id} · {r.control_run_id.slice(0, 8)}</div>
                          </Link>
                        </td>
                        <td><span className="sm">{r.project_name}</span></td>
                        <td>{r.environment_key ? <EnvBadge e={r.environment_key} /> : <span className="muted sm">Unknown</span>}{r.severity ? <> <SevBadge s={r.severity} /></> : null}</td>
                        <td><Badge c={r.status === "completed" ? "mute" : r.status === "failed" ? "crit" : "vio"}>{r.status === "completed" ? "Concluded" : r.status === "failed" ? "Failed" : r.status === "queued" ? "Queued" : "Running"}</Badge></td>
                        <td className="tnum">{r.steps}</td>
                        <td><span className="sm ink2">{r.last_step ? STEP_TITLE[r.last_step]?.[0] || r.last_step : "–"}</span></td>
                        <td>{f ? <FindingBadge cls={f[0]} label={f[1]} /> : <span className="muted sm">–</span>}</td>
                        <td><span className="sm ink2 tnum">{ago(r.created_at)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { Badge, Chip, EnvBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Kpis } from "@/components/ui/Kpis";
import { PageHead } from "@/components/ui/PageHead";
import { Empty, ErrorState, Loading } from "@/components/ui/States";
import { RISK, STATUS, type ChangeRow } from "./types";

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

/** Fixes that investigations propose. Each is a diff with a hash; approving binds to that hash. TRACE never applies one. */
export function Changes() {
  const res = useApi<ChangeRow[]>("/changes");
  const [view, setView] = useState<"need" | "prog" | "all">("need");
  const [q, setQ] = useState("");
  const all = res.data || [];
  const n = (f: (c: ChangeRow) => boolean) => all.filter(f).length;
  const rows = all.filter(
    (c) =>
      (view === "all" || (view === "need" ? c.status === "proposed" : ["approved", "draft_pr_opened"].includes(c.status))) &&
      (c.title + c.display_id + c.project_name).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="page">
      <PageHead
        title="Changes & PRs"
        lede="Fixes that investigations propose. Each one needs approval from someone other than its author. TRACE never applies a change: download the patch, or open a draft PR once a write connection is authorized."
        chips={<><Chip d="a">{n((c) => c.status === "proposed")} waiting for approval</Chip><Chip d="v">Nothing is applied automatically</Chip></>}
      />
      <Kpis items={[["Waiting for approval", n((c) => c.status === "proposed"), ""], ["Approved", n((c) => c.status === "approved"), "ready to apply"], ["Rejected or withdrawn", n((c) => ["rejected", "withdrawn"].includes(c.status)), ""], ["All changes", all.length, ""]]} />
      {res.error ? <ErrorState error={res.error} onRetry={res.reload} /> : null}
      <div className="tbox2" style={{ marginTop: 16 }}>
        <div className="tb-views">
          <div className="seg">
            <button className={view === "need" ? "on" : ""} onClick={() => setView("need")}>Needs approval <span className="n">{n((c) => c.status === "proposed")}</span></button>
            <button className={view === "prog" ? "on" : ""} onClick={() => setView("prog")}>Approved</button>
            <button className={view === "all" ? "on" : ""} onClick={() => setView("all")}>All <span className="n">{all.length}</span></button>
          </div>
        </div>
        <div className="tb-bar">
          <div className="tb-search"><Icon n="search" c="sm" /><input type="search" placeholder="Search changes" aria-label="Search changes" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        <div className="tb-body">
          {res.loading && !res.data ? <div style={{ padding: 16 }}><Loading label="Loading changes" /></div> : null}
          {res.data && !rows.length ? (
            <div style={{ padding: 16 }}>
              <Empty
                title={all.length ? "Nothing here" : "No changes yet"}
                lede={all.length ? "Switch to All to see every change." : "Open a finished investigation that identified a root cause and choose Propose a change."}
                action={<Link className="btn" href="/investigate">Go to Investigate</Link>}
              />
            </div>
          ) : null}
          {rows.length ? (
            <div className="scroll-x">
              <table className="tbl hov">
                <thead><tr><th>Change</th><th>Project</th><th>Environment</th><th>Risk</th><th>Approvals</th><th>Status</th><th>Updated</th></tr></thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="click trow">
                      <td>
                        <Link href={`/changes/${c.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                          <div style={{ fontWeight: 500 }}>{c.title}</div>
                          <div className="xs muted mono">{c.display_id} · v{c.version} · {c.files.join(", ")}</div>
                        </Link>
                      </td>
                      <td className="sm">{c.project_name}</td>
                      <td>{c.environment_key ? <EnvBadge e={c.environment_key} /> : <span className="muted sm">Unknown</span>}</td>
                      <td><Badge c={RISK[c.risk]}>{c.risk[0].toUpperCase() + c.risk.slice(1)}</Badge></td>
                      <td className="tnum">{c.approved} of {c.needed}</td>
                      <td><Badge c={STATUS[c.status]?.[1] || "mute"}>{STATUS[c.status]?.[0] || c.status}</Badge></td>
                      <td className="sm ink2 tnum">{ago(c.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

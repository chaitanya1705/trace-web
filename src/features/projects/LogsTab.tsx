"use client";
import { Fragment, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { call as api } from "@/lib/call";
import type { Job, Project } from "@/lib/types";
import { invalidate, useApi } from "@/lib/useApi";
import { toast } from "@/lib/toast";
import { Badge, EnvBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Empty, ErrorState, Loading } from "@/components/ui/States";
import { AppLogSource } from "./AppLogSource";
import { DrainPanel } from "./DrainPanel";

type Resource = { id: string; name: string; resource_type: string; log_availability: string; availability_note: string | null; last_event_at: string | null; environment_key: string; stored: number };
type Status = {
  resources: Resource[];
  hosting_connection_id: string | null;
  drain: { connection_id: string; secret_configured: boolean; endpoint_url: string; last_batch_at: string | null } | null;
  last_capture: { id: string; status: string; stage: string | null; result_ref: { accepted?: number; duplicates?: number; read?: number; seconds?: number } | null; error: { message: string } | null; created_at: string } | null;
};
type LogRow = { id: string; event_time: string | null; ingested_at: string; level: string | null; source: string | null; service_hint: string | null; message: string; request_id: string | null; status_code: number | null; deployment_id: string | null; environment_key: string | null; extra: Record<string, any>; graph_status: string; provider?: string };

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" }) : "unknown time");
const LEVEL: Record<string, string> = { error: "crit", fatal: "crit", warning: "warn", info: "mute" };

function availBadge(a: string) {
  return a === "available" ? <Badge c="good">Logs received</Badge> : a === "stale" ? <Badge c="warn">Stale</Badge> : a === "none" ? <Badge c="warn">No logs</Badge> : <Badge c="mute">No events yet</Badge>;
}

export function LogsTab({ p }: { p: Project }) {
  const status = useApi<Status>(`/projects/${p.id}/logs/status`, (d) => (d.last_capture && ["queued", "running"].includes(d.last_capture.status) ? 1500 : false));
  const [env, setEnv] = useState("");
  const [level, setLevel] = useState("");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [rid, setRid] = useState("");
  const [range, setRange] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [capSeconds, setCapSeconds] = useState(30);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { setDq(q); setCursors([]); }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const since = range ? new Date(Date.now() - Number(range) * 60000).toISOString() : "";
  const qs = new URLSearchParams({ limit: "25" });
  if (env) qs.set("environment", env);
  if (level) qs.set("level", level);
  if (dq) qs.set("q", dq);
  if (rid.trim()) qs.set("request_id", rid.trim());
  if (since) qs.set("since", since);
  if (cursors.length) qs.set("cursor", cursors[cursors.length - 1]);
  const logs = useApi<LogRow[]>(`/projects/${p.id}/logs?${qs}`, () => (status.data?.last_capture && ["queued", "running"].includes(status.data.last_capture.status) ? 2000 : false));
  const capturing = !!status.data?.last_capture && ["queued", "running"].includes(status.data.last_capture.status);

  const capture = async () => {
    setBusy(true);
    try {
      await api<Job>(`/projects/${p.id}/logs/capture`, { body: { seconds: capSeconds, ...(env ? { environment: env } : {}) } });
      toast(`Capturing logs for ${capSeconds} seconds…`);
      invalidate();
    } catch (e) {
      toast((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  if (status.loading && !status.data) return <Loading />;
  if (status.error) return <ErrorState error={status.error} onRetry={status.reload} />;
  const s = status.data!;
  const cov = logs.meta?.coverage as { stored_total: number; matched: number; empty_dataset: boolean; not_yet_in_graph: number; note: string | null } | undefined;
  const lc = s.last_capture;

  return (
    <div className="stack">
      <p className="cs">Logs TRACE has stored for this project. Search uses TRACE filters on stored events, not provider query syntax. Collecting from the source is a separate, explicit step.</p>

      <AppLogSource p={p} />

      <h3 className="ct" style={{ marginTop: 6 }}>Other sources (Vercel)</h3>
      {!s.hosting_connection_id ? (
        <Empty title="Connect Vercel first" lede="Logs come from the hosting connection. Connect and verify Vercel on the Connectors tab, then choose projects in Log scope." />
      ) : !s.resources.length ? (
        <Empty title="No log scope yet" lede="Choose which Vercel projects belong to each environment on the Log scope tab. TRACE only stores logs from those." />
      ) : (
        <>
          <div className="card pad0">
            <div className="scroll-x">
              <table className="tbl">
                <thead><tr><th>Environment</th><th>Vercel project</th><th>Logs</th><th>Latest event</th><th>Stored</th></tr></thead>
                <tbody>
                  {s.resources.map((r) => (
                    <tr key={r.id}>
                      <td><EnvBadge e={r.environment_key} /></td>
                      <td><b className="mono" style={{ fontSize: 12.5 }}>{r.name}</b></td>
                      <td>{availBadge(r.log_availability)}</td>
                      <td className="sm">{r.last_event_at ? when(r.last_event_at) : <span className="muted">none yet</span>}</td>
                      <td className="tnum">{r.stored.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 className="ct">Fetch from source</h3>
                <p className="cs">Listens to the live runtime logs for a short window and stores what arrives. Read-only. It is partial: Vercel's live stream delivers only some of the lines logged while it runs, and no history. Use the log drain for complete logs.</p>
              </div>
              <span className="row" style={{ gap: 8 }}>
                <select className="input" style={{ width: "auto" }} aria-label="Capture window" value={capSeconds} onChange={(e) => setCapSeconds(+e.target.value)}>
                  {[15, 30, 60].map((n) => <option key={n} value={n}>{n} seconds</option>)}
                </select>
                <button className="btn pri" disabled={busy || capturing} onClick={capture}>
                  <Icon n="play" c="sm" />
                  {capturing ? "Capturing…" : "Capture live"}
                </button>
              </span>
            </div>
            {capturing ? <p className="sm muted" style={{ margin: "10px 0 0" }}>Send some traffic to the app now; new log lines are stored as they arrive.</p> : null}
            {lc && !capturing ? (
              <p className="sm" style={{ margin: "10px 0 0" }}>
                Last capture ({when(lc.created_at)}):{" "}
                {lc.status === "succeeded" ? <>stored <b>{lc.result_ref?.accepted ?? 0}</b> new events ({lc.result_ref?.duplicates ?? 0} already stored). This capture can be incomplete.</> : lc.status === "failed" || lc.status === "dead" ? <span style={{ color: "var(--crit-ink)" }}>failed: {lc.error?.message}</span> : lc.status}
              </p>
            ) : null}
          </div>
          {s.drain ? <DrainPanel connectionId={s.drain.connection_id} /> : null}
        </>
      )}

      <div className="tbox2">
        <div className="tb-bar">
          <div className="tb-search">
            <Icon n="search" c="sm" />
            <input type="search" placeholder="Search message, operation or request id" aria-label="Search logs" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input tb-sel" aria-label="Environment" value={env} onChange={(e) => { setEnv(e.target.value); setCursors([]); }}>
            <option value="">Environment: all</option>
            {p.environments.map((e) => <option key={e.id} value={e.key}>{e.key}</option>)}
          </select>
          <select className="input tb-sel" aria-label="Level" value={level} onChange={(e) => { setLevel(e.target.value); setCursors([]); }}>
            <option value="">Level: all</option>
            {["error", "warning", "info", "fatal"].map((l) => <option key={l}>{l}</option>)}
          </select>
          <select className="input tb-sel" aria-label="Time range" value={range} onChange={(e) => { setRange(e.target.value); setCursors([]); }}>
            <option value="">Any time</option>
            <option value="15">Last 15 min</option>
            <option value="60">Last hour</option>
            <option value="1440">Last 24 hours</option>
          </select>
          <input className="input tb-sel mono" aria-label="Request id" placeholder="Request id" value={rid} onChange={(e) => { setRid(e.target.value); setCursors([]); }} style={{ width: 200 }} />
        </div>
        <div className="tb-body">
          {logs.error ? <div style={{ padding: 12 }}><ErrorState error={logs.error} onRetry={logs.reload} /></div> : null}
          {logs.loading && !logs.data ? <div style={{ padding: 16 }}><Loading /></div> : null}
          {logs.data && !logs.data.length ? (
            <p className="muted" style={{ textAlign: "center", padding: 28 }}>
              {cov?.empty_dataset ? "No logs stored yet. Set up the app log source above, then they appear here. Having none is not the same as healthy." : "Nothing matches these filters."}
            </p>
          ) : null}
          {logs.data?.length ? (
            <div className="scroll-x">
              <table className="tbl hov">
                <thead><tr><th style={{ width: 170 }}>Time</th><th>Level</th><th>Env</th><th>Message</th><th>Request</th></tr></thead>
                <tbody>
                  {logs.data.map((r) => (
                    <Fragment key={r.id}>
                      <tr className="click" onClick={() => setSel(sel === r.id ? null : r.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSel(sel === r.id ? null : r.id)}>
                        <td className="mono xs">{r.event_time ? new Date(r.event_time).toLocaleTimeString() : <span className="muted">unknown</span>}<div className="xs muted">{r.event_time ? new Date(r.event_time).toLocaleDateString() : ""}</div></td>
                        <td>{r.level ? <Badge c={LEVEL[r.level] || "mute"}>{r.level}</Badge> : <span className="muted xs">—</span>}</td>
                        <td className="sm">{r.environment_key || <span className="muted">unmapped</span>}</td>
                        <td><span className="mono xs" style={{ display: "block", maxWidth: 560, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.message}</span><div className="xs muted">{r.service_hint}{r.status_code ? ` · HTTP ${r.status_code}` : ""}{r.provider ? ` · via ${r.provider === "app_push" ? "app" : r.provider === "vercel" ? "Vercel" : r.provider}` : ""}</div></td>
                        <td className="mono xs">{r.request_id ? r.request_id.slice(0, 8) : ""}</td>
                      </tr>
                      {sel === r.id ? (
                        <tr key={r.id + "d"}>
                          <td colSpan={5} style={{ background: "var(--bg2)" }}>
                            <pre className="tqp" style={{ whiteSpace: "pre-wrap", margin: 0 }}>{r.message}</pre>
                            <div className="xs muted mono" style={{ marginTop: 6 }}>
                              {r.deployment_id ? `deployment ${r.deployment_id} · ` : ""}{r.source ? `source ${r.source} · ` : ""}received {when(r.ingested_at)}
                              {r.extra?.source_revision ? ` · revision ${String(r.extra.source_revision).slice(0, 12)}` : ""}
                              {r.request_id ? ` · request ${r.request_id}` : ""}
                            </div>
                            {Object.keys(r.extra || {}).length ? <pre className="tqp xs" style={{ marginTop: 6 }}>{JSON.stringify(r.extra, null, 2)}</pre> : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="pager2">
            <span className="xs muted">{cov ? `${cov.matched.toLocaleString()} matching of ${cov.stored_total.toLocaleString()} stored` : ""}</span>
            <div className="pg">
              <button disabled={!cursors.length} aria-label="Previous page" onClick={() => setCursors((c) => c.slice(0, -1))}>‹</button>
              <button disabled={!logs.meta?.next_cursor} aria-label="Next page" onClick={() => logs.meta?.next_cursor && setCursors((c) => [...c, logs.meta!.next_cursor as string])}>›</button>
            </div>
          </div>
        </div>
      </div>
      {cov?.not_yet_in_graph ? <p className="xs muted">{cov.not_yet_in_graph.toLocaleString()} stored events have not reached the investigation graph yet. The investigator only reads the graph.</p> : null}
    </div>
  );
}

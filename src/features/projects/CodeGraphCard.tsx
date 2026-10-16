"use client";
import Link from "next/link";
import { useState } from "react";
import { ApiError, type IndexRun } from "@/lib/api";
import { call } from "@/lib/call";
import { invalidate, useApi } from "@/lib/useApi";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { ErrorState } from "@/components/ui/States";

const STEPS: Array<[stage: string, label: string, tool: string]> = [
  ["resolving", "Resolving the commit", "resolve"],
  ["downloading", "Downloading the source (read-only)", "fetch"],
  ["extracting", "Unpacking safely", "extract"],
  ["indexing", "Parsing and linking symbols", "index"],
  ["published", "Publishing the build", "publish"],
];
const active = (r: IndexRun) => r.status === "queued" || r.status === "running";

const Tick = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="th-ok"><path d="M20 6L9 17l-5-5" /></svg>
);

/** Code graph card for the Code tab: request indexing, watch real progress, see what was and was not covered. */
export function CodeGraphCard({ projectId, repoCount }: { projectId: string; repoCount: number }) {
  const runs = useApi<IndexRun[]>(`/projects/${projectId}/graph/index`, (r) => (r.some(active) ? 1500 : false));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const list = runs.data || [];
  const running = list.some(active);

  const start = async () => {
    setBusy(true);
    setErr(null);
    try {
      await call(`/projects/${projectId}/graph/index`, { method: "POST", body: {} });
      toast("Indexing started");
      invalidate();
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  const done = list.filter((r) => r.status === "succeeded");
  const totals = done.reduce((a, r) => ({ files: a.files + (r.counts?.files || 0), symbols: a.symbols + (r.counts?.symbols || 0), edges: a.edges + Object.values(r.counts?.edges || {}).reduce((x, y) => x + y, 0) }), { files: 0, symbols: 0, edges: 0 });

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h3 className="ct">Code graph</h3>
          <p className="cs">
            {running ? "Building…" : done.length ? <>Built from {done.length} repositor{done.length > 1 ? "ies" : "y"} · latest commit <span className="mono">{(done[0].commit_sha || "").slice(0, 7)}</span></> : repoCount ? "Generate the graph from the saved repositories." : "Save at least one repository above, then generate the graph."}
          </p>
        </div>
        <span className="row" style={{ gap: 8 }}>
          {done.length ? <Link className="btn sm" href={`/projects/${projectId}/architecture`}><Icon n="network" c="sm" />Open code graph</Link> : null}
          <button className={`btn sm ${done.length ? "" : "pri"}`} disabled={busy || running || !repoCount} onClick={start} title={!repoCount ? "Save a repository first" : undefined}>
            <Icon n={done.length ? "refresh" : "play"} c="sm" />{done.length ? "Regenerate" : "Generate graph"}
          </button>
        </span>
      </div>
      {err ? <div style={{ marginTop: 12 }}><ErrorState error={err} /></div> : null}
      {runs.error ? <div style={{ marginTop: 12 }}><ErrorState error={runs.error} onRetry={runs.reload} /></div> : null}

      {done.length && !running ? (
        <div className="facts" style={{ margin: "12px 0 0" }}>
          {[["Symbols", totals.symbols.toLocaleString()], ["Relationships", totals.edges.toLocaleString()], ["Files", totals.files.toLocaleString()], ["Extractor", done[0].extractor || "—"]].map(([k, v]) => (
            <div key={k}><div className="eyebrow">{k}</div><div className="fv">{v}</div></div>
          ))}
        </div>
      ) : null}

      {list.map((r) => {
        const at = STEPS.findIndex((s) => s[0] === r.stage);
        return (
          <div key={r.id} style={{ marginTop: 12 }}>
            <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span className="mono sm">{r.repository} <span className="muted">@ {r.commit_sha ? r.commit_sha.slice(0, 7) : r.requested_ref}</span></span>
              <Badge c={r.status === "succeeded" ? "good" : r.status === "failed" ? "crit" : "vio"}>{r.status === "succeeded" ? "Published" : r.status === "failed" ? "Failed" : r.status === "queued" ? "Queued" : "Running"}</Badge>
            </div>
            {active(r) ? (
              <div className="cgsteps">
                {STEPS.slice(0, STEPS.length - 1).map(([stage, label, tool], i) => {
                  const state = r.status === "queued" ? "wait" : i < at ? "done" : i === at ? "now" : "wait";
                  return (
                    <div key={stage} className={`cgs ${state === "wait" ? "" : state}`} style={state === "wait" ? { opacity: 0.45 } : undefined}>
                      <span className="cgs-ic">{state === "done" ? <Tick /> : state === "now" ? <span className="th-spin" /> : null}</span>
                      <span className="cgs-t">{label}</span><span className="cgs-tool mono">{tool}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {r.status === "failed" && r.error ? (
              <div className="callout warn sm" style={{ marginTop: 8 }} role="alert">
                <b>{r.error.message}</b>
                <div className="xs muted" style={{ marginTop: 4 }}>{r.error.code}</div>
              </div>
            ) : null}
            {r.status === "succeeded" && r.gaps && Object.keys(r.gaps).length ? (
              <div className="callout sm" style={{ marginTop: 8 }}>
                <b>Coverage gaps.</b>{" "}
                <span className="ink2">{Object.entries(r.gaps).map(([k, n]) => `${n} file${n > 1 ? "s" : ""}: ${k.replace(/_/g, " ")}`).join(" · ")}. These files are not in the graph.</span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Graph settings from the prototype. Only "Code only" is real today; the others say why they are off. */
export function GraphSettingsCard() {
  const rows: Array<[string, string, boolean, string]> = [
    ["Code only", "Parse locally. Nothing is sent to a model.", true, "Always on."],
    ["Rebuild on each deploy", "Keep a graph for every revision that reaches an environment.", false, "Needs deployment ingestion, which is not built yet."],
    ["Include docs and READMEs", "Send documents to the model to extract concepts.", false, "Needs explicit project consent and a tested model path. Not available yet."],
  ];
  return (
    <div className="card">
      <h3 className="ct" style={{ marginBottom: 4 }}>Graph settings</h3>
      {rows.map(([t, d, on, why]) => (
        <div className="srow" style={{ padding: "10px 0" }} key={t}>
          <div><div style={{ fontWeight: 500 }}>{t}</div><div className="xs muted">{d} {on ? "" : why}</div></div>
          <button className={`switch ${on ? "on" : ""}`} aria-label={t} aria-pressed={on} disabled />
        </div>
      ))}
    </div>
  );
}

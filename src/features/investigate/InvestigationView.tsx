"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { askBot, setBotFocus } from "@/lib/bot";
import { call } from "@/lib/call";
import { closeLayer, openLayer } from "@/lib/layer";
import { toast } from "@/lib/toast";
import { invalidate, useApi } from "@/lib/useApi";
import { Badge, Chip, EnvBadge, FindingBadge, HypBadge, SevBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Modal, ModalHead } from "@/components/ui/Modal";
import { Empty, ErrorState, Loading } from "@/components/ui/States";
import { EvidenceGraph } from "./EvidenceGraph";
import { FINDING, STEP_TITLE, hm, type Evidence, type Hyp, type RunDetail, type StepOut, type TimelineEvent, type ToolRun } from "./types";

type Tab = "impact" | "timeline" | "hyp" | "evidence";
const running = (d: RunDetail | null) => !!d && (d.run.status === "running" || d.run.status === "queued");

/** Evidence the run cited. A click opens the exact item: log text, or source lines with the pinned content hash. */
export function openEvidence(id: string, all: Evidence[]) {
  const e = all.find((x) => x.id === id);
  if (!e) return;
  openLayer(
    <Modal label={`Evidence ${e.id}`} width="min(820px,100%)">
      <ModalHead>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{e.type === "code" ? e.title : "Log event"}</b>
          <div className="xs muted mono" style={{ overflowWrap: "anywhere" }}>{e.id}</div>
        </div>
      </ModalHead>
      <div className="mb">
        {e.type === "code" ? (
          <>
            <div className="xs muted" style={{ marginBottom: 8 }}>{e.path} · lines {e.start_line}–{e.end_line} · commit <span className="mono">{(e.commit || "").slice(0, 7)}</span></div>
            <pre className="tqp" style={{ margin: 0, maxHeight: 420, overflow: "auto" }}>
              {(e.content || "").split("\n").map((ln, i) => `${String((e.start_line || 1) + i).padStart(4)} | ${ln}`).join("\n")}
            </pre>
          </>
        ) : (
          <>
            <div className="row wrapr" style={{ gap: 8, marginBottom: 8 }}>
              {e.severity ? <Badge c={e.severity === "error" ? "crit" : e.severity === "warning" ? "warn" : "mute"}>{e.severity}</Badge> : null}
              <span className="xs muted">{e.event_time ? new Date(e.event_time).toLocaleString() : "time unknown"}</span>
              {e.deployment ? <span className="xs mono">{e.deployment}</span> : null}
            </div>
            <pre className="tqp" style={{ margin: 0 }}>{e.content || e.title}</pre>
            {e.request_id ? <div className="xs muted" style={{ marginTop: 8 }}>request <span className="mono">{e.request_id}</span> · {e.route}</div> : null}
          </>
        )}
        <div className="xs muted mono" style={{ marginTop: 10, overflowWrap: "anywhere" }}>sha256 {e.content_hash}</div>
      </div>
    </Modal>,
  );
}

const Ref = ({ id, all }: { id: string; all: Evidence[] }) => {
  const e = all.find((x) => x.id === id);
  return (
    <button className="chip" style={{ cursor: "pointer", marginRight: 4 }} onClick={() => openEvidence(id, all)} title={e?.title}>
      <Icon n={e?.type === "code" ? "code" : "file"} c="sm" />
      {e?.type === "code" ? (e.path || "").split("/").pop() + ":" + e.start_line : e ? hm(e.event_time) : id.slice(0, 8)}
    </button>
  );
};

/* ------------------------------------------------------------------ steps */
function Rows({ rows }: { rows: Array<[string, string | number]> }) {
  return (
    <table className="tbl" style={{ fontSize: 12.5, marginTop: 8 }}>
      <tbody>{rows.map(([k, v], i) => <tr key={i}><td className="mono xs">{k}</td><td className="tnum" style={{ textAlign: "right" }}>{v}</td></tr>)}</tbody>
    </table>
  );
}

function toolRows(t: ToolRun): Array<[string, string | number]> {
  const c = t.coverage;
  if (t.name === "evidence_by_operation") return (c.operations || []).slice(0, 8).map((o: any) => [`${o.severity} · ${o.operation}`, o.events]);
  if (t.name === "deployments_in_window") return (c.deployments || []).map((d: any) => [`${d.provider_id} · ${(d.commit || "unknown").slice(0, 7)}`, hm(d.at)]);
  if (t.name === "code_located_in_window") return (c.symbols || []).slice(0, 8).map((s: any) => [`${s.name} · ${s.path}:${s.start_line}`, `${s.events} events`]);
  if (t.name === "source_text_search") return (c.hits || []).slice(0, 6).map((h: any) => [`${h.path}:${h.start_line}-${h.end_line}`, "match"]);
  if (t.name === "request_observations") return Object.entries(c.statuses || {}).map(([k, v]) => [k, v as number]);
  if (t.name === "changes_into_revision") return (c.changes || []).map((x: any) => [`commit ${x.commit.slice(0, 7)}`, (x.modified || []).join(", ") || "no indexed symbols"]);
  if (t.name === "callers_2hop") return (c.callers || []).map((x: any) => [x.name, x.observed ? "in evidence" : "static caller"]);
  if (t.name === "impact_assessment" || t.name === "write_finding") return [];
  return [];
}

function StepCard({ s, ev, open, toggle, running: isRunning }: { s: StepOut; ev: Evidence[]; open: boolean; toggle: () => void; running: boolean }) {
  const [title, icon] = STEP_TITLE[s.kind] || [s.kind, "spark"];
  const live = s.status === "running";
  return (
    <div className="tstep stag" data-k={s.sequence}>
      <div className="tdot"><Icon n={icon} c="sm" /></div>
      <div className="tcd">
        <button className="thd" onClick={toggle} aria-expanded={open}>
          <span className="mono xs tname">{s.tools[0]?.name || s.kind}</span>
          <span className="ttl">{title}</span>
          <span className="sp1" />
          {live || (isRunning && !s.finished_at) ? <span className="lspin" style={{ width: 12, height: 12, margin: 0, borderWidth: 2 }} /> : <span className="xs muted tnum">{s.duration_s !== null ? `${s.duration_s.toFixed(1)} s` : ""}</span>}
          <span className={`dfc ${open ? "open" : ""}`}><Icon n="chev" c="sm" /></span>
        </button>
        {open ? (
          <div className="tbd">
            {s.tools.map((t, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                {t.template ? (
                  <div className="tq">
                    <div className="tqh"><span className="badge b-vio">graph query</span><span className="mono xs">{t.template}</span><span className="xs muted">fixed template · scoped to this project</span></div>
                    <div className="tqm xs muted">{t.items} item{t.items === 1 ? "" : "s"} retrieved{t.coverage.truncated ? " · truncated at the limit" : ""}</div>
                  </div>
                ) : t.name.startsWith("model:") ? (
                  <div className="xs muted mono" style={{ marginBottom: 6 }}>{t.name} · structured output · citations verified against the retrieval manifest</div>
                ) : null}
                <div className="tres"><Icon n="chev" c="sm" /><span>{t.coverage.summary}</span></div>
                {toolRows(t).length ? <Rows rows={toolRows(t)} /> : null}
                {t.name === "code_located_in_window" || t.name === "source_text_search" ? (
                  <div className="row wrapr tacts" style={{ marginTop: 8 }}>
                    {ev.filter((e) => e.type === "code").slice(0, 4).map((e) => <button key={e.id} className="btn sm" onClick={() => openEvidence(e.id, ev)}><Icon n="panel" c="sm" />View {(e.path || "").split("/").pop()}:{e.start_line}</button>)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ side tabs */
function Impact({ d }: { d: RunDetail }) {
  const cat = (k: string) => d.impact.filter((i) => i.categories.includes(k));
  const groups: Array<[string, string, ReturnType<typeof cat>]> = [
    ["Direct change", "v", cat("direct_exposure")],
    ["May be affected", "a", cat("potential_propagation")],
    ["Failing now", "r", cat("observed_impact")],
  ];
  return (
    <>
      <div className="gwrap" style={{ marginBottom: 12 }}>
        <EvidenceGraph nodes={d.graph.nodes} edges={d.graph.edges} />
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {groups.map(([t, dot, items]) => (
          <div className="card" style={{ padding: "12px 14px" }} key={t}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row"><span className={`dot ${dot}`} /><b className="sm">{t}</b></div>
              <span className="badge b-mute">{items.length}</span>
            </div>
            {items.map((x) => (
              <div className="sm" key={x.target_id} style={{ padding: "6px 0", borderTop: "1px solid var(--line)", marginTop: 6 }}>
                <b>{x.name}</b>
                <div className="ink2">{x.label}{x.scope.via ? ` · via ${x.scope.via}` : ""}{x.evidence.map((id) => <Ref key={id} id={id} all={d.evidence} />)}</div>
              </div>
            ))}
          </div>
        ))}
        <div className="callout sm"><b>Unknown.</b> <span className="ink2">{d.gaps.length ? d.gaps.map((g) => g.description).join(" ") : "No evidence gaps recorded for this run."}</span></div>
      </div>
    </>
  );
}

const TONE: Record<string, string> = { v: "var(--accent)", r: "var(--crit)", g: "var(--good)", b: "var(--s1)", k: "var(--ink)" };
function Timeline({ events }: { events: TimelineEvent[] }) {
  const lanes = ["Changes", "Failures", "Runtime", "Investigation"];
  const [sel, setSel] = useState<number | null>(null);
  const times = events.filter((e) => e.at).flatMap((e) => [new Date(e.at!).getTime(), e.until ? new Date(e.until).getTime() : 0]).filter(Boolean);
  if (!times.length) return <Empty title="Nothing on the timeline yet" lede="Events appear as the investigation finds them." />;
  const lo = Math.min(...times), hi = Math.max(...times), span = Math.max(hi - lo, 60_000);
  const x = (iso: string) => `${6 + ((new Date(iso).getTime() - lo) / span) * 88}%`;
  return (
    <div className="card pad0" style={{ overflow: "auto" }}>
      <div className="tl-in" style={{ padding: "8px 12px" }}>
        <div className="tl-axis">{[0, 1, 2, 3, 4, 5, 6].map((i) => <span key={i} style={{ left: `${6 + (i / 6) * 88}%` }}>{hm(new Date(lo + (span * i) / 6).toISOString())}</span>)}</div>
        {lanes.map((ln) => (
          <div className="tl-lane" key={ln}>
            <div className="nm">{ln}</div>
            <div className="tr">
              {events.map((e, i) => e.lane === ln && e.at ? (
                <span key={i}>
                  {e.until ? <span className="tl-span" style={{ left: x(e.at), width: `calc(${x(e.until)} - ${x(e.at)})`, minWidth: 6 }} /> : null}
                  <button className={`tl-ev ${sel === i ? "on" : ""}`} style={{ left: x(e.at), ["--c" as string]: TONE[e.tone] || "var(--ink)", animationDelay: `${i * 40}ms` }} onClick={() => setSel(i)} aria-label={e.label}>
                    <i /><span>{e.label}</span>
                  </button>
                </span>
              ) : null)}
            </div>
          </div>
        ))}
      </div>
      {sel !== null && events[sel] ? (
        <div className="callout sm" style={{ margin: 12 }}>
          <b>{events[sel].label}</b> <span className="muted">{hm(events[sel].at)}{events[sel].until ? ` to ${hm(events[sel].until)}` : ""}</span>
          {events[sel].detail ? <div className="ink2" style={{ marginTop: 4 }}>{events[sel].detail}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function Hypotheses({ d }: { d: RunDetail }) {
  const f = d.finding;
  return (
    <div className="stack">
      <div className="card callout vio">
        <div className="eyebrow">Current finding</div>
        <div style={{ fontWeight: 500, marginTop: 6, lineHeight: 1.45 }}>{f ? f.summary : "None yet."}</div>
        {f?.claims.map((c, i) => (
          <div className="sm" key={i} style={{ marginTop: 8 }}>
            <Badge c={c.kind === "recommendation" ? "vio" : c.kind === "inference" ? "warn" : "good"}>{c.kind.replace("_", " ")}</Badge>{" "}
            <span className="ink2">{c.text}</span>
            <div style={{ marginTop: 4 }}>{c.citations.map((x) => <Ref key={x.id} id={x.id} all={d.evidence} />)}</div>
          </div>
        ))}
        {f?.limitations.length ? <div className="xs muted" style={{ marginTop: 10 }}>Limits: {f.limitations.join(" ")}</div> : null}
      </div>
      {d.resolution?.actions.length ? (
        <div className="card">
          <h3 className="ct" style={{ marginBottom: 6 }}>Suggested next steps</h3>
          {d.resolution.actions.map((a, i) => <div className="sm" key={i} style={{ padding: "4px 0" }}>{i + 1}. {a}</div>)}
          {d.resolution.verify.length ? <div className="xs muted" style={{ marginTop: 6 }}>How to verify: {d.resolution.verify.join(" · ")}</div> : null}
          <div className="xs muted" style={{ marginTop: 6 }}>Proposals only. Changes and pull requests are a separate, approved step.</div>
        </div>
      ) : null}
      <div className="card">
        <h3 className="ct" style={{ marginBottom: 8 }}>Hypotheses</h3>
        {d.hypotheses.length ? d.hypotheses.map((h: Hyp, i) => (
          <div key={h.id} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <span className="sm"><span className="mono xs muted">H{i + 1}</span> {h.statement}</span>
              <HypBadge s={h.status} />
            </div>
            <div className="xs ink2" style={{ marginTop: 4 }}>{h.summary}</div>
            <div style={{ marginTop: 4 }}>
              {h.supported_by.map((id) => <Ref key={id} id={id} all={d.evidence} />)}
              {h.contradicted_by.map((id) => <Ref key={id} id={id} all={d.evidence} />)}
            </div>
          </div>
        )) : <p className="sm muted" style={{ margin: 0 }}>None yet.</p>}
      </div>
      <div className="card">
        <h3 className="ct" style={{ marginBottom: 8 }}>Do the logs cover this?</h3>
        {d.coverage.map(([label, state]) => (
          <div className="chk" key={label}>
            <span className={`badge ${state === "good" ? "b-good" : state === "warn" ? "b-warn" : "b-crit"}`} style={{ minWidth: 24, justifyContent: "center" }}>{state === "good" ? "✓" : state === "warn" ? "!" : "×"}</span>
            <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
          </div>
        ))}
        {d.gaps.map((g, i) => <div className="xs muted" key={i} style={{ marginTop: 6 }}>{g.kind.replace(/_/g, " ")}: {g.description}</div>)}
      </div>
    </div>
  );
}

function EvidenceList({ d }: { d: RunDetail }) {
  if (!d.evidence.length) return <p className="sm muted">No cited evidence yet.</p>;
  return (
    <div className="card pad0">
      {d.evidence.map((e) => (
        <div className="li" key={e.id} onClick={() => openEvidence(e.id, d.evidence)} style={{ padding: "12px 16px", margin: 0, cursor: "pointer" }}>
          <div className="ico"><Icon n={e.type === "code" ? "code" : "file"} c="sm" /></div>
          <div className="b">
            <div className="sm" style={{ fontWeight: 500, overflowWrap: "anywhere" }}>{e.title}</div>
            <div className="xs muted mono">{e.id.slice(0, 12)} · {e.src}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ page */
export function InvestigationView({ projectId, runId }: { projectId: string; runId: string }) {
  const res = useApi<RunDetail>(`/projects/${projectId}/investigations/${runId}`, (d) => (running(d) ? 1200 : false));
  const [tab, setTab] = useState<Tab>("impact");
  const [openStep, setOpenStep] = useState<Record<number, boolean>>({});
  const [replay, setReplay] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const d = res.data;

  /* TRACE Bot follows the page: "this" in a question means this run */
  useEffect(() => {
    setBotFocus({ kind: "investigation", id: runId, projectId, label: d ? `${d.ticket.display_id ?? "Investigation"}` : "This investigation" });
    return () => setBotFocus(null);
  }, [runId, projectId, d?.ticket.display_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  useEffect(() => { if (d && running(d)) setOpenStep((o) => ({ ...o, [d.steps[d.steps.length - 1]?.sequence ?? 0]: true })); }, [d?.steps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps = useMemo(() => (d ? (replay === null ? d.steps : d.steps.slice(0, replay)) : []), [d, replay]);
  const startReplay = () => {
    if (!d) return;
    if (timer.current) clearInterval(timer.current);
    let k = 0;
    setReplay(0);
    timer.current = setInterval(() => {
      k++;
      setReplay(k);
      if (k >= d.steps.length && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
        setReplay(null);
      }
    }, 480);
  };
  const rerun = async () => {
    if (!d) return;
    try {
      const r = await call<{ run_id: string; project_id: string }>(`/tickets/${d.ticket.id}/investigate`, { method: "POST", body: {} });
      toast("Investigation started");
      window.location.href = `/investigate/${r.data.project_id}/${r.data.run_id}`;
    } catch (e) {
      toast((e as ApiError).message);
    }
  };

  if (res.error && !d) return <div className="page"><ErrorState error={res.error} onRetry={res.reload} /></div>;
  if (!d) return <div className="page"><Loading label="Opening the investigation" /></div>;
  const f = d.finding ? FINDING[d.finding.status] || ["ins", d.finding.status] : null;
  const live = running(d);

  return (
    <div className="page">
      <div className="row sm muted" style={{ marginBottom: 10 }}>
        <Link className="link" href="/investigate" style={{ color: "var(--mute)" }}>Investigate</Link>
        <Icon n="chev" c="sm" /><span>{d.project.name}</span><Icon n="chev" c="sm" /><span className="mono">{d.ticket.display_id || d.run.control_run_id.slice(0, 8)}</span>
      </div>
      <div className="ph">
        <div>
          <h1 className="h1">{d.ticket.title}</h1>
          <div className="chips">
            {d.ticket.severity ? <SevBadge s={d.ticket.severity} /> : null}
            <Chip d="v">{d.project.name}</Chip>
            {d.ticket.environment_key ? <EnvBadge e={d.ticket.environment_key} /> : null}
            <Chip>{d.steps.length} steps</Chip>
            {live ? <Chip d="r pulse">Running</Chip> : f ? <FindingBadge cls={f[0]} label={`Finding: ${f[1]}`} /> : null}
          </div>
        </div>
        <div className="row wrapr">
          <button className="btn" onClick={startReplay} disabled={live || !d.steps.length}><Icon n="refresh" c="sm" />Replay</button>
          <button className="btn" onClick={rerun} disabled={live} title="Run a new investigation on the same ticket"><Icon n="play" c="sm" />Rerun</button>
          <button className="btn" onClick={() => askBot()} disabled={!d.items} title="Open TRACE Bot on this investigation"><Icon n="spark" c="sm" />Ask about this</button>
        </div>
      </div>
      {d.run.status === "failed" ? <div className="callout warn" role="alert"><Icon n="alert" c="sm" /> <b>This investigation stopped early.</b> <span className="ink2">{d.gaps.find((g) => g.description.startsWith("The investigation stopped"))?.description}</span></div> : null}
      <div className="xs muted" style={{ marginBottom: 12 }}>
        Window {hm(d.run.window_start)} to {hm(d.run.window_end)} · evidence known at {hm(d.run.evidence_cutoff)} · {d.items} items retrieved from the graph. Reasoning steps show tools and results, not hidden thoughts.
      </div>
      <div className="invgrid">
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Investigation steps</div>
          <div className="trace">
            {steps.map((s) => <StepCard key={s.sequence} s={s} ev={d.evidence} open={!!openStep[s.sequence]} toggle={() => setOpenStep((o) => ({ ...o, [s.sequence]: !o[s.sequence] }))} running={live} />)}
            {live || replay !== null ? <div className="tstep"><div className="tdot"><span className="lspin" style={{ width: 14, height: 14, margin: 0, borderWidth: 2 }} /></div><div className="xs muted" style={{ padding: "6px 0" }}>Working…</div></div> : null}
          </div>
        </div>
        <div className="sticky-side">
          <div className="seg" style={{ marginBottom: 12 }}>
            {([["impact", "Impact"], ["timeline", "Timeline"], ["hyp", "Hypotheses"], ["evidence", "Evidence"]] as Array<[Tab, string]>).map(([k, l]) => (
              <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}{k === "evidence" ? <> <span className="n">{d.evidence.length}</span></> : null}</button>
            ))}
          </div>
          {tab === "impact" ? <Impact d={d} /> : tab === "timeline" ? <Timeline events={d.timeline} /> : tab === "hyp" ? <Hypotheses d={d} /> : <EvidenceList d={d} />}
        </div>
      </div>
    </div>
  );
}

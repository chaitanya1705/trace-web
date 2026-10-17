"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { call as api } from "@/lib/call";
import { closeLayer, openLayer } from "@/lib/layer";
import type { Project, Ticket } from "@/lib/types";
import { invalidate, useApi } from "@/lib/useApi";
import { toast } from "@/lib/toast";
import { Badge, Chip, EnvBadge, SevBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Kpis } from "@/components/ui/Kpis";
import { Modal, ModalHead } from "@/components/ui/Modal";
import { PageHead } from "@/components/ui/PageHead";
import { Empty, ErrorState, Loading } from "@/components/ui/States";

type View = "need_project" | "open" | "resolved" | "all";
type Counts = { need_project: number; open: number; resolved: number; all: number };

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

const evidenceNote = (t: Ticket) =>
  t.evidence_sync === "pending" ? "Evidence received, not in the graph yet" : t.evidence_sync === "synced" ? "Evidence in the graph" : t.evidence_sync === "failed" ? "Evidence sync failed" : "";

/** Investigate is always an explicit click. One active run per ticket: the API answers 409 and we open the running one. */
async function startInvestigation(t: Pick<Ticket, "id" | "display_id">, go: (href: string) => void) {
  try {
    const r = await api<{ run_id: string; project_id: string }>(`/tickets/${t.id}/investigate`, { method: "POST", body: {} });
    closeLayer();
    toast(`Investigating ${t.display_id}`);
    go(`/investigate/${r.data.project_id}/${r.data.run_id}`);
  } catch (e) {
    const er = e as ApiError;
    if (er.code === "run_active") {
      const runId = er.details.run_id;
      const projectId = er.details.project_id;
      if (typeof runId === "string" && typeof projectId === "string") {
        closeLayer();
        toast(`Opening the active investigation for ${t.display_id}`);
        go(`/investigate/${projectId}/${runId}`);
      } else {
        toast("The active investigation could not be located. Open Investigate to find it.");
        go("/investigate");
      }
    } else toast(er.message);
  }
}

/** Tickets: every incident that comes in. Assign a project, then Investigate (when the investigator exists). */
export function Tickets() {
  const router = useRouter();
  const [view, setView] = useState<View>("open");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [sev, setSev] = useState("");
  const [env, setEnv] = useState("");
  const [sort, setSort] = useState("opened");
  const [cursors, setCursors] = useState<string[]>([]); // stack of cursors; the last one is the current page
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDq(q);
      setCursors([]);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const qs = new URLSearchParams({ view, sort, limit: "25" });
  if (dq) qs.set("q", dq);
  if (sev) qs.set("severity", sev);
  if (env) qs.set("environment", env);
  if (cursors.length) qs.set("cursor", cursors[cursors.length - 1]);
  const res = useApi<Ticket[]>(`/tickets?${qs}`);
  const projects = useApi<Project[]>("/projects?limit=100");
  const counts = (res.meta?.coverage?.counts || { need_project: 0, open: 0, resolved: 0, all: 0 }) as Counts;
  const emptyDataset = !!res.meta?.coverage?.empty_dataset;
  const next = res.meta?.next_cursor;

  const importFile = async (f: File) => {
    try {
      const text = await f.text();
      const r = await api<{ outcome: string; ticket: Ticket }>("/tickets/import/pulselab", { rawBody: text });
      toast(r.data.outcome === "created" ? `Imported ${r.data.ticket.display_id}` : r.data.outcome === "unchanged" ? "Already imported; nothing changed" : `Updated ${r.data.ticket.display_id}`);
      invalidate();
    } catch (e) {
      toast((e as ApiError).message);
    }
  };

  const assign = async (t: Ticket, projectId: string) => {
    try {
      await api(`/tickets/${t.id}`, { method: "PATCH", body: { version: t.version, project_id: projectId } });
      toast(`${t.display_id} assigned. Investigate is a separate step.`);
      invalidate();
    } catch (e) {
      toast((e as ApiError).message);
    }
  };

  const tab = (k: View, label: string, n: number) => (
    <button key={k} className={view === k ? "on" : ""} onClick={() => { setView(k); setCursors([]); }}>
      {label} <span className="n">{n}</span>
    </button>
  );

  return (
    <div className="page">
      <PageHead
        title="Tickets"
        lede="Every incident that comes in. Assign each ticket to a project, then choose Investigate. TRACE works inside that project, using its logs and code."
        chips={counts.need_project ? <Chip d="a">{counts.need_project} without a project</Chip> : null}
        right={
          <>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ""; }} />
            <button className="btn" onClick={() => fileRef.current?.click()} title="Import an incident export downloaded from PulseLab">
              <Icon n="file" />
              Import export
            </button>
            <button className="btn" onClick={res.reload}>
              <Icon n="refresh" />
              Refresh
            </button>
            <button className="btn pri" onClick={() => openLayer(<NewTicket projects={projects.data || []} />)}>
              <Icon n="plus" />
              New ticket
            </button>
          </>
        }
      />
      <Kpis items={[["Need a project", counts.need_project, "assign, then investigate"], ["Open", counts.open, ""], ["Resolved or closed", counts.resolved, ""], ["All tickets", counts.all, ""]]} />
      {res.error ? <ErrorState error={res.error} onRetry={res.reload} /> : null}

      <div className="tbox2" style={{ marginTop: 16 }}>
        <div className="tb-views">
          <div className="seg">
            {tab("need_project", "Need a project", counts.need_project)}
            {tab("open", "Open", counts.open)}
            {tab("resolved", "Resolved", counts.resolved)}
            {tab("all", "All", counts.all)}
          </div>
        </div>
        <div className="tb-bar">
          <div className="tb-search">
            <Icon n="search" c="sm" />
            <input type="search" placeholder="Search by ID, title or service" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input tb-sel" aria-label="Severity" value={sev} onChange={(e) => { setSev(e.target.value); setCursors([]); }}>
            <option value="">Severity: all</option>
            {["SEV-1", "SEV-2", "SEV-3", "SEV-4"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <input className="input tb-sel" aria-label="Environment" placeholder="Environment" value={env} onChange={(e) => { setEnv(e.target.value); setCursors([]); }} style={{ width: 130 }} />
          <select className="input tb-sel" aria-label="Sort" value={sort} onChange={(e) => { setSort(e.target.value); setCursors([]); }}>
            <option value="opened">Newest first</option>
            <option value="opened_asc">Oldest first</option>
            <option value="severity">Severity</option>
            <option value="title">Title</option>
            <option value="status">Status</option>
          </select>
        </div>
        <div className="tb-body">
          {res.loading && !res.data ? <div style={{ padding: 16 }}><Loading label="Loading tickets" /></div> : null}
          {res.data && !res.data.length ? (
            <div style={{ padding: 16 }}>
              {emptyDataset ? (
                <Empty title="No tickets yet" lede="Tickets arrive from the New ticket form, the API, or an incident export imported from PulseLab." action={<button className="btn pri" onClick={() => openLayer(<NewTicket projects={projects.data || []} />)}>New ticket</button>} />
              ) : (
                <p className="muted" style={{ textAlign: "center", padding: 24 }}>Nothing matches. Clear the search or filters.</p>
              )}
            </div>
          ) : null}
          {res.data?.length ? (
            <div className="scroll-x">
              <table className="tbl hov">
                <thead>
                  <tr><th>Ticket</th><th>Project</th><th>Environment</th><th>Severity</th><th>Status</th><th>Opened</th><th /></tr>
                </thead>
                <tbody>
                  {res.data.map((t, i) => (
                    <tr key={t.id} className="click trow" style={{ ["--i" as string]: Math.min(i, 12) }} tabIndex={0} onClick={() => openLayer(<TicketDetail id={t.id} projects={projects.data || []} />)} onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) openLayer(<TicketDetail id={t.id} projects={projects.data || []} />); }}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{t.title}</div>
                        <div className="xs muted mono">{t.display_id}{t.service_hint ? ` · ${t.service_hint}` : ""} · {t.source}</div>
                        {evidenceNote(t) ? <div className="xs muted">{evidenceNote(t)}</div> : null}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {t.project_name ? (
                          <span className="sm">{t.project_name}</span>
                        ) : (
                          <select className="input tb-sel" aria-label={`Assign ${t.display_id} to a project`} value="" onChange={(e) => e.target.value && void assign(t, e.target.value)} disabled={!projects.data?.length} title={projects.data?.length ? undefined : "Create a project first"}>
                            <option value="">{projects.data?.length ? "Assign to project…" : "No projects yet"}</option>
                            {(projects.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td>{t.environment_key ? <EnvBadge e={t.environment_key} /> : <span className="muted sm">Unknown</span>}</td>
                      <td>{t.severity ? <SevBadge s={t.severity} /> : <span className="muted sm">Not rated</span>}</td>
                      <td><Badge c={t.status === "open" ? "warn" : "good"}>{t.status === "open" ? "Open" : t.status === "resolved" ? "Resolved" : "Closed"}</Badge></td>
                      <td><span className="sm ink2 tnum">{ago(t.opened_at)}</span></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="btn sm pri" disabled={!t.investigate.available} title={t.investigate.reason || "Start an investigation"} onClick={() => void startInvestigation(t, router.push)}>
                          <Icon n="flask" c="sm" />
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="pager2">
            <span className="xs muted">{res.data ? `${res.data.length} shown` : ""}</span>
            <div className="pg">
              <button disabled={!cursors.length} aria-label="Previous page" onClick={() => setCursors((c) => c.slice(0, -1))}>‹</button>
              <button disabled={!next} aria-label="Next page" onClick={() => next && setCursors((c) => [...c, next])}>›</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewTicket({ projects }: { projects: Project[] }) {
  const [f, setF] = useState({ title: "", description: "", severity: "", environment_key: "", service_hint: "", project_id: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((o) => ({ ...o, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = { title: f.title.trim(), description: f.description };
      if (f.severity) body.severity = f.severity;
      if (f.environment_key.trim()) body.environment_key = f.environment_key.trim();
      if (f.service_hint.trim()) body.service_hint = f.service_hint.trim();
      if (f.project_id) body.project_id = f.project_id;
      const r = await api<{ ticket: Ticket }>("/tickets", { body });
      toast(`${r.data.ticket.display_id} created`);
      invalidate();
      closeLayer();
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal label="New ticket" width="min(560px,100%)">
      <ModalHead><b style={{ flex: 1 }}>New ticket</b></ModalHead>
      <div className="mb">
        {err ? <ErrorState error={err} /> : null}
        <div className="field"><label className="lbl" htmlFor="ntT">Title</label><input className="input" id="ntT" value={f.title} onChange={set("title")} placeholder="What is the symptom?" /></div>
        <div className="field"><label className="lbl" htmlFor="ntD">Description <span className="muted" style={{ fontWeight: 400 }}>optional</span></label><textarea className="input" id="ntD" style={{ minHeight: 80 }} value={f.description} onChange={set("description")} placeholder="What was observed, and when. Describe symptoms, not causes." /></div>
        <div className="fgrid">
          <div className="field"><label className="lbl" htmlFor="ntS">Severity</label><select className="input" id="ntS" value={f.severity} onChange={set("severity")}><option value="">Not rated</option>{["SEV-1", "SEV-2", "SEV-3", "SEV-4"].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label className="lbl" htmlFor="ntE">Environment</label><input className="input" id="ntE" value={f.environment_key} onChange={set("environment_key")} placeholder="production" /></div>
        </div>
        <div className="fgrid">
          <div className="field"><label className="lbl" htmlFor="ntV">Service or operation</label><input className="input" id="ntV" value={f.service_hint} onChange={set("service_hint")} placeholder="POST /api/checkout" /></div>
          <div className="field"><label className="lbl" htmlFor="ntP">Project</label><select className="input" id="ntP" value={f.project_id} onChange={set("project_id")}><option value="">Assign later</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        </div>
      </div>
      <div className="mf"><button className="btn" onClick={closeLayer}>Cancel</button><button className="btn pri" disabled={busy || !f.title.trim()} onClick={save}>Create ticket</button></div>
    </Modal>
  );
}

function TicketDetail({ id, projects }: { id: string; projects: Project[] }) {
  const router = useRouter();
  const res = useApi<Ticket & { revisions: Array<{ revision_number: number; created_at: string }>; has_payload: boolean }>(`/tickets/${id}`);
  const t = res.data;
  const [requestId, setRequestId] = useState("");
  const liveWindow = (() => {
    if (!t) return null;
    const anchor = new Date(t.opened_at).getTime();
    const start = t.window_start ? new Date(t.window_start).getTime() : t.window_end ? new Date(t.window_end).getTime() : anchor;
    const end = t.window_end ? new Date(t.window_end).getTime() : t.window_start ? new Date(t.window_start).getTime() : anchor;
    if (![anchor, start, end].every(Number.isFinite)) return null;
    const pad = 15 * 60 * 1000;
    return { since: new Date(start - pad).toISOString(), until: new Date(end + pad).toISOString() };
  })();
  const logParams = new URLSearchParams({ limit: "50" });
  if (t?.environment_key) logParams.set("environment", t.environment_key);
  if (t?.service_hint) logParams.set("service_hint", t.service_hint);
  if (requestId) logParams.set("request_id", requestId);
  if (liveWindow) {
    logParams.set("since", liveWindow.since);
    logParams.set("until", liveWindow.until);
  }
  const logPath = t?.project_id ? `/projects/${t.project_id}/logs?${logParams}` : null;
  const logs = useApi<LiveLog[]>(logPath, () => 5000, { clearOnPathChange: true });
  const setStatus = async (status: string) => {
    try {
      await api(`/tickets/${id}`, { method: "PATCH", body: { version: t!.version, status } });
      invalidate();
      toast(status === "open" ? "Reopened" : `Marked ${status}`);
    } catch (e) {
      toast((e as ApiError).message);
    }
  };
  const es = t?.evidence_summary || {};
  return (
    <Modal label="Ticket" width="min(720px,100%)">
      <ModalHead><b style={{ flex: 1 }}>{t ? `${t.display_id} · ${t.title}` : "Ticket"}</b></ModalHead>
      <div className="mb">
        {res.error ? <ErrorState error={res.error} onRetry={res.reload} /> : null}
        {!t ? <Loading /> : (
          <>
            <div className="row wrapr" style={{ gap: 6, marginBottom: 10 }}>
              <Badge c={t.status === "open" ? "warn" : "good"}>{t.status}</Badge>
              {t.severity ? <SevBadge s={t.severity} /> : <Badge c="mute">Severity not rated</Badge>}
              {t.environment_key ? <EnvBadge e={t.environment_key} /> : null}
              <Chip>{t.project_name || "No project yet"}</Chip>
              <Chip>{t.source}</Chip>
            </div>
            {t.description ? <p className="sm ink2" style={{ whiteSpace: "pre-wrap" }}>{t.description}</p> : <p className="sm muted">No description.</p>}
            <dl className="kv" style={{ gridTemplateColumns: "170px 1fr", marginTop: 12 }}>
              {t.service_hint ? <><dt>Operation</dt><dd className="mono">{t.service_hint}</dd></> : null}
              <dt>Observed</dt><dd>{t.window_start ? `${new Date(t.window_start).toLocaleString()} → ${t.window_end ? new Date(t.window_end).toLocaleString() : "unknown"}` : <span className="muted">Time window unknown</span>}</dd>
              {t.source === "pulselab" && es.requests !== undefined && es.requests !== null ? <><dt>Reporter-supplied PulseLab export</dt><dd>{es.requests} requests · {es.backend_events ?? 0} backend events · {es.evidence_gaps ?? 0} gaps</dd></> : null}
              {es.target?.source_revision ? <><dt>Deployed revision</dt><dd className="mono">{String(es.target.source_revision).slice(0, 12)}</dd></> : null}
              <dt>Evidence sync</dt><dd>{evidenceNote(t) || "No evidence attached"}</dd>
              <dt>Revisions</dt><dd>{t.revisions.length}</dd>
            </dl>
            <TicketLiveLogs ticket={t} logs={logs} requestId={requestId} setRequestId={setRequestId} />
            <div className="callout sm" style={{ marginTop: 12 }}>
              <b>Investigate.</b> <span className="ink2">{t.investigate.available ? "Ready." : t.investigate.reason}</span>
            </div>
            {!t.project_id && projects.length ? (
              <div className="field" style={{ marginTop: 12 }}>
                <label className="lbl" htmlFor="tdA">Assign to a project</label>
                <select className="input" id="tdA" value="" onChange={async (e) => { if (!e.target.value) return; try { await api(`/tickets/${id}`, { method: "PATCH", body: { version: t.version, project_id: e.target.value } }); invalidate(); toast("Assigned"); } catch (er) { toast((er as ApiError).message); } }}>
                  <option value="">Choose…</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            ) : null}
          </>
        )}
      </div>
      <div className="mf">
        <span />
        <span className="row">
          {t ? <button className="btn pri" disabled={!t.investigate.available} title={t.investigate.reason || "Start an investigation"} onClick={() => void startInvestigation(t, router.push)}><Icon n="flask" c="sm" />Investigate</button> : null}
          {t && t.status === "open" ? <button className="btn" onClick={() => setStatus("resolved")}>Mark resolved</button> : null}
          {t && t.status !== "open" ? <button className="btn" onClick={() => setStatus("open")}>Reopen</button> : null}
          <button className="btn" onClick={closeLayer}>Close</button>
        </span>
      </div>
    </Modal>
  );
}

type LiveLog = {
  id: string;
  event_time: string | null;
  ingested_at: string;
  level: string | null;
  source: string | null;
  service_hint: string | null;
  request_id: string | null;
  status_code: number | null;
  environment_key: string | null;
  message: string;
  provider: string | null;
};

function TicketLiveLogs({ ticket, logs, requestId, setRequestId }: {
  ticket: Ticket;
  logs: ReturnType<typeof useApi<LiveLog[]>>;
  requestId: string;
  setRequestId: (id: string) => void;
}) {
  const rows = logs.data || [];
  const coverage = logs.meta?.coverage as { stored_total?: number; matched?: number; empty_dataset?: boolean; source?: { configured?: boolean } } | null;
  const requestIds = ticket.source === "pulselab" && Array.isArray(ticket.evidence_summary?.relevant_request_ids)
    ? ticket.evidence_summary.relevant_request_ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    : [];
  return (
    <section className="card" aria-label="Live project logs" style={{ marginTop: 14, padding: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div>
          <b className="sm">Project logs</b>
          <div className="xs muted">Stored ShopFlow project events · refreshes every 5 seconds while this ticket is open</div>
        </div>
        {ticket.project_id ? <button className="btn sm" onClick={logs.reload}>Refresh</button> : null}
      </div>
      {!ticket.project_id ? <p className="sm muted" style={{ marginBottom: 0 }}>Assign this ticket to a project to see its logs.</p> : null}
      {ticket.project_id && requestIds.length ? (
        <div className="row wrapr" style={{ gap: 5, marginTop: 9 }} aria-label="Reporter supplied request IDs">
          <span className="xs muted">Reporter supplied request IDs:</span>
          {requestIds.slice(0, 10).map((id) => <button key={id} className={`btn sm${requestId === id ? " pri" : ""}`} aria-pressed={requestId === id} onClick={() => setRequestId(requestId === id ? "" : id)}>{id}</button>)}
          {requestId ? <button className="btn sm" onClick={() => setRequestId("")}>Clear request filter</button> : null}
        </div>
      ) : null}
      {ticket.project_id && logs.error ? <div style={{ marginTop: 10 }}><ErrorState error={logs.error} onRetry={logs.reload} /></div> : null}
      {ticket.project_id && logs.loading && !logs.data ? <div style={{ padding: 12 }}><Loading label="Loading project logs" /></div> : null}
      {ticket.project_id && !logs.error && rows.length === 0 && !logs.loading ? (
        <p className="sm muted" style={{ marginBottom: 0, marginTop: 10 }}>
          {!coverage?.source?.configured
            ? "No log source is configured for this project."
            : coverage.empty_dataset && !coverage.stored_total
              ? "No project log events have been received yet."
              : "No events match this ticket’s time window and filters."}
        </p>
      ) : null}
      {rows.length ? (
        <div className="scroll-x" style={{ marginTop: 10, maxHeight: 300, overflow: "auto" }}>
          <table className="tbl">
            <thead><tr><th>Time</th><th>Level</th><th>Event</th><th>Request</th><th>Source</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id}>
              <td className="xs mono">{row.event_time ? new Date(row.event_time).toLocaleString() : <span className="muted">unknown time</span>}</td>
              <td className="xs">{row.level || "unknown"}{row.status_code ? ` · ${row.status_code}` : ""}</td>
              <td><span className="mono xs" style={{ display: "block", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.message}</span><span className="xs muted">{row.service_hint || "service unknown"}{row.environment_key ? ` · ${row.environment_key}` : ""}</span></td>
              <td className="xs mono">{row.request_id ? <button className="btn sm" aria-label={`Filter logs by request ${row.request_id}`} onClick={() => setRequestId(row.request_id!)}>{row.request_id}</button> : "—"}</td>
              <td className="xs">{row.provider === "app_push" ? "ShopFlow app" : row.provider === "vercel" ? "Vercel runtime" : row.provider || row.source || "unknown source"}</td>
            </tr>)}</tbody>
          </table>
        </div>
      ) : null}
      {ticket.project_id && rows.length ? <div className="xs muted" style={{ marginTop: 6 }}>{coverage?.matched ?? rows.length} matching stored events · latest first</div> : null}
    </section>
  );
}

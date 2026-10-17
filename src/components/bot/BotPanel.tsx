"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { call } from "@/lib/call";
import { parseMarkdown, renderMarkdown, revealSteps } from "./botMarkdown";
import {
  botUi, closeBot, currentConvo, deleteConvo, loadConvos, newChat, openConvo, rate, regenerate, sendMessage, setTab, settle,
  type BotMsg, type Cite, type Step,
} from "@/lib/bot";
import { S } from "@/lib/state";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { Project } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { Icon } from "@/components/ui/Icon";
import { openEvidence } from "@/features/investigate/InvestigationView";
import type { Evidence } from "@/features/investigate/types";

const COLOR: Record<string, string> = { log: "#e56d24", code: "#2f6fec", deploy: "#7c5cff", ticket: "#1f7a5f", run: "#1f7a5f", gap: "#9a9da3", service: "#9a9da3", other: "#9a9da3" };
const GLYPH: Record<string, string> = {
  log: "M3 12h4l3-8 4 16 3-8h4", code: "M8 7l-5 5 5 5M16 7l5 5-5 5", deploy: "M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9",
  ticket: "M4 20V10M10 20V4M16 20v-7", run: "M4 20V10M10 20V4M16 20v-7", gap: "M12 8v5M12 17h.01",
};
const STEP: Record<string, string> = {
  graph_overview: "Surveying the graph", search: "Searching names and messages", get_node: "Following relationships", list_tickets: "Reading tickets",
  get_investigation: "Reading the investigation", error_summary: "Counting errors by operation", recent_events: "Reading recent events", request_trace: "Tracing one request",
  deployments: "Reading deployments", code_for_event: "Locating code for an event", search_code: "Searching source code", callers: "Walking callers",
};
const ICONS_OF = (k: string) => GLYPH[k] ?? GLYPH.gap;

function Avatar({ kind, size }: { kind: string; size: number }) {
  return (
    <span className="tb-av" style={{ width: size, height: size, background: COLOR[kind] ?? COLOR.other }}>
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.7)} height={Math.round(size * 0.7)} fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS_OF(kind)} /></svg>
    </span>
  );
}

/** Open a cited log event or source excerpt exactly as the investigation page does. Other node kinds have no viewer yet. */
async function openCite(c: Cite, projectId: string | undefined) {
  if (!projectId || !/^(evd|chk)_/.test(c.id)) return toast(`${c.caption}`);
  try {
    const r = await call<Evidence[]>(`/projects/${projectId}/evidence?ids=${encodeURIComponent(c.id)}`);
    openEvidence(c.id, r.data);
  } catch {
    toast("Could not open that evidence");
  }
}

/** Markdown blocks, with each [node_id] the answer cites turned into a chip. */
function blocksOf(m: BotMsg) {
  const by = new Map((m.cites || []).map((c) => [c.id, c]));
  return parseMarkdown<Cite>(m.content, (id) => by.get(id));
}

function Thinking({ steps, secs, working }: { steps: Step[]; secs?: number; working?: boolean }) {
  const [open, setOpen] = useState(!!working);
  return (
    <div className={`th${open ? " open" : ""}`}>
      <button type="button" className="th-hd" aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg width="15" height="15" viewBox="0 0 24 24" className="th-spark" fill={working ? "var(--ink2)" : "var(--mute)"}><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" /></svg>
        <span className={`th-label ${working ? "th-shimmer" : "th-done"}`}>{working ? "Thinking" : `Queried the graph ${steps.length} time${steps.length === 1 ? "" : "s"} · ${secs ?? 1}s`}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="th-chev"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <div className="th-wrap"><div className="th-in"><div className="th-rows">
        {steps.map((s, i) => (
          <div className="th-row" key={i}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="th-ok"><path d="M20 6L9 17l-5-5" /></svg>
            <span className="th-p">{STEP[s.tool] ?? s.tool}</span>
            <span className="th-s mono">{s.error ? "no match" : `${s.rows} row${s.rows === 1 ? "" : "s"}`}</span>
          </div>
        ))}
        {working ? <div className="th-row"><span className="th-spin" /><span className="th-p">Querying the evidence graph</span></div> : null}
      </div></div></div>
    </div>
  );
}

function Answer({ m, last, projectId }: { m: BotMsg; last: boolean; projectId?: string }) {
  const blocks = useMemo(() => blocksOf(m), [m]);
  const toks = useMemo(() => revealSteps(blocks), [blocks]);
  const [k, setK] = useState(m.fresh ? 0 : toks.length);
  const [src, setSrc] = useState(false);
  const done = k >= toks.length;
  useEffect(() => {
    if (!m.fresh || done) return;
    const t = setTimeout(() => setK((x) => Math.min(x + 3, toks.length)), toks[k]?.cite ? 140 : 40);
    return () => clearTimeout(t);
  }, [k, done, m.fresh, toks]);
  useEffect(() => {
    if (done && m.fresh) settle(m.id);
  }, [done, m.fresh, m.id]);
  if (m.error) return <div className="msg a"><div className="callout warn sm"><b>{m.error}</b></div></div>;
  const cites = m.cites || [];
  const act = (label: string, d: string, onClick: () => void, on?: boolean) => (
    <button key={label} className={`tb-ic${on ? " on" : ""}`} type="button" aria-label={label} title={label} onClick={onClick}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    </button>
  );
  return (
    <>
      {m.steps?.length ? <Thinking steps={m.steps} secs={m.secs} /> : null}
      <div className={`msg a tb${src ? " srcopen" : ""}`}>
        <div className="tb-p tb-md">
          {renderMarkdown(blocks, k, (t, key) =>
            t.cite ? (
              <a key={key} className="tb-cite" href="#" onClick={(e) => { e.preventDefault(); void openCite(t.cite!, projectId); }} title={t.cite.caption}>
                <Avatar kind={t.cite.kind} size={12} /><span>{t.cite.id.slice(0, 12)}</span>
              </a>
            ) : (
              <span key={key} className={`tb-w${t.b ? " md-b" : ""}${t.i ? " md-i" : ""}${t.code ? " md-c" : ""}`}>{t.w}</span>
            ),
            !done ? <span className="tb-caret" /> : null,
          )}
        </div>
        {done ? (
          <>
            <div className="tb-acts">
              {act("Copy", "M9 9h12v12H9zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1", () => { try { void navigator.clipboard.writeText(m.content); } catch {} toast("Answer copied"); })}
              {last ? act("Regenerate", "M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6", regenerate) : null}
              {act("Helpful", "M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z", () => rate(m.id, "up"), m.rating === "up")}
              {act("Not helpful", "M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z", () => rate(m.id, "down"), m.rating === "down")}
              {cites.length ? (
                <button className="tb-srcbtn" type="button" aria-expanded={src} onClick={() => setSrc(!src)}>
                  <span className="tb-stack">{cites.slice(0, 4).map((c) => <Avatar key={c.id} kind={c.kind} size={14} />)}</span>
                  <span>{cites.length} source{cites.length > 1 ? "s" : ""}</span>
                </button>
              ) : null}
            </div>
            {cites.length ? (
              <div className="tb-srcwrap"><div className="tb-srcin"><div className="tb-srclist">
                {cites.map((c) => (
                  <a key={c.id} className="tb-src" href="#" onClick={(e) => { e.preventDefault(); void openCite(c, projectId); }}>
                    <Avatar kind={c.kind} size={16} /><span className="tb-sname">{c.caption}</span><span className="tb-sdom">{c.id.slice(0, 12)}</span>
                  </a>
                ))}
              </div></div></div>
            ) : null}
            {last && m.followups?.length ? (
              <div className="tb-fu">
                <div className="tb-fuh">Follow-ups</div>
                {m.followups.map((q) => (
                  <button key={q} className="tb-fub" type="button" onClick={() => void sendMessage(q)}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 10l-5 5 5 5" /><path d="M20 4v7a4 4 0 0 1-4 4H4" /></svg>{q}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="tb-meta xs muted">As of {m.asOf ? new Date(m.asOf).toLocaleTimeString() : "now"} · answered from the evidence graph{m.scope ? ` · ${m.scope}` : ""}</div>
          </>
        ) : null}
      </div>
    </>
  );
}

const SUGG = {
  investigation: ["Why do you suspect this?", "What evidence contradicts this?", "What should I check next?"],
  ticket: ["Summarise this ticket", "Has it been investigated?", "What logs relate to it?"],
  none: ["What is failing right now?", "What did the latest investigation conclude?", "Which open tickets have no investigation?", "What was deployed recently?"],
};

export function BotPanel() {
  useStore();
  const projects = useApi<Project[]>(botUi.open ? "/projects?limit=100" : null);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const c = currentConvo();
  const f = botUi.focus;
  const msgs = c?.msgs ?? [];
  useEffect(() => { loadConvos(); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); });
  const scope = f ? f.label : S.proj !== "All" ? projects.data?.find((p) => p.id === S.proj)?.name ?? "Project" : "All projects";
  const projectId = f?.projectId ?? (S.proj !== "All" ? S.proj : undefined);
  const hist = botUi.tab === "history";
  const sugg = f ? SUGG[f.kind === "investigation" ? "investigation" : "ticket"] : SUGG.none;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = text;
    setText("");
    void sendMessage(v);
  };
  return (
    <aside className={`ask${botUi.open ? " on" : ""}`} id="ask" aria-label="TRACE Bot">
      <header>
        <Icon n="spark" style={{ color: "var(--accent)" }} />
        <b>TRACE Bot</b>
        <span className="sp1" />
        <button className="btn icon ghost sm" id="askX" aria-label="Close" onClick={closeBot}><Icon n="x" /></button>
      </header>
      <div className="bot-tabs">
        <div className="seg">
          <button className={hist ? "" : "on"} onClick={() => setTab("chat")}>Chat</button>
          <button className={hist ? "on" : ""} onClick={() => setTab("history")}>History</button>
        </div>
        <button className="btn sm ghost" onClick={newChat}><Icon n="plus" c="sm" />New chat</button>
      </div>
      <div className="ctx" id="askCtx">
        {hist ? <span className="badge b-mute">{botUi.convos.length} conversation{botUi.convos.length === 1 ? "" : "s"}</span> : (
          <>
            {f ? <span className="badge b-vio">{f.label}</span> : null}
            <span className="badge b-mute">{f ? "this investigation" : scope}</span>
            <span className="badge b-mute">source: evidence graph</span>
          </>
        )}
      </div>
      <div className="msgs" id="msgs">
        {hist ? (
          botUi.convos.length ? (
            <>
              <div className="eyebrow" style={{ margin: "0 0 6px" }}>Recent</div>
              {botUi.convos.map((x) => (
                <div key={x.id} className={`bot-h${x.id === botUi.convoId ? " on" : ""}`} style={{ position: "relative", cursor: "pointer" }} onClick={() => openConvo(x.id)}>
                  <span className="bot-ht">{x.title}</span>
                  <span className="xs muted">{new Date(x.time).toLocaleString()} · {x.msgs.filter((m) => m.role === "user").length} question{x.msgs.filter((m) => m.role === "user").length === 1 ? "" : "s"}</span>
                  <button className="btn icon ghost sm" aria-label="Delete conversation" style={{ position: "absolute", right: 8, top: 8 }} onClick={(e) => { e.stopPropagation(); deleteConvo(x.id); }}><Icon n="x" c="sm" /></button>
                </div>
              ))}
            </>
          ) : <p className="sm muted">No conversations yet.</p>
        ) : (
          <>
            <div className="msg a">
              I read TRACE&apos;s evidence graph: tickets, runtime events, deployments, code and investigations. Every answer links to what I found, and I say what I can&apos;t see.
              {f ? <> I&apos;m looking at <b>{f.label}</b>.</> : <> Scope: <b>{scope}</b>.</>}
            </div>
            {msgs.map((m, i) =>
              m.role === "user" ? <div key={m.id} className="msg u">{m.content}</div> : <Answer key={m.id} m={m} last={i === msgs.length - 1} projectId={projectId} />,
            )}
            {botUi.busy ? <Thinking steps={[]} working /> : null}
            <div ref={end} />
          </>
        )}
      </div>
      {!hist && !msgs.length ? (
        <div className="sugg" id="sugg">{sugg.map((q) => <button key={q} onClick={() => void sendMessage(q)}>{q}</button>)}</div>
      ) : null}
      {!hist ? (
        <form id="askForm" onSubmit={submit}>
          <input className="input" id="askIn" placeholder={f ? "Ask about this investigation" : "Ask about your system"} autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} disabled={botUi.busy} />
          <button className="btn pri icon" aria-label="Send" disabled={botUi.busy || text.trim().length < 2}><Icon n="send" /></button>
        </form>
      ) : null}
    </aside>
  );
}

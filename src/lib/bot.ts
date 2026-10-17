"use client";
import { ApiError } from "./api";
import { call } from "./call";
import { S } from "./state";
import { notify } from "./store";

/** TRACE Bot: the one chat window. It asks the API, which answers from the evidence graph (Neo4j). Conversations live in this browser only. */
export type Cite = { id: string; caption: string; kind: string };
export type Step = { tool: string; args: Record<string, unknown>; rows: number; error?: string | null };
export type BotMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  cites?: Cite[];
  steps?: Step[];
  followups?: string[];
  asOf?: string;
  scope?: string;
  secs?: number;
  error?: string;
  rating?: "up" | "down";
  /** Not saved: set on a fresh answer so the panel streams it once. */
  fresh?: boolean;
};
export type Convo = { id: string; title: string; time: number; project: string; msgs: BotMsg[] };
/** The thing the user is looking at; "this" in a question resolves to it. */
export type Focus = { kind: "investigation" | "ticket" | "service"; id: string; projectId: string; label: string };

const KEY = "trace_bot_convos";
const MAX_CONVOS = 30;

export const botUi = { open: false, tab: "chat" as "chat" | "history", convoId: null as string | null, focus: null as Focus | null, busy: false, convos: [] as Convo[] };
let loaded = false;

const save = () => {
  try {
    const slim = botUi.convos.slice(0, MAX_CONVOS).map((c) => ({ ...c, msgs: c.msgs.map(({ fresh, ...m }) => m) }));
    localStorage.setItem(KEY, JSON.stringify(slim));
  } catch {}
};
export const loadConvos = () => {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) botUi.convos = JSON.parse(raw);
  } catch {}
};

export const openBot = () => {
  loadConvos();
  botUi.open = true;
  notify();
};
export const closeBot = () => {
  botUi.open = false;
  notify();
};
export const toggleBot = () => (botUi.open ? closeBot() : openBot());
export const setBotFocus = (f: Focus | null) => {
  const same = (botUi.focus?.id ?? null) === (f?.id ?? null);
  botUi.focus = f;
  if (!same) notify();
};
/** "Ask about this": open the bot on the current item, optionally with a question already sent. */
export const askBot = (question?: string) => {
  openBot();
  botUi.tab = "chat";
  if (question) void sendMessage(question);
  else notify();
};
export const newChat = () => {
  botUi.convoId = null;
  botUi.tab = "chat";
  notify();
};
export const setTab = (t: "chat" | "history") => {
  botUi.tab = t;
  notify();
};
export const openConvo = (id: string) => {
  botUi.convoId = id;
  botUi.tab = "chat";
  notify();
};
export const deleteConvo = (id: string) => {
  botUi.convos = botUi.convos.filter((c) => c.id !== id);
  if (botUi.convoId === id) botUi.convoId = null;
  save();
  notify();
};
export const currentConvo = () => botUi.convos.find((c) => c.id === botUi.convoId) ?? null;
export const rate = (msgId: string, r: "up" | "down") => {
  for (const c of botUi.convos) for (const m of c.msgs) if (m.id === msgId) m.rating = m.rating === r ? undefined : r;
  save();
  notify();
};
/** The streamed reveal finished: stop animating and keep the finished state. */
export const settle = (msgId: string) => {
  for (const c of botUi.convos) for (const m of c.msgs) if (m.id === msgId) m.fresh = false;
  notify();
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export async function sendMessage(text: string, opts: { replaceLast?: boolean } = {}) {
  const message = text.trim();
  if (message.length < 2 || botUi.busy) return;
  loadConvos();
  botUi.tab = "chat";
  let c = currentConvo();
  if (!c) {
    c = { id: uid(), title: message.slice(0, 80), time: Date.now(), project: botUi.focus?.projectId ?? S.proj, msgs: [] };
    botUi.convos.unshift(c);
    botUi.convoId = c.id;
  }
  if (opts.replaceLast) c.msgs = c.msgs.slice(0, -2);
  const history = c.msgs.filter((m) => !m.error).slice(-8).map((m) => ({ role: m.role, content: m.content }));
  c.msgs.push({ id: uid(), role: "user", content: message });
  c.time = Date.now();
  botUi.busy = true;
  save();
  notify();
  const f = botUi.focus;
  const project = f?.projectId ?? (S.proj !== "All" ? S.proj : undefined);
  const t0 = Date.now();
  try {
    const r = await call<{ answer: string; citations: Cite[]; queries: Step[]; followups: string[]; as_of: string; scope: string }>("/bot/chat", {
      body: { message, history, project_id: project, focus: f ? { kind: f.kind, id: f.id } : undefined },
    });
    c.msgs.push({
      id: uid(), role: "assistant", content: r.data.answer, cites: r.data.citations, steps: r.data.queries, followups: r.data.followups,
      asOf: r.data.as_of, scope: r.data.scope, secs: Math.max(1, Math.round((Date.now() - t0) / 1000)), fresh: true,
    });
  } catch (e) {
    const err = e as ApiError;
    c.msgs.push({ id: uid(), role: "assistant", content: "", error: err.status === 0 ? "I can't reach the API." : err.message || "Something went wrong." });
  } finally {
    botUi.busy = false;
    save();
    notify();
  }
}

export const regenerate = () => {
  const c = currentConvo();
  const q = c && [...c.msgs].reverse().find((m) => m.role === "user");
  if (q) void sendMessage(q.content, { replaceLast: true });
};

"use client";
import { notify } from "./store";

/**
 * Session-level UI state that the prototype kept in its global `S` object.
 * Server data belongs to the API layer later; this is only view state and demo preferences.
 */
export type Prefs = {
  theme: "system" | "light" | "dark";
  density: "comfortable" | "compact";
  rows: number;
  tz: "UTC" | "local";
  notif: { wait: number; fix: number; pr: number; digest: number };
};

export const S = {
  /** Selected project scope, "All" or a project id. */
  proj: "All" as string,
  env: "All" as string,
  pref: { theme: "system", density: "comfortable", rows: 25, tz: "UTC", notif: { wait: 1, fix: 1, pr: 1, digest: 0 } } as Prefs,
  awayRead: {} as Record<string, number>,
  /** Selected node on the architecture graph. */
  node: "payment" as string,
  lens: "INC-2417" as string,
  phase: "now" as string,
  layers: { observed: 1, declared: 1, inferred: 1 } as Record<string, number>,
  archView: "map" as "map" | "db",
  /** Investigation side panel: which tab, and which node is highlighted in the impact map. */
  invTab: "impact" as "impact" | "timeline" | "hyp" | "evidence",
  bnode: null as string | null,
  tlSel: null as number | null,
  /** Log console prefill (Open in Logs). */
  lqPrefill: null as null | { p: string; q: string },
  lqEnv: "" as string,
};

export const setS = (patch: Partial<typeof S>) => {
  Object.assign(S, patch);
  notify();
};

export const inProj = (r: { project?: string }) => S.proj === "All" || r.project === S.proj;
export const isOpen = (r: { status: string }) => ["New", "Investigating", "Waiting on people", "Fix proposed"].includes(r.status);

/** Live-usage counters shown in the sidebar footer. */
export const USAGE = { gb: 1.8, gbMax: 5, calls: 212, callsMax: 500 };

/** Shapes returned by trace-api `/investigations` and `/projects/{id}/investigations/{run}`. */
export type RunRow = {
  id: string;
  project_id: string;
  project_name: string | null;
  control_run_id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | "waiting_for_input";
  created_at: string | null;
  window_start: string | null;
  window_end: string | null;
  ticket_id: string;
  ticket_display_id: string | null;
  title: string;
  severity: string | null;
  environment_key: string | null;
  steps: number;
  last_step: string | null;
  finding_status: string | null;
  finding_summary: string | null;
  gaps: number;
};

export type ToolRun = { name: string; template: string | null; coverage: Record<string, any>; items: number; item_ids: string[] };
export type StepOut = { sequence: number; kind: string; status: string; started_at: string | null; finished_at: string | null; duration_s: number | null; tools: ToolRun[] };
export type Hyp = { id: string; statement: string; status: "supported" | "plausible" | "contradicted" | "insufficient"; summary: string; supported_by: string[]; contradicted_by: string[] };
export type Claim = { text: string; kind: "observed_summary" | "inference" | "recommendation"; citations: Array<{ id: string; locator: string }> };
export type Finding = { status: string; summary: string; limitations: string[]; claims: Claim[] };
export type Evidence = {
  id: string;
  type: "log" | "code";
  title: string;
  src: string;
  content: string | null;
  content_hash: string | null;
  severity?: string | null;
  event_time?: string | null;
  route?: string | null;
  request_id?: string | null;
  deployment?: string | null;
  path?: string | null;
  start_line?: number | null;
  end_line?: number | null;
  commit?: string | null;
};
export type TimelineEvent = { lane: string; at: string | null; until?: string; label: string; detail: string | null; tone: string };
export type GraphNode = { id: string; label: string; kind: string; status?: string; count?: number; severity?: string; detail?: string };
export type ImpactRow = { target_id: string; name: string; label: string; categories: string[]; scope: Record<string, any>; evidence: string[] };

export type RunDetail = {
  run: { id: string; control_run_id: string; status: RunRow["status"]; window_start: string | null; window_end: string | null; evidence_cutoff: string | null; created_at: string | null };
  ticket: { id: string; title: string; reported_at: string | null; display_id?: string; severity?: string | null; environment_key?: string | null; status?: string; description?: string; service_hint?: string | null };
  project: { id: string; name: string | null };
  steps: StepOut[];
  hypotheses: Hyp[];
  finding: Finding | null;
  resolution: { actions: string[]; verify: string[] } | null;
  gaps: Array<{ kind: string; description: string; status: string }>;
  impact: ImpactRow[];
  blast: { target: { id: string; name: string } | null; callers: Array<{ id: string; name: string; path: string; observed: boolean }>; suspects: any[]; located: any[]; failure_rate: string | null };
  coverage: Array<[string, "good" | "warn" | "miss"]>;
  timeline: TimelineEvent[];
  evidence: Evidence[];
  items: number;
  answers: Array<{ id: string; question: string; answer: string; at: string | null; citations: Array<{ id: string; locator?: string }> }>;
  graph: { nodes: GraphNode[]; edges: Array<{ source: string; target: string; type: string }> };
};

export const STEP_TITLE: Record<string, [title: string, icon: string]> = {
  scope: ["Scope the ticket", "layers"],
  deployments: ["Find what was deployed", "commit"],
  logs: ["Read the logs and observations", "search"],
  code: ["Locate and read the code", "code"],
  changes: ["Check what changed", "commit"],
  blast_radius: ["Map what could be affected", "network"],
  hypotheses: ["Propose and test hypotheses", "spark"],
  impact: ["Assess impact", "alert"],
  report: ["Write the finding", "check"],
};

export const FINDING: Record<string, [cls: string, label: string]> = {
  root_cause_identified: ["good", "Root cause identified"],
  insufficient_evidence: ["ins", "Not enough evidence"],
  no_failure_observed: ["mute", "No failure observed"],
};

export const hm = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "unknown");
export const ago = (iso?: string | null) => {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

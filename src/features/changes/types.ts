export type ChangeRow = {
  id: string; display_id: string; project_id: string; project_name: string; title: string; risk: "low" | "medium" | "high"; status: string;
  environment_key: string | null; approved: number; needed: number; files: string[]; version: number; run_id: string; updated_at: string; created_at: string;
};
export type PatchFile = { path: string; additions: number; deletions: number; diff: string; before_hash: string };
export type ChangeDetail = {
  id: string; display_id: string; project_id: string; project_name: string | null; run_id: string; ticket_id: string | null; ticket_display_id: string | null;
  title: string; rationale: string; risk: "low" | "medium" | "high"; environment_key: string | null; status: string; current_version: number; version: number;
  current: { version: number; content_hash: string; base_commit: string; files: PatchFile[]; summary: string; risk_reason: string; tests: string[]; rollback: string;
    checks: Array<{ path: string; check: string; result: string; detail?: string }>; test_status: string; instruction: string | null };
  versions: Array<{ version: number; content_hash: string; created_at: string; instruction: string | null }>;
  policy: { required_approvals: number; author_can_approve: boolean };
  approvals: Array<{ actor: string; decision: string; reason: string | null; patch_version: number; current: boolean; revoked: boolean; at: string; mine: boolean }>;
  approved_count: number; rejected_count: number;
  eligibility: { can_approve: boolean; reason: string | null };
  draft_pr: { available: boolean; reason: string };
};
export const STATUS: Record<string, [label: string, tone: string]> = {
  proposed: ["Needs approval", "warn"], approved: ["Approved", "good"], rejected: ["Rejected", "crit"], withdrawn: ["Withdrawn", "mute"],
  draft_pr_opened: ["Draft PR opened", "vio"], merged: ["Merged", "good"],
};
export const RISK: Record<string, string> = { low: "good", medium: "warn", high: "crit" };

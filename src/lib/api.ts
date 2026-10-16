/** Minimal typed client for trace-api. No token: the API runs with AUTH_MODE=off for now (see trace-api docs/WEB_INTEGRATION.md). */

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "") + "/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public requestId: string,
    public status: number,
  ) {
    super(message);
  }
}

export type Envelope<T> = { data: T; meta?: { request_id?: string; as_of?: string; coverage?: Record<string, unknown> } };

export async function api<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, { ...init, headers: { "content-type": "application/json", ...(init?.headers || {}) }, cache: "no-store" });
  } catch {
    throw new ApiError("The TRACE API is not reachable. Is it running?", "unreachable", "-", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error;
    throw new ApiError(e?.message || res.statusText, e?.code || "error", body?.request_id || "-", res.status);
  }
  return body as Envelope<T>;
}

/* ------------------------------------------------------------------ evidence graph */
export type GraphBuild = { build_id: string; repository: string; commit_sha: string; extractor: string; counts: string; built_at: string };
export type GraphNode = { id: string; label: string; kind: string; file: string; line: number; community: string | null; degree: number };
export type GraphEdge = { source: string; target: string; relation: string; derivation: string; locator: string };
export type GraphCommunity = { id: string; label: string; symbols: number };
export type CodeGraphData = {
  status: "none" | "ready";
  builds: GraphBuild[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  communities: GraphCommunity[];
  truncated: boolean;
};
export type SymbolRef = { id: string; name: string; file: string; relation: string; derivation: string; locator: string };
export type SymbolDetail = {
  name: string;
  kind: string;
  start: number;
  end: number;
  file: string;
  used_by: SymbolRef[];
  uses: SymbolRef[];
  chunks: Array<{ start: number; end: number; content: string; hash: string }>;
};
export type ProjectRow = { id: string; name: string };
export type IndexRun = {
  id: string;
  repository_binding_id: string;
  repository: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  stage: string | null;
  requested_ref: string;
  commit_sha: string | null;
  build_id: string | null;
  counts: { files: number; chunks: number; symbols: number; edges: Record<string, number>; skipped_files: number } | null;
  gaps: Record<string, number> | null;
  extractor: string | null;
  error: { code: string; message: string } | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

"use client";
import { useMemo, useState } from "react";
import type { GraphNode } from "./types";

type Edge = { source: string; target: string; type: string };
const COLS: Array<[string[], string]> = [
  [["ticket", "run"], "Report"],
  [["service", "deployment", "revision", "change"], "What ran"],
  [["logs"], "Evidence"],
  [["symbol"], "Code"],
];
const FILL: Record<string, string> = { ticket: "var(--s1)", run: "var(--s1)", service: "var(--ink2)", deployment: "var(--accent)", revision: "var(--accent)", change: "var(--accent)", logs: "var(--crit)", symbol: "var(--good)" };

/** The subgraph this run reasoned over, laid out in four columns from the report to the code. Static layout: no animation, no surprises. */
export function EvidenceGraph({ nodes, edges }: { nodes: GraphNode[]; edges: Edge[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const W = 640, rowH = 50, pad = 28;
  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    COLS.forEach(([kinds], ci) => {
      const col = nodes.filter((n) => kinds.includes(n.kind));
      col.forEach((n, i) => m.set(n.id, { x: 80 + (ci * (W - 160)) / (COLS.length - 1), y: pad + 26 + i * rowH }));
    });
    return m;
  }, [nodes]);
  const H = Math.max(180, Math.max(...Array.from(pos.values()).map((p) => p.y), 0) + pad + 20);
  if (!nodes.length) return <p className="sm muted" style={{ padding: 16 }}>The map fills in as TRACE retrieves evidence.</p>;
  const hot = new Set(sel ? edges.filter((e) => e.source === sel || e.target === sel).flatMap((e) => [e.source, e.target]) : []);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evidence graph for this investigation" style={{ width: "100%", height: "auto", display: "block" }}>
      {COLS.map(([, label], ci) => <text key={label} x={80 + (ci * (W - 160)) / (COLS.length - 1)} y={12} textAnchor="middle" fontSize="10" fill="var(--mute)">{label}</text>)}
      {edges.map((e, i) => {
        const a = pos.get(e.source), b = pos.get(e.target);
        if (!a || !b) return null;
        const on = !sel || e.source === sel || e.target === sel;
        return <path key={i} d={`M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`} fill="none" stroke={e.type === "LOCATES" ? "var(--crit)" : "var(--line2, var(--line))"} strokeWidth={on ? 1.6 : 0.6} opacity={on ? 1 : 0.35} />;
      })}
      {nodes.map((n) => {
        const p = pos.get(n.id);
        if (!p) return null;
        const dim = sel && sel !== n.id && !hot.has(n.id);
        return (
          <g key={n.id} transform={`translate(${p.x},${p.y})`} style={{ cursor: "pointer", opacity: dim ? 0.35 : 1 }} onClick={() => setSel(sel === n.id ? null : n.id)} tabIndex={0} role="button" aria-label={n.label} onKeyDown={(e) => e.key === "Enter" && setSel(sel === n.id ? null : n.id)}>
            <circle r={n.status === "changed" ? 9 : 7} fill={FILL[n.kind] || "var(--ink2)"} stroke={n.status === "changed" ? "var(--crit)" : "var(--bg)"} strokeWidth={n.status === "changed" ? 2.5 : 2} />
            <text x={0} y={-12} textAnchor="middle" fontSize="10.5" fill="var(--ink)">{n.label.length > 24 ? n.label.slice(0, 23) + "…" : n.label}</text>
            <title>{[n.kind, n.label, n.detail].filter(Boolean).join(" · ")}</title>
          </g>
        );
      })}
    </svg>
  );
}

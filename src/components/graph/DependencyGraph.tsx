"use client";
import { useRef, useState } from "react";
import { EDGES, NODES, ZONE } from "@/data/graph";

export type NodeState = Record<string, { s?: string; r?: string }>;
export type GraphLayers = { observed?: number; declared?: number; inferred?: number };

const NODE: Record<string, any> = {};
NODES.forEach((n: any) => (NODE[n.id] = n));

const nw = (n: any) => (n.kind === "journey" ? 116 : 152);
const nh = (n: any) => (n.kind === "journey" ? 34 : 44);

function edgePath(a: string, b: string) {
  const A = NODE[a], B = NODE[b];
  if (Math.abs(A.x - B.x) < 5) {
    const y1 = A.y + (B.y > A.y ? nh(A) / 2 : -nh(A) / 2);
    const y2 = B.y + (B.y > A.y ? -nh(B) / 2 : nh(B) / 2);
    return `M${A.x} ${y1}L${B.x} ${y2}`;
  }
  const fw = B.x > A.x;
  const x1 = A.x + (fw ? nw(A) / 2 : -nw(A) / 2);
  const x2 = B.x + (fw ? -nw(B) / 2 : nw(B) / 2);
  const dx = (x2 - x1) / 2;
  return `M${x1} ${A.y}C${x1 + dx} ${A.y} ${x2 - dx} ${B.y} ${x2} ${B.y}`;
}

export function stateOf(id: string, st: NodeState, phase: string) {
  let s = (st[id] || {}).s || "ok";
  if (phase === "before") return "ok";
  if (phase === "onset" && s === "fail") return "degr";
  return s;
}

export function GraphLegend({ mode }: { mode?: "topo" | "blast" }) {
  return (
    <div className="glegend">
      <span><i style={{ borderColor: "var(--good)" }} />Healthy</span>
      <span><i style={{ borderColor: "var(--warn)" }} />Degraded</span>
      <span><i style={{ borderColor: "var(--crit)" }} />Failing</span>
      <span>
        <i style={{ borderColor: "var(--mute)", background: "repeating-linear-gradient(45deg,var(--line2) 0 2px,transparent 2px 5px)" }} />
        No telemetry
      </span>
      {mode === "blast" ? (
        <>
          <span><i style={{ borderColor: "var(--accent)", borderWidth: 3 }} />Direct change</span>
          <span><i style={{ borderColor: "var(--warn)", borderStyle: "dashed" }} />Potential propagation</span>
        </>
      ) : null}
      <span style={{ marginLeft: "auto", color: "var(--mute)" }}>Solid: observed · dashed: declared · dotted: inferred</span>
    </div>
  );
}

/** Port of `graphSVG()` + `bindGraph()`: nodes are keyboard-focusable buttons, edges show a tooltip. */
export function DependencyGraph({
  state = {},
  phase = "now",
  layers = { observed: 1, declared: 1, inferred: 1 },
  sel = null,
  mode = "topo",
  onSelect,
  id,
}: {
  state?: NodeState;
  phase?: string;
  layers?: GraphLayers;
  sel?: string | null;
  mode?: "topo" | "blast";
  onSelect?: (id: string) => void;
  id?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const roleOn = mode === "blast";

  const at = (clientX: number, clientY: number) => {
    const w = wrap.current!.getBoundingClientRect();
    return { x: clientX - w.left, y: clientY - w.top };
  };

  return (
    <div ref={wrap} style={{ position: "relative" }} id={id}>
      <svg viewBox="0 0 900 540" role="img" aria-label="Service dependency graph">
        <defs>
          <pattern id="hz" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--bg)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--axis)" strokeWidth="2" />
          </pattern>
        </defs>
        <rect x={ZONE.x} y={ZONE.y} width={ZONE.w} height={ZONE.h} rx="16" fill="var(--accent-soft)" stroke="var(--accent-line)" strokeDasharray="5 5" opacity=".7" />
        <text x={ZONE.x + 12} y={ZONE.y - 8} style={{ font: "10.5px var(--f-mono)", fill: "var(--mute)" }}>{ZONE.label}</text>
        {EDGES.map((e: any, i: number) => {
          if (!(layers as any)[e[2]]) return null;
          const sa = stateOf(e[0], state, phase), sb = stateOf(e[1], state, phase);
          const bad = (sb === "fail" || (sa === "fail" && sb !== "ok")) && e[3];
          const hl = sel && (e[0] === sel || e[1] === sel), dim = sel && !hl;
          const d = edgePath(e[0], e[1]);
          return (
            <g key={i}>
              <path
                className={`ge ${e[2] === "inferred" ? "inferred" : "flow"} ${bad ? "bad" : ""} ${dim ? "dim" : ""}`}
                d={d}
                style={hl ? { stroke: "var(--ink)", strokeWidth: 2.2 } : undefined}
              />
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth="14"
                onMouseMove={(ev) => {
                  const p = at(ev.clientX, ev.clientY);
                  setTip({ text: `${NODE[e[0]].label} → ${NODE[e[1]].label} · ${e[2]}${e[3] ? " · required" : " · optional"} · ${e[4]}`, ...p });
                }}
                onMouseLeave={() => setTip(null)}
              />
            </g>
          );
        })}
        {NODES.map((n: any) => {
          const s = stateOf(n.id, state, phase), r = (state[n.id] || {}).r, w = nw(n), h = nh(n), x = n.x - w / 2, y = n.y - h / 2;
          const col = s === "fail" ? "var(--crit)" : s === "degr" ? "var(--warn)" : s === "unk" ? "var(--mute)" : "var(--good)";
          const fill = s === "fail" ? "color-mix(in srgb,var(--crit) 10%,var(--bg))" : s === "degr" ? "color-mix(in srgb,var(--warn) 12%,var(--bg))" : s === "unk" ? "url(#hz)" : "var(--bg)";
          const rx = n.kind === "journey" ? 17 : n.kind === "resource" ? 6 : 10;
          const isSel = sel === n.id;
          return (
            <g
              key={n.id}
              className="gn"
              tabIndex={0}
              role="button"
              aria-label={`${n.label}, ${s}`}
              onClick={() => onSelect?.(n.id)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") onSelect?.(n.id);
              }}
              onMouseEnter={(ev) => {
                const rr = (ev.currentTarget as SVGGElement).getBoundingClientRect();
                const w2 = wrap.current!.getBoundingClientRect();
                setTip({ text: `${n.label} · ${n.kind}`, x: rr.left - w2.left + rr.width / 2, y: rr.top - w2.top });
              }}
              onMouseLeave={() => setTip(null)}
            >
              {s === "fail" ? <circle className="rip" cx={n.x} cy={n.y} r="20" /> : null}
              {roleOn && phase === "now" && r === "direct" ? (
                <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={rx + 5} fill="none" stroke="var(--accent)" strokeWidth="2.4" />
              ) : null}
              {roleOn && phase === "now" && r === "prop" ? (
                <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={rx + 5} fill="none" stroke="var(--warn)" strokeWidth="1.6" strokeDasharray="4 3" />
              ) : null}
              <rect className="nb" x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={isSel ? "var(--ink)" : col} strokeWidth={isSel ? 2.8 : 1.7} strokeDasharray={n.kind === "resource" ? "0" : undefined} />
              {n.kind === "resource" ? <line x1={x + 8} x2={x + w - 8} y1={y + 9} y2={y + 9} stroke={col} opacity=".35" /> : null}
              <text x={n.x} y={n.sub && n.kind !== "journey" ? n.y - 1 : n.y + 4} textAnchor="middle">{n.label}</text>
              {n.kind !== "journey" ? (
                <text className="sub" x={n.x} y={n.y + 13} textAnchor="middle">{n.sub}</text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className={`gtip${tip ? " on" : ""}`} style={tip ? { left: tip.x, top: tip.y } : undefined}>
        {tip?.text}
      </div>
    </div>
  );
}

export const NODE_BY_ID = NODE;

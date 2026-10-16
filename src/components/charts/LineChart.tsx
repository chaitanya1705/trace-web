"use client";
import { useRef, useState } from "react";
import { clock, niceMax } from "@/lib/util";

export type Series = { name: string; color: string; pts: Array<[number, number]>; dash?: number | boolean };
export type LineChartProps = {
  series: Series[];
  t0?: string;
  xmax?: number;
  ymax?: number;
  unit?: string;
  ref?: { y: number; label: string } | null;
  marks?: Array<{ x: number; label: string; c: string }>;
  h?: number;
  W?: number;
  xstep?: number;
  xfmt?: (m: number) => string;
  label?: string;
};

/** Port of the prototype's `lineChart()` plus its hover tooltip (`bindCharts`). */
export function LineChart(o: LineChartProps) {
  const W = o.W || 640, H = o.h || 230, L = 48, R = 16, T = 18, B = 28, xm = o.xmax || 26;
  const ymax =
    o.ymax || niceMax(Math.max(...o.series.flatMap((s) => s.pts.map((p) => p[1])), o.ref ? o.ref.y : 0) * 1.05);
  const sx = (x: number) => L + (x / xm) * (W - L - R);
  const sy = (y: number) => T + (1 - y / ymax) * (H - T - B);
  const xf = o.xfmt || ((m: number) => clock(o.t0 || "00:00", m));
  const step = o.xstep || (W < 420 ? 10 : 5);
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [tipLeft, setTipLeft] = useState(0);

  const grid = [];
  for (let i = 0; i <= 4; i++) {
    const v = (ymax * i) / 4, y = sy(v);
    grid.push(
      <g key={"g" + i}>
        <line className="grid" x1={L} x2={W - R} y1={y} y2={y} />
        <text x={L - 8} y={y + 4} textAnchor="end">
          {v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k" : +v.toFixed(v < 10 ? 1 : 0)}
        </text>
      </g>,
    );
  }
  const xs = [];
  for (let m = 0; m <= xm; m += step)
    xs.push(
      <text key={"x" + m} x={sx(m)} y={H - 8} textAnchor="middle">
        {xf(m)}
      </text>,
    );

  const onMove = (e: React.MouseEvent) => {
    const svg = box.current?.querySelector("svg");
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const m = Math.max(0, Math.min(xm, Math.round(((px - L) / (W - L - R)) * xm)));
    setHover(m);
    setTipLeft(Math.min(r.width - 150, Math.max(0, (sx(m) / W) * r.width + 10)));
  };

  return (
    <>
      <div className="chartbox" ref={box} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={o.label || "chart"}>
          {grid}
          {xs}
          <line className="ax" x1={L} x2={W - R} y1={H - B} y2={H - B} />
          {o.ref ? (
            <>
              <line x1={L} x2={W - R} y1={sy(o.ref.y)} y2={sy(o.ref.y)} stroke="var(--crit)" strokeDasharray="5 4" strokeWidth={1.4} />
              <text x={W - R} y={sy(o.ref.y) - 5} textAnchor="end" style={{ fill: "var(--crit-ink)" }}>
                {o.ref.label}
              </text>
            </>
          ) : null}
          {(o.marks || []).map((m) => (
            <g key={m.label + m.x}>
              <line x1={sx(m.x)} x2={sx(m.x)} y1={T} y2={H - B} stroke={m.c} strokeDasharray="3 3" strokeWidth={1.3} />
              <text x={sx(m.x) + 4} y={T + 9} style={{ fill: m.c }}>
                {m.label}
              </text>
            </g>
          ))}
          {o.series.map((s, i) => {
            const d = s.pts.map((p, j) => (j ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(p[1]).toFixed(1)).join("");
            const e = s.pts[s.pts.length - 1];
            return (
              <g key={s.name}>
                {i === 0 && !s.dash ? (
                  <path d={`${d}L${sx(e[0])} ${H - B}L${sx(s.pts[0][0])} ${H - B}Z`} fill={s.color} opacity={0.1} className="fadein" />
                ) : null}
                <path
                  className="draw"
                  style={{ ["--len" as string]: Math.round(W * 2.2) }}
                  d={d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={s.dash ? "6 4" : undefined}
                />
                <circle className="fadein" cx={sx(e[0])} cy={sy(e[1])} r={4} fill={s.color} stroke="var(--bg)" strokeWidth={2} />
              </g>
            );
          })}
          <line
            y1={T}
            y2={H - B}
            x1={hover === null ? 0 : sx(hover)}
            x2={hover === null ? 0 : sx(hover)}
            stroke="var(--ink)"
            strokeWidth={1}
            opacity={hover === null ? 0 : 0.35}
          />
        </svg>
        <div className={`ctip${hover === null ? "" : " on"}`} style={{ left: tipLeft, top: 10 }}>
          {hover !== null ? (
            <>
              <b className="mono">{xf(hover)}</b>
              {o.series.map((s) => {
                const p = s.pts.find((q) => q[0] === hover);
                return p ? (
                  <span key={s.name}>
                    <br />
                    <span style={{ color: s.color }}>●</span> {s.name}:{" "}
                    <b className="tnum">
                      {p[1]}
                      {o.unit || ""}
                    </b>
                  </span>
                ) : null;
              })}
            </>
          ) : null}
        </div>
      </div>
      {o.series.length > 1 ? (
        <div className="cleg">
          {o.series.map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}

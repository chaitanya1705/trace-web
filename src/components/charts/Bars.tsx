"use client";
import { useEffect, useState } from "react";
import { niceMax } from "@/lib/util";

/**
 * Horizontal fill that animates from 0 to its target width after mount
 * (the prototype's data-w attribute plus fillBars()).
 */
export function FillBar({ w, className = "", style }: { w: number; className?: string; style?: React.CSSProperties }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let b = 0;
    const a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => setV(w));
    });
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, [w]);
  return <i className={className} style={{ ...style, width: v + "%" }} />;
}

/** Evidence bar used on hypothesis cards: supporting, contradicting, missing. */
export function EvBar({ f, a, g }: { f: number; a: number; g: number }) {
  const t = Math.max(1, f + a + g);
  return (
    <div className="ev-bar" aria-hidden="true">
      <FillBar className="for" w={(f / t) * 100} />
      <FillBar className="against" w={(a / t) * 100} />
      <FillBar className="gap" w={(g / t) * 100} />
    </div>
  );
}

export function HBars({ rows, color }: { rows: Array<[string, number]>; color: string }) {
  const mx = Math.max(...rows.map((r) => r[1]));
  return (
    <div className="stack" style={{ gap: 11 }}>
      {rows.map((r, i) => (
        <div key={r[0]}>
          <div className="row sm" style={{ justifyContent: "space-between" }}>
            <span>{r[0]}</span>
            <b className="tnum">{r[1]}</b>
          </div>
          <div className="meter" style={{ height: 8, marginTop: 5 }}>
            <FillBar w={(r[1] / mx) * 100} style={{ background: color, transitionDelay: i * 0.07 + "s" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StackedBars({
  rows,
  keys,
  colors,
  labels,
}: {
  rows: Array<Record<string, any>>;
  keys: string[];
  colors: string[];
  labels: string[];
}) {
  const W = 640, H = 230, L = 40, R = 10, T = 14, B = 28, n = rows.length;
  const tot = (r: Record<string, any>) => keys.reduce((a, k) => a + r[k], 0);
  const ym = niceMax(Math.max(...rows.map(tot)));
  const bw = (W - L - R) / n;
  const sy = (v: number) => T + (1 - v / ym) * (H - T - B);
  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weekly diagnosis outcomes">
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (ym * i) / 4;
          return (
            <g key={i}>
              <line className="grid" x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} />
              <text x={L - 8} y={sy(v) + 4} textAnchor="end">
                {v}
              </text>
            </g>
          );
        })}
        {rows.map((r, i) => {
          let acc = 0;
          const x = L + i * bw + bw * 0.18, w = bw * 0.64;
          return (
            <g key={r.w}>
              {keys.map((k, j) => {
                const y1 = sy(acc + r[k]), y0 = sy(acc);
                acc += r[k];
                return r[k] ? (
                  <rect
                    key={k}
                    x={x}
                    y={y1 + 1}
                    width={w}
                    height={Math.max(0, y0 - y1 - 2)}
                    rx={3}
                    fill={colors[j]}
                    style={{ transformOrigin: `${x}px ${H - B}px`, animation: `grow2 .7s ${i * 0.05}s both` }}
                  >
                    <title>{`${r.w} · ${labels[j]}: ${r[k]}`}</title>
                  </rect>
                ) : null;
              })}
              <text x={x + w / 2} y={H - 9} textAnchor="middle">
                {r.w}
              </text>
            </g>
          );
        })}
        <line className="ax" x1={L} x2={W - R} y1={H - B} y2={H - B} />
      </svg>
      <div className="cleg">
        {labels.map((l, j) => (
          <span key={l}>
            <i style={{ background: colors[j] }} />
            {l}
          </span>
        ))}
      </div>
    </>
  );
}

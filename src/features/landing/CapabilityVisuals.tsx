import type { CSSProperties, ReactNode } from "react";
import { Badge, HypBadge } from "@/components/ui/Badge";
import { KpiIcon } from "@/components/ui/Kpis";
import { clock, niceMax, rng } from "@/lib/util";

/**
 * ILLUSTRATIONS for the landing page's capability rows. Every service, number and event below is invented sample
 * content, labelled as such. Nothing here is imported by the workspace, and none of it is real evidence.
 */

const SampleNote = () => <div className="xs muted" style={{ marginTop: 12 }}>Sample data</div>;

/* ------------------------------------------------------------ line chart (static) */
type Series = { name: string; color: string; pts: Array<[number, number]>; dash?: boolean };
function LineChart({ series, t0 = "00:00", xmax = 26, xstep, xfmt, ymax: ym, refLine, label, h = 230 }: {
  series: Series[]; t0?: string; xmax?: number; xstep?: number; xfmt?: (m: number) => string; ymax?: number;
  refLine?: { y: number; label: string }; label: string; h?: number;
}) {
  const W = 640, H = h, L = 48, R = 16, T = 18, B = 28;
  const ymax = ym || niceMax(Math.max(...series.flatMap((s) => s.pts.map((p) => p[1])), refLine ? refLine.y : 0) * 1.05);
  const sx = (x: number) => L + (x / xmax) * (W - L - R), sy = (y: number) => T + (1 - y / ymax) * (H - T - B);
  const xf = xfmt || ((m: number) => clock(t0, m));
  const ticks: number[] = [];
  for (let m = 0; m <= xmax; m += xstep || 5) ticks.push(m);
  return (
    <>
      <div className="chartbox">
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
          {[0, 1, 2, 3, 4].map((i) => {
            const v = (ymax * i) / 4, y = sy(v);
            return (
              <g key={i}>
                <line className="grid" x1={L} x2={W - R} y1={y} y2={y} />
                <text x={L - 8} y={y + 4} textAnchor="end">{+v.toFixed(v < 10 ? 1 : 0)}</text>
              </g>
            );
          })}
          {ticks.map((m) => <text key={m} x={sx(m)} y={H - 8} textAnchor="middle">{xf(m)}</text>)}
          <line className="ax" x1={L} x2={W - R} y1={H - B} y2={H - B} />
          {refLine ? (
            <>
              <line x1={L} x2={W - R} y1={sy(refLine.y)} y2={sy(refLine.y)} stroke="var(--crit)" strokeDasharray="5 4" strokeWidth={1.4} />
              <text x={W - R} y={sy(refLine.y) - 5} textAnchor="end" style={{ fill: "var(--crit-ink)" }}>{refLine.label}</text>
            </>
          ) : null}
          {series.map((s, i) => {
            const d = s.pts.map((p, j) => (j ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(p[1]).toFixed(1)).join("");
            const e = s.pts[s.pts.length - 1];
            return (
              <g key={s.name}>
                {i === 0 && !s.dash ? <path d={`${d}L${sx(e[0])} ${H - B}L${sx(s.pts[0][0])} ${H - B}Z`} fill={s.color} fillOpacity={0.1} className="fadein" /> : null}
                <path className={s.dash ? undefined : "draw"} style={s.dash ? undefined : ({ ["--len" as string]: Math.round(W * 2.2) } as CSSProperties)} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dash ? "6 4" : undefined} />
                <circle className="fadein" cx={sx(e[0])} cy={sy(e[1])} r={4} fill={s.color} stroke="var(--bg)" strokeWidth={2} />
              </g>
            );
          })}
        </svg>
      </div>
      {series.length > 1 ? <div className="cleg">{series.map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}</div> : null}
    </>
  );
}

/* ------------------------------------------------------------ Hypotheses */
const HYPS = [
  { id: "H1", title: "Payment timeout lowered to 800 ms is cutting off slow-but-healthy provider calls", status: "supported", f: 4, a: 0, g: 1 },
  { id: "H2", title: "Provider latency degraded and caused the timeouts", status: "contradicted", f: 0, a: 1, g: 0 },
  { id: "H3", title: "Cache connection pool exhaustion is delaying payment calls", status: "plausible", f: 0, a: 0, g: 2 },
  { id: "H4", title: "A wider infrastructure issue in the region is affecting several services", status: "contradicted", f: 0, a: 1, g: 0 },
];
function HypothesesViz() {
  return (
    <div className="stack">
      {HYPS.map((h) => {
        const t = Math.max(1, h.f + h.a + h.g);
        return (
          <div className="hyp" key={h.id}>
            <div className="row" style={{ justifyContent: "space-between" }}><span className="hid">{h.id}</span><HypBadge s={h.status} /></div>
            <h4>{h.title}</h4>
            <div className="ev-bar" aria-hidden="true">
              <i className="for" style={{ width: `${(h.f / t) * 100}%` }} />
              <i className="against" style={{ width: `${(h.a / t) * 100}%` }} />
              <i className="gap" style={{ width: `${(h.g / t) * 100}%` }} />
            </div>
            <div className="legend"><span>{h.f} supporting</span><span>{h.a} contradicting</span><span>{h.g} missing</span></div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ Timeline */
const TL: Array<{ t: number; lane: string; label: string; c: string }> = [
  { t: 3, lane: "Changes", label: "Deploy #185 starts", c: "v" },
  { t: 6, lane: "Changes", label: "Timeout 2000→800", c: "v" },
  { t: 9, lane: "Failures", label: "First timeouts", c: "r" },
  { t: 11, lane: "Failures", label: "Alert fires", c: "r" },
  { t: 14, lane: "Failures", label: "Checkout drops", c: "r" },
  { t: 7, lane: "Runtime", label: "Provider p50 flat", c: "g" },
  { t: 16, lane: "Runtime", label: "Aborts at 800 ms", c: "b" },
  { t: 13, lane: "Investigation", label: "Opened", c: "k" },
  { t: 19, lane: "Investigation", label: "4 hypotheses", c: "k" },
  { t: 24, lane: "Investigation", label: "Finding drafted", c: "k" },
];
const TL_COLOR: Record<string, string> = { v: "var(--accent)", r: "var(--crit)", g: "var(--good)", b: "var(--s1)", k: "var(--ink)" };
function TimelineViz() {
  const T0 = "11:55", onset = 9, sel = 2;
  return (
    <>
      <div className="tl">
        <div className="tl-in">
          <div className="tl-axis">{[0, 5, 10, 15, 20, 25, 30].map((m) => <span key={m} style={{ left: `${(m / 30) * 100}%` }}>{clock(T0, m)}</span>)}</div>
          <div className="tl-now" style={{ left: `calc(116px + (100% - 116px) * ${onset / 30})` }} />
          {["Changes", "Failures", "Runtime", "Investigation"].map((l) => (
            <div className="tl-lane" key={l}>
              <div className="nm">{l}</div>
              <div className="tr">
                {l === "Failures" ? <div className="tl-span" style={{ left: `${(9 / 30) * 100}%`, width: `${(17 / 30) * 100}%` }} /> : null}
                {TL.map((e, k) => ({ e, k })).filter((x) => x.e.lane === l).map(({ e, k }, n) => (
                  <span key={k} className={`tl-ev${k === sel ? " on" : ""}`} style={{ left: `${(e.t / 30) * 100}%`, ["--c" as string]: TL_COLOR[e.c], animationDelay: `${k * 0.07}s`, flexDirection: n % 2 ? "column-reverse" : undefined } as CSSProperties}>
                    <i /><span>{e.label}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="row wrapr" style={{ justifyContent: "space-between" }}>
          <div><div className="eyebrow">Failures</div><h3 className="ct" style={{ fontSize: 16, marginTop: 2 }}>First timeouts</h3></div>
          <span className="mono sm muted">12:04:11 UTC</span>
        </div>
        <p className="sm ink2" style={{ margin: "10px 0" }}>First TimeoutError spans from payment.authorize at about 800 ms.</p>
        <div className="row wrapr sm muted"><span>Source: runtime logs</span><span>·</span><span className="evref">ev-34</span></div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ Blast radius graph */
type GNode = { id: string; label: string; kind: "journey" | "service" | "resource"; x: number; y: number; sub: string };
const NODES: GNode[] = [
  { id: "j-checkout", label: "Checkout", kind: "journey", x: 84, y: 150, sub: "customer journey" },
  { id: "j-renew", label: "Renewals", kind: "journey", x: 84, y: 360, sub: "customer journey" },
  { id: "web", label: "web-storefront", kind: "service", x: 250, y: 70, sub: "Next.js · Vercel" },
  { id: "checkout", label: "checkout-service", kind: "service", x: 250, y: 230, sub: "Node · container" },
  { id: "recs", label: "recommendations", kind: "service", x: 250, y: 420, sub: "Python · container" },
  { id: "payment", label: "payment-service", kind: "service", x: 450, y: 130, sub: "Node · container" },
  { id: "inventory", label: "inventory-service", kind: "service", x: 450, y: 270, sub: "Go · container" },
  { id: "order", label: "order-service", kind: "service", x: 450, y: 390, sub: "Node · container" },
  { id: "notif", label: "notification-svc", kind: "service", x: 450, y: 490, sub: "Python · function" },
  { id: "paygate", label: "Payment API", kind: "resource", x: 660, y: 60, sub: "external provider" },
  { id: "redis", label: "session-cache", kind: "resource", x: 660, y: 170, sub: "Redis" },
  { id: "pginv", label: "pg-inventory", kind: "resource", x: 660, y: 285, sub: "Postgres" },
  { id: "pgord", label: "pg-orders", kind: "resource", x: 660, y: 385, sub: "Postgres" },
  { id: "kafka", label: "order-events", kind: "resource", x: 660, y: 485, sub: "event topic" },
];
const EDGES: Array<[string, string, "observed" | "declared" | "inferred", 0 | 1]> = [
  ["j-checkout", "web", "observed", 0], ["j-checkout", "checkout", "observed", 1], ["j-renew", "payment", "observed", 1], ["j-renew", "order", "observed", 1],
  ["web", "checkout", "observed", 1], ["checkout", "payment", "observed", 1], ["checkout", "inventory", "observed", 1], ["checkout", "order", "observed", 1],
  ["checkout", "recs", "declared", 0], ["payment", "paygate", "observed", 1], ["payment", "redis", "observed", 0], ["inventory", "pginv", "observed", 1],
  ["inventory", "redis", "inferred", 0], ["order", "pgord", "observed", 1], ["order", "kafka", "observed", 0], ["kafka", "notif", "observed", 0],
];
const STATE: Record<string, { s: string; r?: string }> = {
  payment: { s: "fail", r: "direct" }, checkout: { s: "fail", r: "prop" }, "j-checkout": { s: "degr", r: "prop" }, "j-renew": { s: "ok", r: "prop" },
  order: { s: "ok", r: "prop" }, redis: { s: "unk", r: "unk" },
};
const ZONE = { x: 358, y: 88, w: 184, h: 226, label: "region-1 · cluster-a" };
const NODE: Record<string, GNode> = Object.fromEntries(NODES.map((n) => [n.id, n]));
const nw = (n: GNode) => (n.kind === "journey" ? 116 : 152), nh = (n: GNode) => (n.kind === "journey" ? 34 : 44);
function edgePath(a: string, b: string) {
  const A = NODE[a], B = NODE[b];
  if (Math.abs(A.x - B.x) < 5) {
    const y1 = A.y + (B.y > A.y ? nh(A) / 2 : -nh(A) / 2), y2 = B.y + (B.y > A.y ? -nh(B) / 2 : nh(B) / 2);
    return `M${A.x} ${y1}L${B.x} ${y2}`;
  }
  const fw = B.x > A.x, x1 = A.x + (fw ? nw(A) / 2 : -nw(A) / 2), x2 = B.x + (fw ? -nw(B) / 2 : nw(B) / 2), dx = (x2 - x1) / 2;
  return `M${x1} ${A.y}C${x1 + dx} ${A.y} ${x2 - dx} ${B.y} ${x2} ${B.y}`;
}
function BlastViz() {
  const st = (id: string) => STATE[id]?.s || "ok";
  return (
    <div className="gwrap">
      <svg viewBox="0 0 900 540" role="img" aria-label="Sample service dependency graph with blast radius">
        <defs>
          <pattern id="lhz" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--bg)" /><line x1="0" y1="0" x2="0" y2="6" stroke="var(--axis)" strokeWidth="2" />
          </pattern>
        </defs>
        <rect x={ZONE.x} y={ZONE.y} width={ZONE.w} height={ZONE.h} rx={16} fill="var(--accent-soft)" stroke="var(--accent-line)" strokeDasharray="5 5" opacity={0.7} />
        <text x={ZONE.x + 12} y={ZONE.y - 8} style={{ font: "10.5px var(--f-mono)", fill: "var(--mute)" }}>{ZONE.label}</text>
        {EDGES.map((e, i) => {
          const sa = st(e[0]), sb = st(e[1]), bad = (sb === "fail" || (sa === "fail" && sb !== "ok")) && e[3];
          return <path key={i} className={`ge ${e[2] === "inferred" ? "inferred" : "flow"}${bad ? " bad" : ""}`} d={edgePath(e[0], e[1])} />;
        })}
        {NODES.map((n) => {
          const s = st(n.id), r = STATE[n.id]?.r, w = nw(n), h = nh(n), x = n.x - w / 2, y = n.y - h / 2;
          const col = s === "fail" ? "var(--crit)" : s === "degr" ? "var(--warn)" : s === "unk" ? "var(--mute)" : "var(--good)";
          const fill = s === "fail" ? "color-mix(in srgb,var(--crit) 10%,var(--bg))" : s === "degr" ? "color-mix(in srgb,var(--warn) 12%,var(--bg))" : s === "unk" ? "url(#lhz)" : "var(--bg)";
          const rx = n.kind === "journey" ? 17 : n.kind === "resource" ? 6 : 10;
          return (
            <g className="gn" key={n.id} aria-label={`${n.label}, ${s}`}>
              {s === "fail" ? <circle className="rip" cx={n.x} cy={n.y} r={20} /> : null}
              {r === "direct" ? <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={rx + 5} fill="none" stroke="var(--accent)" strokeWidth={2.4} /> : null}
              {r === "prop" ? <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={rx + 5} fill="none" stroke="var(--warn)" strokeWidth={1.6} strokeDasharray="4 3" /> : null}
              <rect className="nb" x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={col} strokeWidth={1.7} />
              {n.kind === "resource" ? <line x1={x + 8} x2={x + w - 8} y1={y + 9} y2={y + 9} stroke={col} opacity={0.35} /> : null}
              <text x={n.x} y={n.kind !== "journey" ? n.y - 1 : n.y + 4} textAnchor="middle">{n.label}</text>
              {n.kind !== "journey" ? <text className="sub" x={n.x} y={n.y + 13} textAnchor="middle">{n.sub}</text> : null}
            </g>
          );
        })}
      </svg>
      <div className="glegend">
        <span><i style={{ borderColor: "var(--good)" }} />Healthy</span>
        <span><i style={{ borderColor: "var(--warn)" }} />Degraded</span>
        <span><i style={{ borderColor: "var(--crit)" }} />Failing</span>
        <span><i style={{ borderColor: "var(--mute)", background: "repeating-linear-gradient(45deg,var(--line2) 0 2px,transparent 2px 5px)" }} />No telemetry</span>
        <span><i style={{ borderColor: "var(--accent)", borderWidth: 3 }} />Direct change</span>
        <span><i style={{ borderColor: "var(--warn)", borderStyle: "dashed" }} />Potential propagation</span>
        <span style={{ marginLeft: "auto", color: "var(--mute)" }}>Solid: observed · dashed: declared · dotted: inferred</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Change impact */
const DIFF: Array<[string, string | number, string | number, string]> = [
  ["", 12, 12, "paygate:"], ["", 13, 13, "  base_url: https://api.provider.example"], ["del", 14, "", "  timeout_ms: 2000"],
  ["add", "", 14, "  timeout_ms: 800"], ["", 15, 15, "  retries: 1"], ["", 16, 16, "  idempotency: redis"],
];
const PREDICTED: Array<[string, string, "match" | "partial"]> = [
  ["Authorize calls above 800 ms will abort", "Observed: 38% abort at ~800 ms", "match"],
  ["Checkout success will fall", "Observed: 99.2% → 61%", "match"],
  ["Renewal charges at risk", "Observed: none yet (low volume)", "partial"],
  ["Provider error rate unchanged", "Observed: unchanged", "match"],
];
function ChangeViz() {
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row wrapr" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div><div className="eyebrow">Config · payment-service · 12:01 UTC</div><h3 className="ct" style={{ fontSize: 17, marginTop: 3 }}>payment-service: PAYMENT_TIMEOUT_MS 2000 → 800</h3></div>
        <Badge c="crit">Regression observed</Badge>
      </div>
      <div className="diff">
        {DIFF.map((l, k) => (
          <div key={k} className={`dl ${l[0]}`} style={{ ["--i" as string]: k } as CSSProperties}>
            <b>{l[1]}</b><b>{l[2]}</b><span>{l[0] === "add" ? "+ " : l[0] === "del" ? "− " : "  "}{l[3]}</span>
          </div>
        ))}
      </div>
      <table className="tbl" style={{ fontSize: 13 }}>
        <thead><tr><th>Predicted</th><th>Observed</th><th>Match</th></tr></thead>
        <tbody>
          {PREDICTED.map((x) => (
            <tr key={x[0]}><td>{x[0]}</td><td className="ink2">{x[1]}</td><td><Badge c={x[2] === "match" ? "good" : "warn"}>{x[2] === "match" ? "Matched" : "Partial"}</Badge></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------ Resolution */
function ResolutionViz() {
  const r = rng(5), pts: Array<[number, number]> = [];
  for (let x = 0; x <= 12; x++) {
    const v = x < 1 ? 38 : Math.max(0.3, 38 * Math.exp(-x / 1.6) + (r() - 0.5) * 0.8);
    pts.push([x, +v.toFixed(1)]);
  }
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="callout vio">
        <div className="eyebrow">Immediate mitigation</div>
        <div style={{ font: "500 17px/1.4 var(--f-body)", margin: "6px 0 4px", letterSpacing: "-.01em" }}>Restore PAYMENT_TIMEOUT_MS to 2000 for payment-service in production.</div>
      </div>
      <div className="steps">{["Recommended", "Attempted", "Verified"].map((s) => <div key={s} className="step done"><i>✓</i>{s}</div>)}</div>
      <div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Failure rate after the action (%)</div>
        <LineChart t0="12:24" xmax={12} series={[{ name: "Failure rate", color: "var(--s3)", pts }]} refLine={{ y: 0.5, label: "target 0.5%" }} label="Failure rate after the action" h={190} ymax={40} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ TRACE Bot */
function BotViz() {
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="msg u" style={{ maxWidth: "80%", alignSelf: "flex-end" }}>Why did checkout start failing at 12:03?</div>
      <div className="msg a">
        <div>The payment timeout was lowered from 2000 to 800 ms at 12:01. Provider p50 stayed near 690 ms, so a fixed 800 ms limit now aborts roughly one call in three. Failures began about three minutes after the change became active.</div>
        <div className="src"><span className="evref">ev-31</span><span className="evref">ev-12</span><span className="evref">ev-07</span></div>
        <div className="meta">One gap: cache pool wait metrics are not ingested yet.</div>
      </div>
      <div className="sugg" style={{ padding: 0 }}><span className="btn sm">Compare cache acquisition</span><span className="btn sm">What else shares this config?</span></div>
    </div>
  );
}

/* ------------------------------------------------------------ Analytics */
const WEEKS = ["W36", "W37", "W38", "W39", "W40", "W41", "W42", "W43"];
const MTTR = [52, 49, 47, 44, 40, 36, 31, 27], BASE = [54, 55, 52, 56, 53, 55, 54, 53];
const OUT_KEYS = ["Correct", "Partial", "Abstained", "Wrong"] as const;
const OUT: Record<(typeof OUT_KEYS)[number], number[]> = {
  Correct: [5, 6, 6, 7, 8, 8, 9, 10], Partial: [2, 2, 3, 2, 2, 2, 1, 1], Abstained: [1, 1, 1, 2, 2, 2, 2, 2], Wrong: [2, 2, 1, 1, 1, 0, 1, 0],
};
const OUT_COLORS = ["var(--s1)", "var(--s3)", "var(--s4)", "var(--s2)"];
const OUT_LABELS = ["Correct", "Partially correct", "Correctly abstained", "Wrong"];
function StackedBars() {
  const W = 640, H = 230, L = 40, R = 10, T = 14, B = 28, n = WEEKS.length;
  const tot = (i: number) => OUT_KEYS.reduce((a, k) => a + OUT[k][i], 0);
  const ym = niceMax(Math.max(...WEEKS.map((_, i) => tot(i))));
  const bw = (W - L - R) / n, sy = (v: number) => T + (1 - v / ym) * (H - T - B);
  const bars: ReactNode[] = [];
  WEEKS.forEach((w, i) => {
    let acc = 0;
    const x = L + i * bw + bw * 0.18, wd = bw * 0.64;
    OUT_KEYS.forEach((k, j) => {
      const v = OUT[k][i], y1 = sy(acc + v), y0 = sy(acc);
      acc += v;
      if (v) bars.push(<rect key={`${w}${k}`} x={x} y={y1 + 1} width={wd} height={Math.max(0, y0 - y1 - 2)} rx={3} fill={OUT_COLORS[j]} style={{ transformOrigin: `${x}px ${H - B}px`, animation: `grow2 .7s ${i * 0.05}s both` }}><title>{`${w} · ${OUT_LABELS[j]}: ${v}`}</title></rect>);
    });
    bars.push(<text key={`${w}t`} x={x + wd / 2} y={H - 9} textAnchor="middle">{w}</text>);
  });
  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weekly diagnosis outcomes">
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (ym * i) / 4;
          return <g key={i}><line className="grid" x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} /><text x={L - 8} y={sy(v) + 4} textAnchor="end">{v}</text></g>;
        })}
        {bars}
        <line className="ax" x1={L} x2={W - R} y1={H - B} y2={H - B} />
      </svg>
      <div className="cleg">{OUT_LABELS.map((l, j) => <span key={l}><i style={{ background: OUT_COLORS[j] }} />{l}</span>)}</div>
    </>
  );
}
function AnalyticsViz() {
  const kpis: Array<[string, string, string]> = [
    ["Median time to diagnosis", "27 min", "−48% vs baseline"], ["Diagnosis accuracy", "88%", "+9 pts vs 8 weeks ago"],
    ["Unsupported claims", "1.2%", "−3.1 pts"], ["Correct abstentions", "2 of 2", "insufficient-evidence cases"],
  ];
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid g4">
        {kpis.map((k) => (
          <div className="card kpi" key={k[0]}><div className="eyebrow"><KpiIcon label={k[0]} />{k[0]}</div><div className="v">{k[1]}</div><div className="delta up">{k[2]}</div></div>
        ))}
      </div>
      <div className="grid g2">
        <div className="card">
          <div className="ch"><div><h3 className="ct">Time to diagnosis</h3><p className="cs">Minutes from alert to a supported finding</p></div></div>
          <LineChart t0="00:00" xmax={7} xstep={1} xfmt={(m) => WEEKS[m]} ymax={60} label="Time to diagnosis" h={240}
            series={[{ name: "With TRACE", color: "var(--s1)", pts: MTTR.map((v, k) => [k, v]) }, { name: "Previous process", color: "var(--s2)", pts: BASE.map((v, k) => [k, v]), dash: true }]} />
        </div>
        <div className="card">
          <div className="ch"><div><h3 className="ct">Diagnosis outcomes</h3><p className="cs">Reviewed investigations per week</p></div></div>
          <StackedBars />
        </div>
      </div>
    </div>
  );
}

const VIZ: Record<string, () => ReactNode> = {
  Hypotheses: HypothesesViz, Timeline: TimelineViz, "Blast radius": BlastViz, "Change impact": ChangeViz,
  Resolution: ResolutionViz, "TRACE Bot": BotViz, Analytics: AnalyticsViz,
};

/** The illustrated visual for one capability row, keyed by its eyebrow. */
export function CapabilityViz({ k }: { k: string }) {
  const V = VIZ[k];
  if (!V) return null;
  return (
    <div className="l-viz rvx rvz" style={{ ["--d" as string]: ".15s" } as CSSProperties} aria-hidden="true">
      <V />
      <SampleNote />
    </div>
  );
}

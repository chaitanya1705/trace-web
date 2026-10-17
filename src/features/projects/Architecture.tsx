"use client";
import { useState } from "react";
import { call as api } from "@/lib/call";
import { ApiError } from "@/lib/api";
import { invalidate, useApi } from "@/lib/useApi";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Empty, ErrorState, Loading } from "@/components/ui/States";
import { CodeGraph } from "./CodeGraph";

/* ------------------------------------------------------------------ system map */
type MapNode = { id: string; kind: string; label: string; sub?: string | null; status?: string | null };
type MapEdge = { from: string; to: string; relation: string; origin: string; note?: string | null };
type SystemMap = { nodes: MapNode[]; edges: MapEdge[]; gaps: Array<{ kind: string; detail: string }>; provenance: string };

const COLS: Array<[kind: string, label: string]> = [
  ["repository", "Repositories"],
  ["service", "Services"],
  ["hosting", "Hosting projects"],
  ["environment", "Environments"],
  ["deployment", "Latest deployments"],
  ["database", "Database"],
];
const W = 190, H = 46, GX = 70, GY = 18, PAD = 20;
const KIND_COLOR: Record<string, string> = { repository: "var(--s1)", service: "var(--accent)", hosting: "var(--ink2)", environment: "var(--s3)", deployment: "var(--s4)", database: "var(--s2)" };

function layout(nodes: MapNode[]) {
  const cols = COLS.filter(([k]) => nodes.some((n) => n.kind === k));
  const pos: Record<string, { x: number; y: number }> = {};
  let maxRows = 1;
  cols.forEach(([k], ci) => {
    const ns = nodes.filter((n) => n.kind === k);
    maxRows = Math.max(maxRows, ns.length);
    ns.forEach((n, i) => (pos[n.id] = { x: PAD + ci * (W + GX), y: PAD + 26 + i * (H + GY) }));
  });
  return { cols, pos, width: PAD * 2 + cols.length * W + (cols.length - 1) * GX, height: PAD * 2 + 26 + maxRows * (H + GY) };
}

function SystemMapView({ pid }: { pid: string }) {
  const res = useApi<SystemMap>(`/projects/${pid}/system-map`);
  const [sel, setSel] = useState<string | null>(null);
  if (res.loading && !res.data) return <Loading label="Building the map" />;
  if (res.error) return <ErrorState error={res.error} onRetry={res.reload} />;
  const m = res.data!;
  const real = m.nodes.filter((n) => n.kind !== "environment" && n.kind !== "service");
  const { cols, pos, width, height } = layout(m.nodes);
  const touch = (e: MapEdge) => sel && (e.from === sel || e.to === sel);
  return (
    <div className="stack">
      <p className="cs">{m.provenance}</p>
      {!real.length ? (
        <div className="callout sm">Only environments and services are known so far. Connect hosting and code, choose Log scope and repositories, and sync deployments to fill in the map.</div>
      ) : null}
      <div className="gwrap" style={{ overflow: "auto", padding: 12 }}>
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="System map" style={{ maxWidth: "none", width, height }}>
          {cols.map(([k, label], ci) => (
            <text key={k} x={PAD + ci * (W + GX)} y={PAD + 8} className="cg-cl" fontSize="11" fill="var(--mute)">{label.toUpperCase()}</text>
          ))}
          {m.edges.map((e, i) => {
            const a = pos[e.from], b = pos[e.to];
            if (!a || !b) return null;
            const [l, r] = a.x <= b.x ? [a, b] : [b, a];
            const x1 = l.x + W, y1 = l.y + H / 2, x2 = r.x, y2 = r.y + H / 2, mx = (x1 + x2) / 2;
            const on = touch(e);
            return (
              <path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" strokeWidth={on ? 2 : 1.2}
                stroke={on ? "var(--accent)" : "var(--axis)"} strokeDasharray={e.origin === "provider_metadata" ? "5 4" : undefined} opacity={sel && !on ? 0.25 : 1}>
                <title>{`${e.relation} · ${e.origin === "configured" ? "configured in TRACE" : "from provider metadata"}${e.note ? " · " + e.note : ""}`}</title>
              </path>
            );
          })}
          {m.nodes.map((n) => {
            const p = pos[n.id];
            if (!p) return null;
            const warn = n.status && !["available", "READY", "connected", "connected_with_warnings"].includes(n.status);
            return (
              <g key={n.id} transform={`translate(${p.x},${p.y})`} tabIndex={0} role="button" aria-label={`${n.kind} ${n.label}`} style={{ cursor: "pointer" }}
                 onClick={() => setSel(sel === n.id ? null : n.id)} onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && setSel(sel === n.id ? null : n.id)}>
                <rect width={W} height={H} rx={10} fill="var(--bg)" stroke={sel === n.id ? "var(--accent)" : "var(--line)"} strokeWidth={sel === n.id ? 2 : 1} />
                <rect width={4} height={H} rx={2} fill={KIND_COLOR[n.kind] || "var(--ink2)"} />
                <text x={14} y={19} fontSize="12.5" fontWeight="600" fill="var(--ink)">{n.label.length > 24 ? n.label.slice(0, 23) + "…" : n.label}</text>
                <text x={14} y={35} fontSize="11" fill="var(--mute)">{(n.sub || n.kind).toString().slice(0, 28)}{warn ? " · !" : ""}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="glegend">
        <span>── configured in TRACE</span>
        <span>- - from provider metadata</span>
        <span>Click a box to highlight its links. Links seen in runtime logs are not drawn until log evidence exists.</span>
      </div>
      {m.gaps.length ? (
        <div className="card">
          <h3 className="ct" style={{ marginBottom: 8 }}>Not known yet</h3>
          {m.gaps.map((g, i) => (
            <div key={i} className="chk"><Badge c="warn">gap</Badge><span style={{ flex: 1, fontSize: 13 }}>{g.detail}</span></div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ database */
type Col = { name: string; type: string; nullable: boolean; primary_key: boolean; default: string | null };
type Fk = { name: string; columns: string[]; ref_schema: string; ref_table: string; ref_columns: string[] };
type Tbl = { schema: string; name: string; kind: string; approx_rows: number; columns: Col[]; primary_key: string[]; foreign_keys: Fk[]; unique: string[][]; indexes: Array<{ name: string; columns: string[]; unique: boolean }> };
type Schema = {
  connected: boolean;
  connection: { id: string; status: string; host: string | null; database: string | null } | null;
  captured: boolean;
  snapshot: { captured_at: string; database: string; server_version: string; table_count: number; column_count: number; truncated: boolean; tables: Tbl[] } | null;
  last_job: { id: string; status: string; stage: string | null; error: { code: string; message: string } | null } | null;
  provenance: string;
};

const TW = 250, RH = 18, HH = 30, GAP = 40, PER_ROW = 3;
function ErdSvg({ tables, sel, onSel }: { tables: Tbl[]; sel: string | null; onSel: (k: string) => void }) {
  const key = (t: { schema: string; name: string }) => `${t.schema}.${t.name}`;
  const shown = tables.map((t) => ({ t, cols: t.columns.slice(0, 12), more: Math.max(0, t.columns.length - 12) }));
  const h = (x: (typeof shown)[number]) => HH + x.cols.length * RH + (x.more ? RH : 0) + 8;
  const pos: Record<string, { x: number; y: number; h: number }> = {};
  let y = 10;
  for (let r = 0; r < shown.length; r += PER_ROW) {
    const row = shown.slice(r, r + PER_ROW);
    const rh = Math.max(...row.map(h));
    row.forEach((x, i) => (pos[key(x.t)] = { x: 10 + i * (TW + GAP), y, h: h(x) }));
    y += rh + GAP;
  }
  const width = 20 + Math.min(PER_ROW, shown.length) * (TW + GAP);
  return (
    <svg viewBox={`0 0 ${width} ${y}`} width={width} height={y} role="img" aria-label="Database diagram" style={{ maxWidth: "none", width, height: y }}>
      {tables.flatMap((t) => t.foreign_keys.map((fk, i) => {
        const a = pos[key(t)], b = pos[`${fk.ref_schema}.${fk.ref_table}`];
        if (!a || !b) return null;
        const left = a.x > b.x;
        const x1 = left ? a.x : a.x + TW, x2 = left ? b.x + TW : b.x;
        const y1 = a.y + 14, y2 = b.y + 14, mx = (x1 + x2) / 2;
        const on = sel && (sel === key(t) || sel === `${fk.ref_schema}.${fk.ref_table}`);
        return <path key={key(t) + i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke={on ? "var(--accent)" : "var(--axis)"} strokeWidth={on ? 2 : 1.1} opacity={sel && !on ? 0.2 : 1}><title>{`${t.name}.${fk.columns.join(",")} → ${fk.ref_table}.${fk.ref_columns.join(",")}`}</title></path>;
      }))}
      {shown.map((x) => {
        const p = pos[key(x.t)];
        return (
          <g key={key(x.t)} transform={`translate(${p.x},${p.y})`} tabIndex={0} role="button" aria-label={`Table ${x.t.name}`} style={{ cursor: "pointer" }}
             onClick={() => onSel(key(x.t))} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSel(key(x.t))}>
            <rect width={TW} height={p.h} rx={8} fill="var(--bg)" stroke={sel === key(x.t) ? "var(--accent)" : "var(--line)"} strokeWidth={sel === key(x.t) ? 2 : 1} />
            <rect width={TW} height={HH} rx={8} fill="var(--bg2)" />
            <text x={10} y={19} fontSize="12.5" fontWeight="600" fill="var(--ink)">{x.t.name}{x.t.kind !== "table" ? " (view)" : ""}</text>
            {x.cols.map((c, i) => (
              <text key={c.name} x={10} y={HH + 14 + i * RH} fontSize="11.5" fill="var(--ink2)">
                <tspan fontWeight={c.primary_key ? 700 : 400}>{c.primary_key ? "🔑 " : ""}{c.name}</tspan>
                <tspan x={TW - 10} textAnchor="end" fill="var(--mute)">{c.type.length > 16 ? c.type.slice(0, 15) + "…" : c.type}</tspan>
              </text>
            ))}
            {x.more ? <text x={10} y={HH + 14 + x.cols.length * RH} fontSize="11" fill="var(--mute)">+ {x.more} more columns</text> : null}
          </g>
        );
      })}
    </svg>
  );
}

function DatabaseView({ pid }: { pid: string }) {
  const res = useApi<Schema>(`/projects/${pid}/schema`, (d) => (d.last_job && ["queued", "running"].includes(d.last_job.status) ? 1500 : false));
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  if (res.loading && !res.data) return <Loading />;
  if (res.error) return <ErrorState error={res.error} onRetry={res.reload} />;
  const s = res.data!;
  if (!s.connected)
    return <Empty title="No database connected" lede="Connect the project's Postgres database on the Connectors tab. TRACE reads its structure only (tables, columns, keys, indexes) and never its rows." />;
  const refresh = async () => {
    setBusy(true);
    try {
      await api(`/projects/${pid}/schema/refresh`, { body: {} });
      toast("Reading the schema…");
      invalidate();
    } catch (e) {
      toast((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  const running = s.last_job && ["queued", "running"].includes(s.last_job.status);
  const snap = s.snapshot;
  const tables = (snap?.tables || []).filter((t) => !q || (t.schema + "." + t.name).toLowerCase().includes(q.toLowerCase()));
  const cur = snap?.tables.find((t) => `${t.schema}.${t.name}` === sel) || null;
  return (
    <div className="stack">
      <div className="row wrapr" style={{ justifyContent: "space-between", gap: 10 }}>
        <p className="cs" style={{ margin: 0, maxWidth: 680 }}>{s.provenance}</p>
        <button className="btn sm" disabled={busy || !!running} onClick={refresh}>
          <Icon n="refresh" c="sm" />
          {running ? "Reading…" : "Refresh schema"}
        </button>
      </div>
      {s.last_job?.error ? <div className="callout warn sm">The last read failed: {s.last_job.error.message}</div> : null}
      {!snap ? (
        <Empty title={running ? "Reading the schema…" : "No schema read yet"} lede={running ? "This usually takes a few seconds." : "Verify the connection, then refresh."} />
      ) : (
        <>
          <div className="facts">
            {[["Database", snap.database], ["PostgreSQL", snap.server_version], ["Tables and views", snap.table_count], ["Columns", snap.column_count], ["Read", new Date(snap.captured_at).toLocaleString()]].map(([k, v]) => (
              <div key={String(k)}><div className="eyebrow">{k}</div><div className="fv">{v}</div></div>
            ))}
          </div>
          {snap.truncated ? <div className="callout warn sm">This database has more tables than TRACE reads at once; the picture is partial.</div> : null}
          <div className="tb-search" style={{ maxWidth: 300 }}>
            <Icon n="search" c="sm" />
            <input type="search" placeholder="Find a table" aria-label="Find a table" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="grid g-side" style={{ alignItems: "start" }}>
            <div>
              {tables.length && tables.length <= 30 ? (
                <div className="gwrap" style={{ overflow: "auto", padding: 12 }}><ErdSvg tables={tables} sel={sel} onSel={(k) => setSel(sel === k ? null : k)} /></div>
              ) : (
                <div className="card pad0">
                  {tables.length > 30 ? <p className="xs muted" style={{ padding: "10px 16px 0" }}>Too many tables to draw at once. Narrow with the search to see a diagram.</p> : null}
                  <table className="tbl"><thead><tr><th>Table</th><th>Columns</th><th>Rows (estimate)</th></tr></thead>
                    <tbody>{tables.map((t) => (
                      <tr key={t.schema + t.name} className="click" onClick={() => setSel(`${t.schema}.${t.name}`)}><td><b className="mono" style={{ fontSize: 12.5 }}>{t.schema}.{t.name}</b></td><td>{t.columns.length}</td><td className="tnum">{t.approx_rows.toLocaleString()}</td></tr>
                    ))}</tbody></table>
                  {!tables.length ? <p className="sm muted" style={{ padding: 16 }}>No table matches.</p> : null}
                </div>
              )}
            </div>
            <div className="card">
              {cur ? (
                <>
                  <div className="eyebrow">{cur.kind.replace("_", " ")}</div>
                  <h3 className="mono" style={{ font: "600 16px var(--f-mono)", margin: "4px 0 2px" }}>{cur.schema}.{cur.name}</h3>
                  <div className="xs muted">about {cur.approx_rows.toLocaleString()} rows (the database&apos;s own estimate)</div>
                  <table className="tbl" style={{ marginTop: 10, fontSize: 12.5 }}>
                    <tbody>{cur.columns.map((c) => (
                      <tr key={c.name}><td className="mono">{c.primary_key ? "🔑 " : ""}{c.name}</td><td className="muted">{c.type}{c.nullable ? "" : " · not null"}</td></tr>
                    ))}</tbody>
                  </table>
                  {cur.foreign_keys.length ? <><div className="eyebrow" style={{ margin: "12px 0 6px" }}>References</div>{cur.foreign_keys.map((f) => <div key={f.name} className="sm mono">{f.columns.join(", ")} → {f.ref_table}({f.ref_columns.join(", ")})</div>)}</> : null}
                  {snap.tables.filter((t) => t.foreign_keys.some((f) => `${f.ref_schema}.${f.ref_table}` === `${cur.schema}.${cur.name}`)).length ? (
                    <><div className="eyebrow" style={{ margin: "12px 0 6px" }}>Referenced by</div>{snap.tables.filter((t) => t.foreign_keys.some((f) => `${f.ref_schema}.${f.ref_table}` === `${cur.schema}.${cur.name}`)).map((t) => <div key={t.name} className="sm mono">{t.name}</div>)}</>
                  ) : null}
                  {cur.indexes.length ? <><div className="eyebrow" style={{ margin: "12px 0 6px" }}>Indexes</div>{cur.indexes.map((i) => <div key={i.name} className="xs mono">{i.name}{i.unique ? " (unique)" : ""}: {i.columns.join(", ")}</div>)}</> : null}
                </>
              ) : (
                <p className="sm muted" style={{ margin: 0 }}>Select a table to see its columns, keys and indexes. Lines on the diagram are foreign keys.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ tab */
type View = "map" | "code" | "db";

/** Architecture: System map (from configured structure), Code graph (from the indexed repository), Database (schema metadata). */
export function ArchitectureTab({ projectId }: { projectId: string }) {
  const [view, setView] = useState<View>("map");
  return (
    <div>
      <div className="seg" style={{ marginBottom: 14 }}>
        {([["map", "System map"], ["code", "Code graph"], ["db", "Database"]] as Array<[View, string]>).map(([k, l]) => (
          <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>
      {view === "map" ? <SystemMapView pid={projectId} /> : null}
      {view === "code" ? <CodeGraph projectId={projectId} /> : null}
      {view === "db" ? <DatabaseView pid={projectId} /> : null}
    </div>
  );
}

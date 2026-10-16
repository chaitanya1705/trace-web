"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { S } from "@/lib/state";
import { toast } from "@/lib/toast";
import { Icon } from "./Icon";

export type Col<T> = { k: string; label: string; sort?: boolean; val?: (r: T) => any; render?: (r: T) => ReactNode };
export type View<T> = { k: string; label: string; fn?: (r: T) => boolean; count?: number | (() => number) };
export type Filter<T> = { k: string; label: string; opts: string[]; fn: (r: T, v: string) => boolean };
export type TableCfg<T> = {
  id: string;
  placeholder?: string;
  size?: number;
  sort?: { k: string; dir: "asc" | "desc" } | null;
  rows: () => T[];
  search?: (r: T) => string;
  onRow?: (r: T) => void;
  /** Rows that return null/undefined here are not clickable (e.g. unassigned tickets). */
  rowEnabled?: (r: T) => boolean;
  href?: (r: T) => string;
  views?: View<T>[];
  filters?: Filter<T>[];
  cols: Col<T>[];
  actions?: ReactNode;
  exportable?: boolean;
  bare?: boolean;
  empty?: string;
};

type TS = { page: number; size: number; q: string; f: Record<string, string>; view: string | null; sort: { k: string; dir: "asc" | "desc" } | null };

/** View state survives navigation inside a session, as the prototype's TBL registry did. */
const REG: Record<string, TS> = {};
export const resetTableSizes = () => Object.keys(REG).forEach((k) => delete REG[k]);

export function DataTable<T extends Record<string, any>>(cfg: TableCfg<T>) {
  const router = useRouter();
  const init = useRef<TS>(
    REG[cfg.id] || {
      page: 1,
      size: cfg.size || S.pref.rows,
      q: "",
      f: {},
      view: cfg.views ? cfg.views[0].k : null,
      sort: cfg.sort || null,
    },
  );
  const [st, setSt] = useState<TS>(init.current);
  const upd = (p: Partial<TS>) =>
    setSt((o) => {
      const n = { ...o, ...p };
      REG[cfg.id] = n;
      return n;
    });
  REG[cfg.id] = st;

  let r = cfg.rows();
  if (cfg.views) {
    const v = cfg.views.find((x) => x.k === st.view);
    if (v && v.fn) r = r.filter(v.fn);
  }
  (cfg.filters || []).forEach((f) => {
    const v = st.f[f.k];
    if (v) r = r.filter((x) => f.fn(x, v));
  });
  if (st.q) {
    const q = st.q.toLowerCase();
    r = r.filter((x) => (cfg.search ? cfg.search(x) : JSON.stringify(x)).toLowerCase().includes(q));
  }
  if (st.sort) {
    const col = cfg.cols.find((x) => x.k === st.sort!.k);
    if (col) {
      const val = col.val || ((x: T) => x[col.k]);
      const d = st.sort.dir === "asc" ? 1 : -1;
      r = [...r].sort((a, b) => {
        const A = val(a), B = val(b);
        return (A > B ? 1 : A < B ? -1 : 0) * d;
      });
    }
  }
  const n = r.length;
  const pages = Math.max(1, Math.ceil(n / st.size));
  const page = Math.min(st.page, pages);
  const from = (page - 1) * st.size;
  const rows = r.slice(from, from + st.size);
  const pg: Array<number | "…"> = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) pg.push(i);
    else if (pg[pg.length - 1] !== "…") pg.push("…");
  }
  const clickable = !!(cfg.onRow || cfg.href);

  const go = (row: T) => {
    if (cfg.rowEnabled && !cfg.rowEnabled(row)) return;
    if (cfg.href) router.push(cfg.href(row));
    else cfg.onRow?.(row);
  };

  return (
    <div className="tbox2" id={`tb-${cfg.id}`}>
      {cfg.bare ? null : (
        <>
          {cfg.views ? (
            <div className="tb-views">
              <div className="seg">
                {cfg.views.map((v) => (
                  <button key={v.k} className={st.view === v.k ? "on" : ""} onClick={() => upd({ view: v.k, page: 1 })}>
                    {v.label}
                    {v.count !== undefined ? <> <span className="n">{typeof v.count === "function" ? v.count() : v.count}</span></> : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="tb-bar">
            <div className="tb-search">
              <Icon n="search" c="sm" />
              <input type="search" placeholder={cfg.placeholder || "Search"} value={st.q} aria-label="Search" onChange={(e) => upd({ q: e.target.value, page: 1 })} />
            </div>
            {(cfg.filters || []).map((f) => (
              <select
                key={f.k}
                className="input tb-sel"
                aria-label={f.label}
                value={st.f[f.k] || ""}
                onChange={(e) => upd({ f: { ...st.f, [f.k]: e.target.value }, page: 1 })}
              >
                <option value="">{f.label}: all</option>
                {f.opts.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ))}
            <span className="sp1" />
            {cfg.actions}
            {cfg.exportable ? (
              <button className="btn sm ghost" onClick={() => toast("Exported " + n.toLocaleString() + " rows to CSV (demo)")}>
                <Icon n="file" c="sm" />
                Export
              </button>
            ) : null}
          </div>
        </>
      )}
      <div className="tb-body">
        <div className="scroll-x">
          <table className={`tbl ${clickable ? "hov" : ""}`}>
            <thead>
              <tr>
                {cfg.cols.map((col) => {
                  const on = st.sort && st.sort.k === col.k;
                  return (
                    <th
                      key={col.k}
                      className={col.sort ? `sortable ${on ? "on" : ""}` : undefined}
                      onClick={
                        col.sort
                          ? () =>
                              upd({
                                sort: on ? { k: col.k, dir: st.sort!.dir === "asc" ? "desc" : "asc" } : { k: col.k, dir: "desc" },
                                page: 1,
                              })
                          : undefined
                      }
                    >
                      {col.label}
                      {col.sort ? <span className="ar">{on ? (st.sort!.dir === "asc" ? "↑" : "↓") : "↕"}</span> : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row, i) => {
                  const live = clickable && (!cfg.rowEnabled || cfg.rowEnabled(row));
                  return (
                    <tr
                      key={(row as any).id ?? (row as any).n ?? i}
                      className={`${live ? "click " : ""}trow`}
                      style={{ ["--i" as string]: Math.min(i, 12) }}
                      onClick={live ? () => go(row) : undefined}
                    >
                      {cfg.cols.map((col) => (
                        <td key={col.k}>{col.render ? col.render(row) : (row[col.k] ?? "")}</td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={cfg.cols.length} className="muted" style={{ textAlign: "center", padding: 40 }}>
                    {cfg.empty || "Nothing matches. Clear the search or filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {cfg.bare && n <= st.size ? null : (
          <div className="pager2">
            <label className="row xs muted" style={{ gap: 6 }}>
              Rows per page
              <select
                className="input"
                value={st.size}
                onChange={(e) => upd({ size: +e.target.value, page: 1 })}
                style={{ width: "auto", height: 28, padding: "0 6px" }}
              >
                {[10, 25, 50, 100].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <span className="tnum sm ink2">{n ? `${from + 1}–${Math.min(n, from + st.size)} of ${n.toLocaleString()}` : "0 results"}</span>
            <div className="pg">
              <button disabled={page <= 1} aria-label="Previous page" onClick={() => upd({ page: page - 1 })}>‹</button>
              {pg.map((p, i) =>
                p === "…" ? (
                  <span key={"g" + i} className="gap">…</span>
                ) : (
                  <button key={p} className={p === page ? "on" : ""} onClick={() => upd({ page: p })}>{p}</button>
                ),
              )}
              <button disabled={page >= pages} aria-label="Next page" onClick={() => upd({ page: page + 1 })}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

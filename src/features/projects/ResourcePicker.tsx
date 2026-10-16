"use client";
import { useState } from "react";
import type { Resource } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { ErrorState, Loading } from "@/components/ui/States";

/** Lists what a verified connection can actually see (repositories or Vercel projects) and lets the user tick some. */
export function ResourcePicker({
  connectionId,
  idKey,
  selected,
  onToggle,
  sub,
  extra,
}: {
  connectionId: string;
  idKey: "provider_repository_id" | "provider_resource_id";
  selected: Set<string>;
  onToggle: (id: string, r: Resource) => void;
  sub: (r: Resource) => string;
  extra?: (r: Resource) => React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const res = useApi<Resource[]>(`/connections/${connectionId}/resources${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  return (
    <div>
      <div className="tb-search" style={{ marginBottom: 8, maxWidth: 320 }}>
        <input type="search" placeholder="Filter" aria-label="Filter" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {res.error ? <ErrorState error={res.error} onRetry={res.reload} /> : null}
      {res.loading && !res.data ? <Loading label="Asking the provider what is visible" /> : null}
      {res.data && !res.data.length ? <p className="sm muted">Nothing visible{q ? " for that filter" : ""}. {q ? "" : "Check what you granted access to."}</p> : null}
      {res.meta?.coverage?.truncated ? <p className="xs muted">Showing the first results only; narrow with the filter.</p> : null}
      <div className="scroll-x" style={{ maxHeight: 320, overflow: "auto" }}>
        <table className="tbl">
          <tbody>
            {(res.data || []).map((r) => {
              const id = String(r[idKey]);
              return (
                <tr key={id}>
                  <td style={{ width: 34 }}>
                    <input type="checkbox" checked={selected.has(id)} onChange={() => onToggle(id, r)} aria-label={`Select ${r.full_name || r.name}`} />
                  </td>
                  <td>
                    <b className="mono" style={{ fontSize: 12.5 }}>{r.full_name || r.name}</b>
                    <div className="xs muted">{sub(r)}</div>
                  </td>
                  <td>{extra?.(r)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

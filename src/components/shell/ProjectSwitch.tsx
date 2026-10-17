"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { Project } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { S, setS } from "@/lib/state";
import { Icon } from "@/components/ui/Icon";

/** Pages whose content follows the project scope. Everywhere else the selector is not shown (it would filter nothing). */
const SCOPED = new Set(["investigate"]);

/** Project scope selector (real, authorized projects). A remembered project that is no longer in the list resets to All. */
export function ProjectSwitch({ onChange }: { onChange: (v: string) => void }) {
  const v = usePathname().split("/")[1];
  const res = useApi<Project[]>(SCOPED.has(v) ? "/projects?limit=100" : null);
  useEffect(() => {
    /* only when the list is complete: beyond 100 projects absence proves nothing */
    const total = Number(res.meta?.coverage?.total_authorized ?? 0);
    if (res.data && S.proj !== "All" && total <= res.data.length && !res.data.some((p) => p.id === S.proj)) setS({ proj: "All" });
  }, [res.data, res.meta]);
  if (!SCOPED.has(v)) return <div id="swtch" />;
  return (
    <div id="swtch">
      <div className="sw">
        <label className="swl">
          <Icon n="db" c="sm" />
          <select id="projSw" aria-label="Project scope" value={S.proj} onChange={(e) => onChange(e.target.value)}>
            <option value="All">All projects</option>
            {(res.data || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

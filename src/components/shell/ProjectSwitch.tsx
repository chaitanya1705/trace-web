"use client";
import { usePathname } from "next/navigation";
import type { Project } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { S } from "@/lib/state";
import { Icon } from "@/components/ui/Icon";

/** Project scope selector (real projects). Hidden on Tickets (org-wide inbox), disabled on pages that ignore scope. */
export function ProjectSwitch({ onChange }: { onChange: (v: string) => void }) {
  const v = usePathname().split("/")[1];
  const res = useApi<Project[]>("/projects?limit=100");
  if (v === "tickets") return <div id="swtch" />;
  const off = v === "projects" || v === "settings";
  return (
    <div id="swtch">
      <div className={`sw ${off ? "off" : ""}`} title={off ? "This page is not filtered by project" : undefined}>
        <label className="swl">
          <Icon n="db" c="sm" />
          <select id="projSw" aria-label="Project" disabled={off} value={S.proj} onChange={(e) => onChange(e.target.value)}>
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

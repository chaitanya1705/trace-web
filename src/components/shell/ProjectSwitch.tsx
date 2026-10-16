"use client";
import { usePathname } from "next/navigation";
import { PROJ3 } from "@/data/projects";
import { S } from "@/lib/state";
import { Icon } from "@/components/ui/Icon";

/** Project scope selector. Hidden on Tickets (org-wide inbox), disabled on pages that ignore scope. */
export function ProjectSwitch({ onChange }: { onChange: (v: string) => void }) {
  const v = usePathname().split("/")[1];
  if (v === "tickets") return <div id="swtch" />;
  const off = v === "projects" || v === "settings";
  return (
    <div id="swtch">
      <div className={`sw ${off ? "off" : ""}`} title={off ? "This page is not filtered by project" : undefined}>
        <label className="swl">
          <Icon n="db" c="sm" />
          <select id="projSw" aria-label="Project" disabled={off} value={S.proj} onChange={(e) => onChange(e.target.value)}>
            <option value="All">All projects</option>
            {PROJ3.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.id}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

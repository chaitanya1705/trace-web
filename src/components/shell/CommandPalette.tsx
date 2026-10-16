"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FIXES } from "@/data/fixes";
import { INC } from "@/data/incident-detail";
import { PROJ3 } from "@/data/projects";
import { INC_ALL } from "@/data/tickets";
import { closeLayer } from "@/lib/layer";
import { Icon } from "@/components/ui/Icon";
import { NAV7 } from "./nav";

type Item = { l: string; i: string; go: string; k: string };

/** Ctrl K palette. Searches pages, tickets, investigations, changes and projects; every result opens a stable route. */
export function CommandPalette() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const items = useMemo<Item[]>(
    () => [
      ...NAV7.flatMap((g) => g[1]).map(([id, l, i]) => ({ l, i, go: "/" + id, k: "Go to" })),
      { l: "Settings", i: "gear", go: "/settings/rules", k: "Go to" },
      ...Object.values(INC).map((x: any) => ({ l: `${x.id} · ${x.title}`, i: "flask", go: "/investigate/" + x.id, k: "Investigation" })),
      ...INC_ALL.slice(0, 40).map((x: any) => ({ l: `${x.id} · ${x.title}`, i: "alert", go: x.project && INC[x.id] ? "/investigate/" + x.id : "/tickets", k: "Ticket" })),
      ...FIXES.slice(0, 12).map((f: any) => ({ l: `${f.id} · ${f.title}`, i: "commit", go: "/changes/" + f.id, k: "Change" })),
      ...PROJ3.map((p: any) => ({ l: p.id, i: "db", go: "/projects/" + p.id + "/connectors", k: "Project" })),
      ...PROJ3.flatMap((p: any) => [
        { l: `${p.id} · GitHub connection`, i: "plus", go: `/projects/${p.id}/connectors/code`, k: "Connector" },
        { l: `${p.id} · Vercel connection`, i: "plus", go: `/projects/${p.id}/connectors/cloud`, k: "Connector" },
      ]),
    ],
    [],
  );
  const shown = items.filter((x) => x.l.toLowerCase().includes(q.toLowerCase())).slice(0, 9);
  const pick = (x?: Item) => {
    if (!x) return;
    closeLayer();
    router.push(x.go);
  };

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && closeLayer()}>
      <div className="cmd" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={input}
          placeholder="Search tickets, investigations, changes, projects"
          autoComplete="off"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              setSel(Math.min(sel + 1, shown.length - 1));
              e.preventDefault();
            } else if (e.key === "ArrowUp") {
              setSel(Math.max(0, sel - 1));
              e.preventDefault();
            } else if (e.key === "Enter") pick(shown[sel]);
          }}
        />
        <div style={{ maxHeight: 340, overflow: "auto", padding: "6px 0" }}>
          {shown.length ? (
            shown.map((x, k) => (
              <div key={x.go + x.l} className={`it ${k === sel ? "on" : ""}`} onClick={() => pick(x)}>
                <Icon n={x.i} />
                <span style={{ flex: 1 }}>{x.l}</span>
                <span className="xs muted">{x.k}</span>
              </div>
            ))
          ) : (
            <div className="it muted">No results</div>
          )}
        </div>
      </div>
    </div>
  );
}

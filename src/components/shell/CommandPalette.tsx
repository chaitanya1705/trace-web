"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { call as api } from "@/lib/call";
import { closeLayer } from "@/lib/layer";
import type { Project, Ticket } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { NAV7 } from "./nav";

type Item = { l: string; i: string; go: string; k: string };

/** Ctrl K palette: pages plus a live search of the caller's authorized projects and tickets. Every result opens a stable route. */
export function CommandPalette() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [found, setFound] = useState<Item[]>([]);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setFound([]);
      return;
    }
    let dead = false;
    const t = setTimeout(async () => {
      const [p, t2] = await Promise.allSettled([
        api<Project[]>(`/projects?q=${encodeURIComponent(term)}&limit=5`),
        api<Ticket[]>(`/tickets?view=all&q=${encodeURIComponent(term)}&limit=5`),
      ]);
      if (dead) return;
      setFound([
        ...(p.status === "fulfilled" ? p.value.data.map((x) => ({ l: x.name, i: "db", go: `/projects/${x.id}/connectors`, k: "Project" })) : []),
        ...(t2.status === "fulfilled" ? t2.value.data.map((x) => ({ l: `${x.display_id} · ${x.title}`, i: "alert", go: "/tickets", k: "Ticket" })) : []),
      ]);
    }, 200);
    return () => {
      dead = true;
      clearTimeout(t);
    };
  }, [q]);

  const pages: Item[] = NAV7.flatMap((g) => g[1]).map(([id, l, i]) => ({ l, i, go: "/" + id, k: "Go to" }));
  const shown = [...pages.filter((x) => x.l.toLowerCase().includes(q.toLowerCase())), ...found].slice(0, 10);
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
          placeholder="Search tickets and projects"
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

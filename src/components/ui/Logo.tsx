import { CONNCOLOR, CONNLOGO, LOGO } from "@/data/logos";
import { Icon } from "./Icon";

const path = (id: string) => (LOGO as Record<string, string>)[(CONNLOGO as Record<string, string>)[id]];

/** Provider mark (`.lg-tile`). Only GitHub and Vercel exist for now. */
export function LogoTile({ id, size = 34 }: { id: string; size?: number }) {
  const d = id && path(id);
  return (
    <span className="lg-tile" style={{ width: size, height: size, color: CONNCOLOR[id] || "var(--ink)", ...(d ? {} : { font: "600 11px var(--f-body)" }) }}>
      {d ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={d} />
        </svg>
      ) : id === "none" ? (
        "–"
      ) : (
        <Icon n="plus" c="sm" />
      )}
    </span>
  );
}

/** Small provider chip used in page headers (`provChip`). */
export function ProviderChip({ id, name }: { id: string; name: string }) {
  const d = path(id);
  return (
    <span className="chip" style={{ gap: 6 }}>
      <span className="lgmini" style={{ color: CONNCOLOR[id] || "var(--ink)" }}>
        {d ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={d} />
          </svg>
        ) : null}
      </span>
      {name}
    </span>
  );
}

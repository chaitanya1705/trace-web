import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";

/** `.badge.b-<tone>` — the prototype's `bd()`. */
export function Badge({
  c = "mute",
  children,
  style,
  title,
}: {
  c?: string;
  children?: ReactNode;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <span className={`badge b-${c}`} style={style} title={title}>
      {children}
    </span>
  );
}

export const SevBadge = ({ s }: { s: string }) => (
  <Badge c={s === "SEV-1" ? "crit" : s === "SEV-2" ? "warn" : "mute"}>{s}</Badge>
);

export function StatusChip({ s }: { s: string }) {
  const d = s === "Investigating" ? "r pulse" : s === "Waiting on people" ? "a" : s === "Fix proposed" ? "v" : "g";
  return (
    <span className="chip" style={{ border: 0, padding: 0 }}>
      <span className={`dot ${d}`} />
      {s}
    </span>
  );
}

export const EnvBadge = ({ e }: { e: string }) => (
  <span className={`badge env-b${e === "production" ? " prod" : ""}`}>{e}</span>
);

export const FindingBadge = ({ cls, label }: { cls: string; label: string }) => (
  <span className={`badge ${cls === "ins" ? "b-ins" : "b-" + cls}`}>{label}</span>
);

const HYP: Record<string, [string, string, string]> = {
  supported: ["b-good", "Supported", "check"],
  plausible: ["b-warn", "Plausible", "clock"],
  contradicted: ["b-crit", "Contradicted", "x"],
  insufficient: ["b-ins", "Insufficient evidence", "alert"],
};
export function HypBadge({ s }: { s: string }) {
  const [c, l, i] = HYP[s];
  return (
    <span className={`badge ${c}`}>
      <Icon n={i} c="sm" />
      {l}
    </span>
  );
}

export const FixStatusBadge = ({ s }: { s: string }) => (
  <Badge c={s === "Proposed" ? "warn" : s === "Merged" ? "good" : "mute"}>{s}</Badge>
);
export const ObsStatusBadge = ({ s }: { s: string }) => (
  <Badge c={s === "Recovered" ? "good" : s === "Regressed" ? "crit" : "vio"}>{s}</Badge>
);
export const PrStatusBadge = ({ s }: { s: string }) => (
  <Badge c={s === "Draft" ? "vio" : s === "Open" ? "info" : s === "Merged" ? "good" : "mute"}>{s}</Badge>
);

export function Chip({ d, children, className = "", style }: { d?: string; children?: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={`chip ${className}`.trim()} style={style}>
      {d ? <span className={`dot ${d}`} /> : null}
      {children}
    </span>
  );
}

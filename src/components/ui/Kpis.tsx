import type { ReactNode } from "react";
import { Icon } from "./Icon";

const MAP: Array<[RegExp, string]> = [
  [/approv/, "check"], [/draft|pull request|\bprs?\b/, "code"], [/merged/, "commit"], [/watch/, "eye"],
  [/need a project|unassigned/, "db"], [/waiting/, "users"], [/investigat/, "flask"],
  [/resolved|recovered|concluded/, "check"], [/regress|failing/, "alert"], [/open/, "alert"],
  [/time|median|minute/, "clock"], [/accuracy|diagnos/, "spark"], [/unsupported/, "shield"],
  [/not enough|abstain|correct/, "search"], [/usage|scanned|log/, "layers"], [/setup|complete/, "gear"],
  [/project/, "db"], [/change/, "commit"],
];

export function KpiIcon({ label }: { label: string }) {
  const l = String(label).toLowerCase();
  const hit = MAP.find(([r]) => r.test(l));
  return (
    <span className="kpi-ic">
      <Icon n={hit ? hit[1] : "spark"} c="sm" />
    </span>
  );
}

export type Kpi = [label: string, value: ReactNode, note?: ReactNode, trend?: "up" | "dn"];

export function Kpis({ items }: { items: Kpi[] }) {
  return (
    <div className="kpis">
      {items.map((k) => (
        <div className="card kpi" key={k[0]}>
          <div className="eyebrow">
            <KpiIcon label={k[0]} />
            {k[0]}
          </div>
          <div className="v">{k[1]}</div>
          <div className={k[3] === "dn" ? "delta dn" : k[3] === "up" ? "delta up" : "xs muted"}>{k[2] || ""}</div>
        </div>
      ))}
    </div>
  );
}

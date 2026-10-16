"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Tabs, type TabDef } from "@/components/ui/Tabs";

export type Crumb = [label: string, href?: string];

/** Generic detail page: breadcrumbs, title, chips, facts, tabs and one body (the prototype's `shell()`). */
export function DetailShell({
  crumbs,
  title,
  lede,
  chips,
  actions,
  facts,
  tabs,
  tab,
  children,
}: {
  crumbs: Crumb[];
  title: ReactNode;
  lede?: ReactNode;
  chips?: ReactNode;
  actions?: ReactNode;
  facts?: Array<[string, ReactNode]>;
  tabs?: TabDef[];
  tab?: string;
  children: ReactNode;
}) {
  return (
    <div className="page">
      <div className="row sm muted" style={{ marginBottom: 10, flexWrap: "wrap" }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "contents" }}>
            {i ? <Icon n="chev" c="sm" /> : null}
            {c[1] ? (
              <Link className="link" href={c[1]} style={{ color: "var(--mute)" }}>
                {c[0]}
              </Link>
            ) : (
              <span className="mono">{c[0]}</span>
            )}
          </span>
        ))}
      </div>
      <div className="ph">
        <div style={{ minWidth: 0 }}>
          <h1 className="h1">{title}</h1>
          {lede ? <p className="lede">{lede}</p> : null}
          {chips ? <div className="chips">{chips}</div> : null}
        </div>
        <div className="row wrapr">{actions}</div>
      </div>
      {facts ? (
        <div className="facts">
          {facts.map((f) => (
            <div key={f[0]}>
              <div className="eyebrow">{f[0]}</div>
              <div className="fv">{f[1]}</div>
            </div>
          ))}
        </div>
      ) : null}
      {tabs ? <Tabs tabs={tabs} active={tab || tabs[0].k} /> : null}
      <div id="dbody" className="tabswap">
        {children}
      </div>
    </div>
  );
}

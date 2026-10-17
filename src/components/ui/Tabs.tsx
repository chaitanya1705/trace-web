"use client";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export type TabDef = { k: string; label: ReactNode; n?: number | string; href: string };

/** Route-backed tabs: each tab is a stable URL, so Back restores the previous tab. */
export function Tabs({ tabs, active }: { tabs: TabDef[]; active: string }) {
  const router = useRouter();
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.k} role="tab" aria-selected={t.k === active} className={t.k === active ? "on" : ""} onClick={() => router.push(t.href)}>
          {t.label}
          {t.n !== undefined ? <span className="n">{t.n}</span> : null}
        </button>
      ))}
    </div>
  );
}

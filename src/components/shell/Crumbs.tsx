"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { INC_ALL } from "@/data/tickets";
import { Icon } from "@/components/ui/Icon";
import { CRUMB_LBL } from "./nav";

/** Breadcrumb: Home is always first (prototype `drawCrumbs`). */
export function Crumbs() {
  const p = usePathname().split("/").map(decodeURIComponent);
  const v = p[1];
  const items: Array<[string, string | null]> = [["Home", "/home"]];
  if (v && CRUMB_LBL[v]) {
    items.push([CRUMB_LBL[v], p[2] ? "/" + v : null]);
    if (v === "investigate") {
      if (p[2] === "p" && p[3]) items.push([p[3], null]);
      else if (p[2]) {
        const r = INC_ALL.find((x: any) => x.id === p[2]);
        if (r && r.project) items.push([r.project, "/investigate/p/" + r.project]);
        items.push([p[2], null]);
      }
    } else if (v === "changes" && p[2]) items.push([p[2], null]);
    else if (v === "observability" && p[2]) items.push([p[2] === "analytics" ? "Analytics" : p[2], null]);
    else if (v === "projects" && p[2]) {
      items.push([p[2], p[3] ? "/projects/" + p[2] + "/connectors" : null]);
      if (p[3]) items.push([p[3].charAt(0).toUpperCase() + p[3].slice(1), null]);
    } else if (v === "settings" && p[2]) items.push([p[2].charAt(0).toUpperCase() + p[2].slice(1), null]);
  }
  return (
    <nav className="crumbs" id="crumbs" aria-label="Breadcrumb">
      {items.map((c, i) => (
        <span key={i} style={{ display: "contents" }}>
          {i ? (
            <span className="cr-sep">
              <Icon n="chev" c="sm" />
            </span>
          ) : null}
          {c[1] && i < items.length - 1 ? (
            <Link href={c[1]}>{c[0]}</Link>
          ) : (
            <span className={i === items.length - 1 ? "cr-cur" : ""} aria-current={i === items.length - 1 ? "page" : undefined}>
              {c[0]}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

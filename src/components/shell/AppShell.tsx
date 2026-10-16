"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FIXES, OBS } from "@/data/fixes";
import { TRACE_STEPS } from "@/data/steps";
import { INC_ALL } from "@/data/tickets";
import { toggleBot, closeBot } from "@/lib/bot";
import { closeLayer, openLayer } from "@/lib/layer";
import { INC } from "@/data/incident-detail";
import { S, USAGE, inProj, setS } from "@/lib/state";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { Icon } from "@/components/ui/Icon";
import { IconSprite } from "@/components/ui/IconSprite";
import { resetTableSizes } from "@/components/ui/DataTable";
import { BotPanel } from "@/components/bot/BotPanel";
import { CommandPalette } from "./CommandPalette";
import { Crumbs } from "./Crumbs";
import { LayerHost, Toaster } from "./Overlays";
import { ProjectSwitch } from "./ProjectSwitch";
import { SideExtra } from "./SideExtra";
import { NAV7 } from "./nav";
import { applyTheme, themeIsDark, toggleTheme } from "@/lib/theme";

export type SessionUser = { name: string; sub: string };

const initials = (name: string) =>
  name.split(/[\s-]+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "CN";

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);

  /* restore the saved rail state (desktop only) and theme icon */
  useEffect(() => {
    try {
      if (localStorage.getItem("trace_side") === "1" && !matchMedia("(max-width:900px)").matches) setCollapsed(true);
    } catch {}
    applyTheme();
    setDark(themeIsDark());
  }, []);

  /* a drawer closes after navigation; the main area scrolls to the top */
  useEffect(() => {
    setDrawer(false);
    document.getElementById("mainEl")?.scrollTo({ top: 0 });
  }, [pathname]);

  /* Ctrl/Cmd+K opens the command palette */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openLayer(<CommandPalette />);
      }
      if (e.key === "Escape") closeBot();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const sideToggle = useCallback(() => {
    if (matchMedia("(max-width:900px)").matches) setDrawer((d) => !d);
    else
      setCollapsed((c) => {
        try {
          localStorage.setItem("trace_side", c ? "0" : "1");
        } catch {}
        return !c;
      });
  }, []);

  const seg = pathname.split("/")[1] || "home";
  const active = seg;
  const un = INC_ALL.filter((r: any) => !r.project).length;
  const counts: Record<string, number> = {
    tickets: un,
    investigate: Object.values(TRACE_STEPS).filter((st) => st.some((s) => s.state === "waiting")).length,
    changes: FIXES.filter((f) => f.status === "Proposed" && inProj(f)).length,
    observability: OBS.filter((o) => o.status === "Watching" && inProj(o)).length,
  };

  const signOut = async () => {
    await fetch("/api/demo-session", { method: "DELETE" });
    toast("Signed out");
    router.push("/login");
  };

  return (
    <div id="app" className={collapsed ? "collapsed" : undefined}>
      <IconSprite />
      <aside className={`side${drawer ? " on" : ""}`} id="side">
        <div className="brand">
          <button
            type="button"
            className="mk mkbtn"
            id="sideBtn"
            onClick={sideToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon n="mark" c="mk-logo" style={{ width: 15, height: 15 }} />
            <Icon n="panel" c="mk-col" style={{ width: 15, height: 15 }} />
          </button>
          TRACE
        </div>
        <nav className="nav" id="nav">
          {NAV7.map(([g, items]) => (
            <div key={g || "top"} style={{ display: "contents" }}>
              {g ? <div className="nav-l">{g}</div> : null}
              {items.map(([id, l, i]) => (
                <Link key={id} href={`/${id}`} className={active === id ? "on" : ""} title={l}>
                  <Icon n={i} />
                  {l}
                  {counts[id] ? (
                    <span className={`cnt ${id === "tickets" ? "" : "n"}`} title={id === "tickets" ? "Tickets without a project" : undefined}>
                      {counts[id]}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <SideExtra />
        <div className="side-foot">
          <div className="cov">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <b>Today&apos;s usage</b>
              <span className="xs muted">resets 00:00 UTC</span>
            </div>
            <UsageBar label="Log data scanned" value={`${USAGE.gb} of ${USAGE.gbMax} GB`} pct={Math.round((USAGE.gb / USAGE.gbMax) * 100)} />
            <UsageBar label="Tool calls" value={`${USAGE.calls} of ${USAGE.callsMax}`} pct={Math.round((USAGE.calls / USAGE.callsMax) * 100)} />
          </div>
          <div className="me">
            <span className="av">{initials(user.name)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sm" style={{ fontWeight: 500 }}>{user.name}</div>
              <small>{user.sub}</small>
            </div>
            <button className="btn icon ghost sm" onClick={signOut} aria-label="Sign out" title="Sign out">
              <Icon n="out" c="sm" />
            </button>
          </div>
        </div>
      </aside>
      <div className="main" id="mainEl">
        <header className="top">
          <button className="btn icon ghost" id="sideOpen" onClick={sideToggle} aria-label="Open sidebar">
            <Icon n="panel" />
          </button>
          <Crumbs />
          <ProjectSwitch
            onChange={(v) => {
              setS({ proj: v });
              resetTableSizes();
              const p = pathname.split("/");
              if (p[1] === "investigate" && !INC[p[2]]) router.push(v === "All" ? "/investigate" : "/investigate/p/" + v);
            }}
          />
          <span className="sp" />
          <div
            className="search"
            id="searchBtn"
            role="button"
            tabIndex={0}
            onClick={() => openLayer(<CommandPalette />)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") openLayer(<CommandPalette />);
            }}
          >
            <Icon n="search" c="sm" />
            <span>Search incidents, services, changes</span>
            <kbd>Ctrl K</kbd>
          </div>
          <button className="btn" id="askBtn" onClick={toggleBot}>
            <Icon n="spark" style={{ color: "var(--accent)" }} />
            <span className="hide-s">TRACE Bot</span>
          </button>
          <button
            className="btn icon ghost"
            id="themeBtn"
            aria-label="Toggle theme"
            onClick={() => setDark(toggleTheme())}
          >
            <Icon n={dark ? "sun" : "moon"} />
          </button>
          <Link className={`btn icon ghost${seg === "settings" ? " on" : ""}`} href="/settings/rules" id="setBtn" aria-label="Settings" title="Settings">
            <Icon n="gear" />
          </Link>
        </header>
        <div id="view">{children}</div>
      </div>
      <BotPanel />
      <LayerHost />
      <Toaster />
    </div>
  );
}

function UsageBar({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="sx-u">
      <div className="row xs" style={{ justifyContent: "space-between" }}>
        <span className="ink2">{label}</span>
        <span className="tnum">{value}</span>
      </div>
      <div className="meter">
        <i style={{ width: pct + "%", transition: "none", background: pct > 80 ? "var(--warn)" : "var(--accent)" }} />
      </div>
    </div>
  );
}

export { closeLayer };

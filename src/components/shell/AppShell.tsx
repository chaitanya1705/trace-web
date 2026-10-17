"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toggleBot, closeBot } from "@/lib/bot";
import { openLayer } from "@/lib/layer";
import { setS } from "@/lib/state";
import { useApi } from "@/lib/useApi";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/ui/Icon";
import { IconSprite } from "@/components/ui/IconSprite";
import { resetTableSizes } from "@/components/ui/DataTable";
import { BotPanel } from "@/components/bot/BotPanel";
import { CommandPalette } from "./CommandPalette";
import { Crumbs } from "./Crumbs";
import { LayerHost, Toaster } from "./Overlays";
import { ProjectSwitch } from "./ProjectSwitch";
import { NAV7 } from "./nav";
import { SessionProvider, type SessionUser } from "@/lib/session";
import { applyTheme, themeIsDark, toggleTheme } from "@/lib/theme";


const initials = (name: string) =>
  name.split(/[\s-]+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "CN";

export function AppShell({ children }: { children: ReactNode }) {
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
  /* real counts only: tickets that still need a project. Other badges stay hidden until their APIs exist. */
  /* no login: /me opens (and on first use creates) the workspace and says who is acting */
  const me = useApi<{ user: { email: string | null; display_name: string | null }; memberships: Array<{ organization_name: string }> }>("/me");
  const user: SessionUser = {
    name: me.data?.user.display_name || me.data?.user.email || (me.error ? "API unreachable" : "Loading…"),
    sub: me.data?.memberships[0]?.organization_name || (me.error ? "Start the backend" : ""),
  };
  const need = useApi<unknown[]>("/tickets?view=need_project&limit=1");
  const counts: Record<string, number> = { tickets: Number(need.meta?.coverage?.counts?.need_project || 0) };

  return (
    <SessionProvider value={user}>
    <div id="app" className={collapsed ? "collapsed" : undefined}>
      <IconSprite />
      <a className="skip" href="#view">Skip to content</a>
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
        <div className="side-foot">
          <div className="me">
            <span className="av">{initials(user.name)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sm" style={{ fontWeight: 500 }}>{user.name}</div>
              <small>{user.sub}</small>
            </div>
            <button className="btn icon ghost sm" onClick={() => router.push("/")} aria-label="Leave workspace" title="Leave workspace">
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
        </header>
        <div id="view" tabIndex={-1}>{children}</div>
      </div>
      <BotPanel />
      <LayerHost />
      <Toaster />
    </div>
    </SessionProvider>
  );
}

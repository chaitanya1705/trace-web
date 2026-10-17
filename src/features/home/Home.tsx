"use client";
import Link from "next/link";
import type { Project, Ticket } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useMounted } from "@/lib/client";
import { greet } from "@/lib/util";
import { Badge, EnvBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Kpis } from "@/components/ui/Kpis";
import { ReadinessBadges } from "@/features/projects/Projects";
import { Empty, ErrorState, Loading } from "@/components/ui/States";

/** Home: only what the backend can honestly report today (tickets and projects). No sample numbers. */
export function Home() {
  const mounted = useMounted();
  const me = useApi<{ user: { email: string | null; display_name: string | null } }>("/me");
  const tickets = useApi<Ticket[]>("/tickets?view=need_project&limit=5");
  const projects = useApi<Project[]>("/projects?limit=100");
  const counts = tickets.meta?.coverage?.counts as { need_project: number; open: number; resolved: number; all: number } | undefined;
  const name = (me.data?.user.display_name || me.data?.user.email || "").split(/[ @]/)[0];
  const todo = tickets.data || [];

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="xs muted" style={{ marginBottom: 4 }}>{mounted ? new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) : " "}</div>
          <h1 className="h1">{mounted ? greet() : "Hello"}{name ? `, ${name}` : ""}</h1>
          <p className="lede">
            {counts ? (counts.need_project ? `${counts.need_project} ticket${counts.need_project > 1 ? "s need" : " needs"} a project.` : "Nothing needs you right now.") : " "}
          </p>
        </div>
        <div className="row wrapr">
          <Link className="btn pri" href="/tickets"><Icon n="alert" c="sm" />Open tickets</Link>
        </div>
      </div>
      {tickets.error ? <ErrorState error={tickets.error} onRetry={tickets.reload} /> : null}
      <Kpis
        items={[
          ["Open tickets", counts?.open ?? "–", ""],
          ["Need a project", counts?.need_project ?? "–", "assign, then investigate"],
          ["Projects", projects.meta?.coverage?.total_authorized ?? projects.data?.length ?? "–", ""],
        ]}
      />
      <div className="homegrid">
        <div className="stack">
          <div className="card pad0">
            <div className="hh">
              <div><h3 className="ct">Needs you</h3><p className="cs">Things TRACE cannot finish without a person</p></div>
              {todo.length ? <Badge c="warn">{counts?.need_project}</Badge> : null}
            </div>
            {tickets.loading && !tickets.data ? <div style={{ padding: 16 }}><Loading /></div> : null}
            {todo.map((t) => (
              <Link key={t.id} className="hrow" href="/tickets">
                <span className="sx-ic r"><Icon n="db" c="sm" /></span>
                <span className="sx-b"><span className="sx-t">{t.title}</span><span className="sx-s">{t.display_id} · needs a project</span></span>
                <span className="btn sm">Assign</span>
              </Link>
            ))}
            {tickets.data && !todo.length ? <p className="sm muted" style={{ padding: "14px 16px", margin: 0 }}>You&apos;re all caught up.</p> : null}
          </div>
          <div className="card pad0">
            <div className="hh"><div><h3 className="ct">Active investigations</h3></div></div>
            <p className="sm muted" style={{ padding: "14px 16px", margin: 0 }}>Investigations are not available yet.</p>
          </div>
        </div>
        <div className="stack">
          <div className="card pad0">
            <div className="hh"><div><h3 className="ct">Projects</h3><p className="cs">Readiness per capability</p></div><Link className="link sm" href="/projects">All</Link></div>
            {projects.loading && !projects.data ? <div style={{ padding: 16 }}><Loading /></div> : null}
            {projects.data && !projects.data.length ? (
              <div style={{ padding: 16 }}><Empty title="No projects yet" action={<Link className="btn pri" href="/projects/new/basics">New project</Link>} /></div>
            ) : null}
            {(projects.data || []).map((p) => (
              <Link key={p.id} className="hrow" href={`/projects/${p.id}/connectors`}>
                <span className="sx-b"><span className="sx-t">{p.name}</span><span className="sx-s">{p.environments.map((e) => e.key).join(", ")}</span></span>
                <ReadinessBadges items={p.readiness} />
              </Link>
            ))}
          </div>
          <div className="card pad0">
            <div className="hh"><div><h3 className="ct">Recent changes</h3></div></div>
            <p className="sm muted" style={{ padding: "14px 16px", margin: 0 }}>Changes and PRs are not available yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { EnvBadge };

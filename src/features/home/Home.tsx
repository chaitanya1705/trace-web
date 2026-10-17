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
import { STEP_TITLE, ago, type RunRow } from "@/features/investigate/types";

type ChangeRow = { id: string; display_id: string; project_id: string; project_name: string; title: string; risk: string; status: string; updated_at: string };

/** Home: only what the backend can honestly report today (tickets and projects). No sample numbers. */
export function Home() {
  const mounted = useMounted();
  const me = useApi<{ user: { email: string | null; display_name: string | null } }>("/me");
  const tickets = useApi<Ticket[]>("/tickets?view=need_project&limit=5");
  const projects = useApi<Project[]>("/projects?limit=100");
  const runs = useApi<RunRow[]>("/investigations", (d) => (d.some((r) => r.status === "running" || r.status === "queued") ? 3000 : false));
  const changes = useApi<ChangeRow[]>("/changes");
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
          ["Investigations", runs.data?.length ?? "–", `${(runs.data || []).filter((r) => r.status === "running" || r.status === "queued").length} running`],
          ["Changes", changes.data?.length ?? "–", changes.error ? "not available" : "proposed fixes"],
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
            <div className="hh"><div><h3 className="ct">Investigations</h3><p className="cs">Running first, then the latest</p></div><Link className="link sm" href="/investigate">All</Link></div>
            {runs.loading && !runs.data ? <div style={{ padding: 16 }}><Loading /></div> : null}
            {runs.data && !runs.data.length ? <p className="sm muted" style={{ padding: "14px 16px", margin: 0 }}>No investigations yet. Open a ticket and choose Investigate.</p> : null}
            {[...(runs.data || [])].sort((x, y) => Number(y.status === "running" || y.status === "queued") - Number(x.status === "running" || x.status === "queued")).slice(0, 5).map((r) => (
              <Link key={r.id} className="hrow" href={`/investigate/${r.project_id}/${r.control_run_id}`}>
                <span className="sx-ic r"><Icon n="flask" c="sm" /></span>
                <span className="sx-b"><span className="sx-t">{r.title}</span><span className="sx-s">{r.ticket_display_id} · {r.project_name} · {r.last_step ? STEP_TITLE[r.last_step]?.[0] || r.last_step : "starting"} · {ago(r.created_at)}</span></span>
                <Badge c={r.status === "completed" ? "mute" : r.status === "failed" ? "crit" : "vio"}>{r.status === "completed" ? "Concluded" : r.status === "failed" ? "Failed" : "Running"}</Badge>
              </Link>
            ))}
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
            <div className="hh"><div><h3 className="ct">Recent changes</h3><p className="cs">Fixes proposed by investigations</p></div><Link className="link sm" href="/changes">All</Link></div>
            {changes.loading && !changes.data ? <div style={{ padding: 16 }}><Loading /></div> : null}
            {changes.error ? <p className="sm muted" style={{ padding: "14px 16px", margin: 0 }}>Changes are not available on this API yet.</p> : null}
            {changes.data && !changes.data.length ? <p className="sm muted" style={{ padding: "14px 16px", margin: 0 }}>No changes proposed yet.</p> : null}
            {(changes.data || []).slice(0, 5).map((c) => (
              <Link key={c.id} className="hrow" href={`/changes/${c.id}`}>
                <span className="sx-ic r"><Icon n="commit" c="sm" /></span>
                <span className="sx-b"><span className="sx-t">{c.title}</span><span className="sx-s">{c.display_id} · {c.project_name} · {ago(c.updated_at)}</span></span>
                <Badge c={c.status === "approved" ? "good" : "mute"}>{c.status.replace(/_/g, " ")}</Badge>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { EnvBadge };

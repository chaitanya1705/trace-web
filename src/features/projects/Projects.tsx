"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { call as api } from "@/lib/call";
import type { Draft, Project, Readiness } from "@/lib/types";
import { invalidate, useApi } from "@/lib/useApi";
import { Badge, Chip, EnvBadge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icon";
import { LogoTile } from "@/components/ui/Logo";
import { PageHead } from "@/components/ui/PageHead";
import { Empty, ErrorState, Loading, Unavailable } from "@/components/ui/States";
import { GraphExplorer } from "@/features/graph/GraphExplorer";
import { ArchitectureTab } from "./Architecture";
import { LogsTab } from "./LogsTab";
import { ConnectorsTab, CodeTab, ScopeTab, TeamTab } from "./ProjectTabs";
import { DeleteProjectButton } from "./DeleteProject";
import { DetailShell } from "./DetailShell";
import { NewProject } from "./NewProject";

const TONE: Record<Readiness["state"], string> = { ok: "good", warning: "warn", failed: "crit", todo: "mute", skipped: "mute" };

export function ReadinessBadges({ items }: { items: Readiness[] }) {
  return (
    <span className="row wrapr" style={{ gap: 4 }}>
      {items.map((r) => (
        <Badge key={r.key} c={TONE[r.state]} title={`${r.label}: ${r.detail || r.state}`}>
          {r.label.replace(/ \(.*\)/, "")}
          {r.state === "ok" ? " ✓" : r.state === "warning" ? " !" : r.state === "failed" ? " ×" : ""}
        </Badge>
      ))}
    </span>
  );
}

const STAGE_STEP: Array<[stage: string, step: string, label: string]> = [
  ["basics", "basics", "Basics"],
  ["hosting", "hosting", "Hosting"],
  ["log_scope", "scope", "Log scope"],
  ["code", "code", "Code"],
  ["review", "review", "Review"],
];

/** Setups that were started and not finished. They are saved server-side, so a reload or another day resumes them. */
function Unfinished() {
  const res = useApi<Draft[]>("/project-drafts");
  if (!res.data?.length) return res.error ? <ErrorState error={res.error} onRetry={res.reload} /> : null;
  return (
    <div className="card pad0" style={{ marginBottom: 16 }}>
      <div className="hh"><div><h3 className="ct">Unfinished setups</h3><p className="cs">Saved as you went. Resume where you stopped.</p></div></div>
      {res.data.filter((d) => !d.project_id).map((d) => {
        const next = STAGE_STEP.find(([st]) => (d.stages[st] || "todo") === "todo") || STAGE_STEP[4];
        const skipped = STAGE_STEP.filter(([st]) => d.stages[st] === "skipped").map((x) => x[2]);
        return (
          <div key={d.id} className="hrow">
            <span className="sx-b">
              <span className="sx-t">{d.data.basics?.name || "Untitled project"}</span>
              <span className="sx-s">Next: {next[2]}{skipped.length ? ` · skipped: ${skipped.join(", ")}` : ""}</span>
            </span>
            <Link className="btn sm pri" href={`/projects/new/${next[1]}?draft=${d.id}`}>Resume</Link>
            <button className="btn sm ghost" onClick={async () => { if (confirm("Discard this setup? Connections made for it are removed.")) { await api(`/project-drafts/${d.id}/discard`, { body: {} }).catch(() => {}); invalidate(); } }}>Discard</button>
          </div>
        );
      })}
    </div>
  );
}

function ProjectList() {
  const router = useRouter();
  const res = useApi<Project[]>("/projects?limit=100");
  const total = res.meta?.coverage?.total_authorized as number | undefined;
  const newBtn = (
    <button className="btn pri" onClick={() => router.push("/projects/new/basics")}>
      <Icon n="plus" />
      New project
    </button>
  );
  return (
    <div className="page">
      <PageHead
        title="Projects"
        lede="A project is one system: where it runs, where its code lives, and which logs belong to it. Everything TRACE needs is set up here, once."
        chips={res.data ? <Chip d="v">{total ?? res.data.length} project{(total ?? res.data.length) === 1 ? "" : "s"}</Chip> : null}
        right={newBtn}
      />
      <Unfinished />
      {res.error ? <ErrorState error={res.error} onRetry={res.reload} /> : null}
      {res.loading && !res.data ? <Loading label="Loading projects" /> : null}
      {res.data && !res.data.length ? (
        <Empty title="No projects yet" lede="Create a project, connect Vercel and GitHub, and TRACE can start working with your system." action={newBtn} />
      ) : null}
      {res.data?.length ? (
        <DataTable<Project>
          id="projs"
          rows={() => res.data!}
          search={(r) => r.name + " " + (r.description || "")}
          href={(r) => `/projects/${r.id}/connectors`}
          cols={[
            { k: "name", label: "Project", sort: true, render: (r) => (<><b>{r.name}</b>{r.description ? <div className="xs muted">{r.description}</div> : null}</>) },
            { k: "host", label: "Host", render: (r) => { const c = r.connections.find((x) => x.kind === "hosting"); return c ? <span className="row" style={{ gap: 8 }}><LogoTile id={c.provider} size={26} /><span className="sm">Vercel</span></span> : <span className="sm muted">Not connected</span>; } },
            { k: "code", label: "Code", render: (r) => { const c = r.connections.find((x) => x.kind === "code"); return c ? <span className="row" style={{ gap: 8 }}><LogoTile id={c.provider} size={26} /><span className="sm">GitHub</span></span> : <span className="sm muted">Not connected</span>; } },
            { k: "envs", label: "Environments", render: (r) => <>{r.environments.map((e) => <span key={e.id} style={{ marginRight: 4 }}><EnvBadge e={e.key} /></span>)}</> },
            { k: "ready", label: "Readiness", render: (r) => <ReadinessBadges items={r.readiness} /> },
          ]}
        />
      ) : null}
    </div>
  );
}

function ProjectDetail({ pid, tab }: { pid: string; tab: string }) {
  const res = useApi<Project>(`/projects/${pid}`);
  if (res.loading && !res.data) return <div className="page"><Loading /></div>;
  if (res.error)
    return (
      <div className="page">
        <ErrorState error={res.error} onRetry={res.reload} />
        {res.error.status === 404 ? <Empty title="Project not found" lede="It may have been removed, or you don't have access." /> : null}
      </div>
    );
  const p = res.data!;
  const base = `/projects/${p.id}`;
  const tabs = [
    { k: "connectors", label: "Connectors" },
    { k: "code", label: "Code" },
    { k: "scope", label: "Log scope" },
    { k: "graph", label: "Graph" },
    { k: "architecture", label: "Architecture" },
    { k: "logs", label: "Logs" },
    { k: "team", label: "Team" },
  ].map((t) => ({ ...t, href: `${base}/${t.k}` }));
  const cur = tabs.find((t) => t.k === tab) ? tab : "connectors";
  return (
    <DetailShell
      crumbs={[["Projects", "/projects"], [p.name]]}
      title={p.name}
      lede={p.description || undefined}
      chips={<>{p.environments.map((e) => <EnvBadge key={e.id} e={e.key} />)}</>}
      actions={<DeleteProjectButton p={p} />}
      facts={[["Readiness", <ReadinessBadges key="r" items={p.readiness} />]]}
      tabs={tabs}
      tab={cur}
    >
      {cur === "connectors" ? <ConnectorsTab p={p} /> : null}
      {cur === "code" ? <CodeTab p={p} /> : null}
      {cur === "scope" ? <ScopeTab p={p} /> : null}
      {cur === "team" ? <TeamTab p={p} /> : null}
      {cur === "architecture" ? <ArchitectureTab projectId={p.id} /> : null}
      {cur === "logs" ? <LogsTab p={p} /> : null}
      {cur === "graph" ? <Suspense fallback={<Loading />}><GraphExplorer projectId={p.id} /></Suspense> : null}
    </DetailShell>
  );
}

/** /projects · /projects/new/<step>?draft=<id> · /projects/<id>/<tab> */
export function ProjectsRoute({ slug }: { slug: string[] }) {
  if (slug[0] === "new") return <NewProject step={slug[1]} />;
  if (!slug[0]) return <ProjectList />;
  return <ProjectDetail pid={slug[0]} tab={slug[1] || "connectors"} />;
}

export { Unavailable };

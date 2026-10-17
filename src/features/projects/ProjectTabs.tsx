"use client";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { call as api } from "@/lib/call";
import type { Connection, Project, Resource } from "@/lib/types";
import { invalidate, useApi } from "@/lib/useApi";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/Badge";
import { Empty, ErrorState, Loading } from "@/components/ui/States";
import { CodeGraphCard, GraphSettingsCard } from "./CodeGraphCard";
import { ConnectionPanel } from "./ConnectPanel";
import { ResourcePicker } from "./ResourcePicker";

const ready = (c?: Connection) => !!c && (c.status === "connected" || c.status === "connected_with_warnings");

export function ConnectorsTab({ p }: { p: Project }) {
  return (
    <div className="stack">
      <p className="cs">Where this project runs and where its code lives. TRACE reads from both; it never writes to hosting.</p>
      <ConnectionPanel kind="hosting" owner={{ projectId: p.id }} />
      <ConnectionPanel kind="code" owner={{ projectId: p.id }} />
      <ConnectionPanel kind="database" owner={{ projectId: p.id }} />
    </div>
  );
}

type Bound = { id: string; provider_repository_id: string; full_name: string; selected_ref: string; default_branch: string; visibility: string };

export function CodeTab({ p }: { p: Project }) {
  const conns = useApi<Connection[]>(`/projects/${p.id}/connections`);
  const bound = useApi<Bound[]>(`/projects/${p.id}/repositories`);
  const code = conns.data?.find((c) => c.kind === "code" && ready(c));
  const [sel, setSel] = useState<Map<string, string | null>>(new Map());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  useEffect(() => {
    if (bound.data) setSel(new Map(bound.data.map((b) => [b.provider_repository_id, b.selected_ref])));
  }, [bound.data]);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/projects/${p.id}/repositories`, { method: "PUT", body: { repositories: [...sel].map(([id, ref]) => ({ provider_repository_id: id, selected_ref: ref })) } });
      toast("Repositories saved");
      invalidate();
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  if (conns.loading && !conns.data) return <Loading />;
  if (!code)
    return <Empty title="Connect GitHub first" lede="Once GitHub is connected, the repositories it can see are listed here to choose from." />;
  return (
    <div className="stack">
      {err ? <ErrorState error={err} /> : null}
      <div className="card">
        <h3 className="ct">Repositories</h3>
        <p className="cs" style={{ marginBottom: 10 }}>Choose the repositories this project's code lives in, and the branch or commit TRACE should read.</p>
        <ResourcePicker
          connectionId={code.id}
          idKey="provider_repository_id"
          selected={new Set(sel.keys())}
          onToggle={(id, r) =>
            setSel((m) => {
              const n = new Map(m);
              if (n.has(id)) n.delete(id);
              else n.set(id, r.default_branch || "main");
              return n;
            })
          }
          sub={(r) => `${r.private ? "Private" : "Public"} · default branch ${r.default_branch}${r.language ? " · " + r.language : ""}`}
          extra={(r) =>
            sel.has(String(r.provider_repository_id)) ? (
              <input
                className="input mono"
                style={{ height: 28, width: 160 }}
                aria-label={`Branch or commit for ${r.full_name}`}
                value={sel.get(String(r.provider_repository_id)) || ""}
                onChange={(e) => setSel((m) => new Map(m).set(String(r.provider_repository_id), e.target.value))}
              />
            ) : null
          }
        />
        <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <span className="xs muted">{sel.size} selected</span>
          <button className="btn pri sm" disabled={busy} onClick={save}>Save repositories</button>
        </div>
      </div>
      <div className="grid g-side" style={{ alignItems: "start" }}>
        <CodeGraphCard projectId={p.id} repoCount={bound.data?.length || 0} />
        <GraphSettingsCard />
      </div>
    </div>
  );
}

type ScopeRow = { id: string; environment_key: string; provider_resource_id: string; resource_type: string; name: string; log_availability: string; availability_note: string | null; service_key: string | null };

const availBadge = (a: string) =>
  a === "available" ? <Badge c="good">Logs found</Badge> : a === "none" ? <Badge c="warn">No logs</Badge> : a === "plan_limited" ? <Badge c="warn">Plan limit</Badge> : a === "stale" ? <Badge c="warn">Stale</Badge> : <Badge c="mute">Unknown</Badge>;

export function ScopeTab({ p }: { p: Project }) {
  const conns = useApi<Connection[]>(`/projects/${p.id}/connections`);
  const scope = useApi<ScopeRow[]>(`/projects/${p.id}/log-scope`);
  const host = conns.data?.find((c) => c.kind === "hosting" && ready(c));
  const [env, setEnv] = useState(p.environments[0]?.key || "production");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  useEffect(() => {
    if (scope.data) setSel(new Set(scope.data.filter((r) => r.environment_key === env).map((r) => r.provider_resource_id)));
  }, [scope.data, env]);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/projects/${p.id}/log-scope`, { method: "PUT", body: { environments: { [env]: [...sel].map((id) => ({ provider_resource_id: id })) } } });
      toast("Log scope saved");
      invalidate();
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  if (conns.loading && !conns.data) return <Loading />;
  return (
    <div className="stack">
      <p className="cs">Which hosting projects belong to each environment. Log availability is shown as found, missing or unknown; it is never assumed healthy.</p>
      {err ? <ErrorState error={err} /> : null}
      {scope.data?.length ? (
        <div className="card pad0">
          <div className="scroll-x">
            <table className="tbl">
              <thead><tr><th>Environment</th><th>Resource</th><th>Type</th><th>Logs</th></tr></thead>
              <tbody>
                {scope.data.map((r) => (
                  <tr key={r.id}>
                    <td>{r.environment_key}</td>
                    <td><b className="mono" style={{ fontSize: 12.5 }}>{r.name}</b></td>
                    <td className="sm">{r.resource_type}</td>
                    <td>{availBadge(r.log_availability)}<div className="xs muted">{r.availability_note}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {!host ? (
        <Empty title="Connect Vercel first" lede="Once Vercel is connected, its projects are listed here so you can assign them to an environment." />
      ) : (
        <div className="card">
          <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <h3 className="ct" style={{ marginRight: 8 }}>Edit scope for</h3>
            {p.environments.map((e) => (
              <button key={e.key} className={`chipb ${env === e.key ? "on" : ""}`} onClick={() => setEnv(e.key)}>{e.key}</button>
            ))}
          </div>
          <ResourcePicker
            connectionId={host.id}
            idKey="provider_resource_id"
            selected={sel}
            onToggle={(id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
            sub={(r: Resource) => `${r.framework || "Vercel project"}${r.git_repository ? " · " + r.git_repository : ""}`}
          />
          <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
            <button className="btn pri sm" disabled={busy} onClick={save}>Save scope for {env}</button>
          </div>
        </div>
      )}
    </div>
  );
}

type Member = { user_id: string; role: string; email: string; display_name: string | null; member_status: string };
export function TeamTab({ p }: { p: Project }) {
  const m = useApi<Member[]>(`/projects/${p.id}/members`);
  if (m.loading && !m.data) return <Loading />;
  if (m.error) return <ErrorState error={m.error} onRetry={m.reload} />;
  return (
    <div className="card pad0">
      <div className="scroll-x">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Role</th></tr></thead>
          <tbody>
            {(m.data || []).map((r) => (
              <tr key={r.user_id + r.role}>
                <td><b>{r.display_name || r.email}</b><div className="xs muted">{r.email}</div></td>
                <td><Badge c="mute">{r.role}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

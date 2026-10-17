"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { call as api } from "@/lib/call";
import type { Connection, Draft, Project } from "@/lib/types";
import { invalidate, useApi } from "@/lib/useApi";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { ErrorState, Loading } from "@/components/ui/States";
import { ConnectionPanel, statusBadge } from "./ConnectPanel";
import { ResourcePicker } from "./ResourcePicker";

const STEPS: Array<[key: string, stage: string, label: string, lede: string]> = [
  ["basics", "basics", "Basics", "Name and environments"],
  ["hosting", "hosting", "Hosting", "Vercel, read-only"],
  ["scope", "log_scope", "Log scope", "Which projects belong where"],
  ["code", "code", "Code", "GitHub repositories"],
  ["review", "review", "Review", "Check and create"],
];
const ENV_CHOICES = ["production", "staging", "uat", "dev"];
const ready = (c?: Connection) => !!c && (c.status === "connected" || c.status === "connected_with_warnings");

export function NewProject({ step: stepIn }: { step?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const draftId = sp.get("draft");
  const step = STEPS.find((s) => s[0] === stepIn)?.[0] || (draftId && sp.get("connected") ? "code" : "basics");
  const draft = useApi<Draft>(draftId ? `/project-drafts/${draftId}` : null);
  const conns = useApi<Connection[]>(draftId ? `/project-drafts/${draftId}/connections` : null);
  const host = conns.data?.find((c) => c.kind === "hosting" && c.status !== "disconnected");
  const code = conns.data?.find((c) => c.kind === "code" && c.status !== "disconnected");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);

  const go = (s: string, id = draftId) => router.push(`/projects/new/${s}${id ? `?draft=${id}` : ""}`);
  const patch = async (body: { data?: Draft["data"]; stages?: Draft["stages"] }, id = draftId, version = draft.data?.version) => {
    const r = await api<Draft>(`/project-drafts/${id}`, { method: "PATCH", body: { version, ...body } });
    invalidate();
    return r.data;
  };
  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  const stageState = (stage: string) => draft.data?.stages?.[stage] || "todo";
  const idx = STEPS.findIndex((s) => s[0] === step);

  /* ---- local form state, seeded from the draft so a reload resumes ---- */
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [envs, setEnvs] = useState<string[]>(["production"]);
  const [svcs, setSvcs] = useState("");
  const [scopeEnv, setScopeEnv] = useState("production");
  const [scope, setScope] = useState<Record<string, Set<string>>>({});
  const [repos, setRepos] = useState<Map<string, string>>(new Map());
  const [seeded, setSeeded] = useState<string | null>(null);
  useEffect(() => {
    const d = draft.data;
    if (!d || seeded === d.id) return;
    setSeeded(d.id);
    const b = d.data.basics;
    if (b) {
      setName(b.name);
      setDesc(b.description || "");
      setEnvs(b.environments.map((e) => e.name));
      setSvcs((b.services || []).map((s) => s.name).join(", "));
      setScopeEnv(b.environments[0]?.key || b.environments[0]?.name || "production");
    }
    setScope(Object.fromEntries(Object.entries(d.data.log_scope || {}).map(([k, v]) => [k, new Set(v.map((x) => x.provider_resource_id))])));
    setRepos(new Map((d.data.repositories || []).map((r) => [r.provider_repository_id, r.selected_ref || ""])));
  }, [draft.data, seeded]);

  const basics = () => ({ name: name.trim(), description: desc.trim() || null, environments: envs.map((e) => ({ name: e })), services: svcs.split(",").map((s) => s.trim()).filter(Boolean).map((n) => ({ name: n })) });

  const next = (skip = false) =>
    guard(async () => {
      const stage = STEPS[idx][1];
      if (step === "basics") {
        if (!name.trim()) throw new ApiError("Give the project a name.", "validation_error", "-", 422);
        if (!envs.length) throw new ApiError("Pick at least one environment.", "validation_error", "-", 422);
        if (!draftId) {
          const r = await api<Draft>("/project-drafts", { body: { data: { basics: basics() } } });
          const d = await patch({ stages: { basics: "done" } }, r.data.id, r.data.version);
          void d;
          go("hosting", r.data.id);
          return;
        }
        await patch({ data: { basics: basics() }, stages: { basics: "done" } });
      } else if (step === "scope") {
        const log_scope = Object.fromEntries(Object.entries(scope).filter(([, s]) => s.size).map(([k, s]) => [k, [...s].map((id) => ({ provider_resource_id: id }))]));
        await patch({ data: { log_scope }, stages: { log_scope: skip ? "skipped" : "done" } });
      } else if (step === "code") {
        const repositories = [...repos].map(([id, ref]) => ({ provider_repository_id: id, selected_ref: ref || null }));
        await patch({ data: { repositories }, stages: { code: skip ? "skipped" : "done" } });
      } else {
        await patch({ stages: { [stage]: skip ? "skipped" : "done" } });
      }
      go(STEPS[idx + 1][0]);
    });

  const activate = () =>
    guard(async () => {
      const r = await api<{ project: Project; repositories_bound: number }>(`/project-drafts/${draftId}/activate`, { body: {} });
      invalidate();
      toast(`${r.data.project.name} created`);
      router.push(`/projects/${r.data.project.id}/connectors`);
    });

  const rev = useApi<{ stages: Array<{ stage: string; stage_state: string; ready: boolean; note: string | null; connection: Connection | null }> }>(step === "review" && draftId ? `/project-drafts/${draftId}/review` : null);

  const needsDraft = step !== "basics" && !draftId;
  if (needsDraft) {
    return (
      <div className="page">
        <div className="callout warn">Start from the first step so the setup is saved as you go. <Link className="link" href="/projects/new/basics">Go to Basics</Link></div>
      </div>
    );
  }

  const stateLabel = (stage: string) => (stageState(stage) === "done" ? "Done" : stageState(stage) === "skipped" ? "Skipped · finish later" : null);

  return (
    <div className="page">
      <div className="row sm muted" style={{ marginBottom: 10 }}>
        <Link className="link" href="/projects" style={{ color: "var(--mute)" }}>Projects</Link>
        <Icon n="chev" c="sm" />
        <span>New project</span>
      </div>
      <div className="ph">
        <div>
          <h1 className="h1">New project</h1>
          <p className="lede">Connect the systems TRACE reads. Every connection is checked for real before it counts, and your progress is saved so you can come back.</p>
        </div>
        <div className="row">
          <button className="btn" onClick={async () => { if (draftId && confirm("Discard this setup?")) { await api(`/project-drafts/${draftId}/discard`, { body: {} }).catch(() => {}); } router.push("/projects"); }}>Cancel</button>
        </div>
      </div>
      <div className="wiz">
        <div id="wzNav">
          <nav className="wz-nav card" aria-label="Steps">
            {STEPS.map(([k, stage, label, lede], i) => (
              <Link key={k} className={`wz-s ${k === step ? "on" : ""} ${stageState(stage) === "done" ? "done" : ""}`} href={draftId || k === "basics" ? `/projects/new/${k}${draftId ? `?draft=${draftId}` : ""}` : "#"} aria-disabled={!draftId && k !== "basics"}>
                <span className="wz-n">{stageState(stage) === "done" ? "✓" : i + 1}</span>
                <span>
                  <span className="wz-t">{label}</span>
                  <span className="xs muted">{k === step ? lede : stateLabel(stage) || lede}</span>
                </span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="wz-main">
          <div className="card" id="wzBody">
            {err ? <ErrorState error={err} /> : null}
            {draft.error ? <ErrorState error={draft.error} onRetry={draft.reload} /> : null}

            {step === "basics" ? (
              <>
                <h2 className="wz-h">Basics</h2>
                <p className="cs wz-l">A project is one system. Everything below is per project.</p>
                <div className="field">
                  <label className="lbl" htmlFor="npName">Project name</label>
                  <input className="input" id="npName" value={name} onChange={(e) => setName(e.target.value)} placeholder="ShopFlow" autoComplete="off" />
                  <div className="xs muted fhint">Must be unique in your organization.</div>
                </div>
                <div className="field">
                  <label className="lbl" htmlFor="npDesc">Description <span className="muted" style={{ fontWeight: 400 }}>optional</span></label>
                  <input className="input" id="npDesc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Demo store API and storefront" />
                </div>
                <div className="field">
                  <div className="lbl">Environments</div>
                  <div className="chips2">
                    {ENV_CHOICES.map((e) => (
                      <button key={e} type="button" className={`chipb ${envs.includes(e) ? "on" : ""}`} onClick={() => setEnvs((o) => (o.includes(e) ? o.filter((x) => x !== e) : [...o, e]))}>{e}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="lbl" htmlFor="npSvc">Services <span className="muted" style={{ fontWeight: 400 }}>optional, comma separated</span></label>
                  <input className="input" id="npSvc" value={svcs} onChange={(e) => setSvcs(e.target.value)} placeholder="api, storefront" />
                  <div className="xs muted fhint">A service is a runtime component. One repository can hold several; map them later.</div>
                </div>
              </>
            ) : null}

            {step === "hosting" ? (
              <>
                <h2 className="wz-h">Hosting</h2>
                <p className="cs wz-l">Where the project runs. TRACE reads its projects, deployments and logs.</p>
                <ConnectionPanel kind="hosting" owner={{ draftId: draftId! }} />
              </>
            ) : null}

            {step === "scope" ? (
              <>
                <h2 className="wz-h">Log scope</h2>
                {!ready(host) ? (
                  <div className="callout warn sm">Connect and verify Vercel first, or skip and set the scope later in the project.</div>
                ) : (
                  <>
                    <p className="cs wz-l">Pick which Vercel projects belong to each environment.</p>
                    <div className="chips2" style={{ marginBottom: 10 }}>
                      {envs.map((e) => (
                        <button key={e} className={`chipb ${scopeEnv === e ? "on" : ""}`} onClick={() => setScopeEnv(e)}>{e}{scope[e]?.size ? ` (${scope[e].size})` : ""}</button>
                      ))}
                    </div>
                    <ResourcePicker
                      connectionId={host!.id}
                      idKey="provider_resource_id"
                      selected={scope[scopeEnv] || new Set()}
                      onToggle={(id) => setScope((o) => { const s = new Set(o[scopeEnv] || []); if (s.has(id)) s.delete(id); else s.add(id); return { ...o, [scopeEnv]: s }; })}
                      sub={(r) => `${r.framework || "Vercel project"}${r.git_repository ? " · " + r.git_repository : ""}`}
                    />
                    <p className="xs muted" style={{ marginTop: 10 }}>Logs show as unknown until a log drain is set up; TRACE does not assume they exist.</p>
                  </>
                )}
              </>
            ) : null}

            {step === "code" ? (
              <>
                <h2 className="wz-h">Code</h2>
                <p className="cs wz-l">Where the code lives. TRACE reads it at the exact deployed commit and never runs it.</p>
                <ConnectionPanel kind="code" owner={{ draftId: draftId! }} />
                {ready(code) ? (
                  <div style={{ marginTop: 16 }}>
                    <h3 className="ct" style={{ marginBottom: 8 }}>Choose repositories</h3>
                    <ResourcePicker
                      connectionId={code!.id}
                      idKey="provider_repository_id"
                      selected={new Set(repos.keys())}
                      onToggle={(id, r) => setRepos((m) => { const n = new Map(m); if (n.has(id)) n.delete(id); else n.set(id, r.default_branch || "main"); return n; })}
                      sub={(r) => `${r.private ? "Private" : "Public"} · default branch ${r.default_branch}${r.language ? " · " + r.language : ""}`}
                      extra={(r) => repos.has(String(r.provider_repository_id)) ? (
                        <input className="input mono" style={{ height: 28, width: 150 }} aria-label={`Branch or commit for ${r.full_name}`} value={repos.get(String(r.provider_repository_id)) || ""} onChange={(e) => setRepos((m) => new Map(m).set(String(r.provider_repository_id), e.target.value))} />
                      ) : null}
                    />
                  </div>
                ) : null}
              </>
            ) : null}

            {step === "review" ? (
              <>
                <h2 className="wz-h">Review</h2>
                <p className="cs wz-l">This is what TRACE will keep for {name || "this project"}. Skipped or unverified parts stay visibly unfinished.</p>
                <div className="card pad0 wzrv" style={{ marginBottom: 10 }}>
                  <div className="hh"><div><h3 className="ct">{name || "Untitled"}</h3><p className="cs">{desc || "No description"}</p></div><Link className="btn sm ghost" href={`/projects/new/basics?draft=${draftId}`}>Edit</Link></div>
                  <div style={{ padding: "0 16px 14px" }} className="row wrapr">{envs.map((e) => <span key={e} className="badge env-b">{e}</span>)}</div>
                </div>
                {rev.loading && !rev.data ? <Loading /> : null}
                {(rev.data?.stages || []).map((s) => (
                  <div key={s.stage} className="card pad0 wzrv" style={{ marginBottom: 10 }}>
                    <div className="hh">
                      <div><h3 className="ct">{s.stage === "hosting" ? "Hosting (Vercel)" : "Code (GitHub)"}</h3><p className="cs">{s.connection ? "Connection checked" : "Not connected"}</p></div>
                      <span className="row" style={{ gap: 8 }}>{s.connection ? statusBadge(s.connection.status) : <Badge c="warn">{s.note || "Not connected"}</Badge>}<Link className="btn sm ghost" href={`/projects/new/${s.stage}?draft=${draftId}`}>Edit</Link></span>
                    </div>
                  </div>
                ))}
                <p className="xs muted">
                  {Object.values(scope).reduce((a, s) => a + s.size, 0)} log scope resources · {repos.size} repositories selected
                </p>
              </>
            ) : null}
          </div>
          <div id="wzFoot">
            <div className="wz-foot">
              {idx > 0 ? <button className="btn" onClick={() => go(STEPS[idx - 1][0])}>Back</button> : <span />}
              <span className="sp1" />
              {step !== "basics" && step !== "review" ? <button className="btn ghost" disabled={busy} onClick={() => next(true)}>Skip, finish later</button> : null}
              {step === "review" ? (
                <button className="btn pri" disabled={busy || !draft.data} onClick={activate}><Icon n="check" c="sm" />Create project</button>
              ) : (
                <button className="btn pri" disabled={busy || (step === "hosting" && !ready(host)) || (step === "code" && !ready(code))} title={(step === "hosting" && !ready(host)) || (step === "code" && !ready(code)) ? "Verify the connection, or skip" : undefined} onClick={() => next(false)}>Continue</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

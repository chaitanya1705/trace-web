"use client";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { call as api } from "@/lib/call";
import type { Project } from "@/lib/types";
import { invalidate, useApi } from "@/lib/useApi";
import { toast } from "@/lib/toast";
import { ErrorState, Loading } from "@/components/ui/States";

type Svc = { id?: string; name: string; key?: string };

/** Runtime components of the project. One repository can serve several of them; mappings below say which folder belongs to which. */
export function ServicesCard({ p }: { p: Project }) {
  const [rows, setRows] = useState<Svc[]>([]);
  const [add, setAdd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  useEffect(() => setRows((p.services || []).map((s) => ({ id: s.id, name: s.name, key: s.key }))), [p.services]);

  const save = async (next: Svc[]) => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/projects/${p.id}/services`, { method: "PUT", body: { services: next.map((s) => (s.key ? { name: s.name, key: s.key } : { name: s.name })) } });
      toast("Services saved");
      invalidate();
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(false);
    }
  };
  const addOne = () => {
    const name = add.trim();
    if (busy || !name || rows.some((r) => r.name.toLowerCase() === name.toLowerCase())) return;
    setAdd("");
    void save([...rows, { name }]);
  };

  return (
    <div className="card">
      <h3 className="ct">Services</h3>
      <p className="cs" style={{ marginBottom: 10 }}>The runtime components of this project (for example api, storefront, worker). Mappings below tie each one to its code.</p>
      {err ? <ErrorState error={err} /> : null}
      <div className="chips2" style={{ marginBottom: 10 }}>
        {rows.length ? (
          rows.map((r) => (
            <span key={r.key || r.name} className="chipb on" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              {r.name}
              <button type="button" className="link" aria-label={`Remove ${r.name}`} disabled={busy} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }} onClick={() => void save(rows.filter((x) => x !== r))}>
                ×
              </button>
            </span>
          ))
        ) : (
          <span className="sm muted">No services yet.</span>
        )}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <input className="input" style={{ maxWidth: 260 }} placeholder="Add a service, e.g. api" aria-label="New service name" value={add} onChange={(e) => setAdd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addOne()} />
        <button className="btn sm" disabled={busy || !add.trim()} onClick={addOne}>Add service</button>
      </div>
    </div>
  );
}

type SvcMap = { service_key: string; path_prefix: string };
type PathMap = { runtime_prefix: string; repo_prefix: string };

/** Service and stack-trace path mappings for one bound repository. Never inferred from names; only what is saved here counts. */
export function MappingsCard({ p, bindingId, repo }: { p: Project; bindingId: string; repo: string }) {
  const res = useApi<{ services: SvcMap[]; paths: PathMap[] }>(`/projects/${p.id}/repositories/${bindingId}/mappings`);
  const [svc, setSvc] = useState<SvcMap[]>([]);
  const [paths, setPaths] = useState<PathMap[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  /* seed once; later refetches (triggered by saving elsewhere) must not overwrite edits that are not saved yet */
  const seeded = useRef(false);
  useEffect(() => {
    if (!res.data || seeded.current) return;
    seeded.current = true;
    setSvc(res.data.services);
    setPaths(res.data.paths);
  }, [res.data]);
  const options = p.services || [];

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ services: SvcMap[]; paths: PathMap[] }>(`/projects/${p.id}/repositories/${bindingId}/mappings`, { method: "PUT", body: { services: svc.filter((s) => s.service_key), paths: paths.filter((x) => x.runtime_prefix.trim()) } });
      setSvc(r.data.services);
      setPaths(r.data.paths);
      toast("Mappings saved");
      invalidate();
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  if (res.loading && !res.data) return <Loading label="Loading mappings" />;
  return (
    <div className="card">
      <h3 className="ct mono" style={{ fontSize: 14 }}>{repo}</h3>
      <p className="cs" style={{ marginBottom: 10 }}>Which services live in this repository, and in which folder. One repository can serve many services; leave the folder empty when a service is the whole repository.</p>
      {res.error ? <ErrorState error={res.error} onRetry={res.reload} /> : null}
      {err ? <ErrorState error={err} /> : null}
      {!options.length ? <div className="callout sm" style={{ marginBottom: 10 }}>Add at least one service above to map it to this repository.</div> : null}
      <div className="lbl">Services in this repository</div>
      {svc.map((m, i) => (
        <div key={i} className="row" style={{ gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <select className="input" style={{ width: 180 }} aria-label="Service" value={m.service_key} onChange={(e) => setSvc((o) => o.map((x, k) => (k === i ? { ...x, service_key: e.target.value } : x)))}>
            <option value="">Choose a service</option>
            {options.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}
          </select>
          <input className="input mono" style={{ flex: 1, minWidth: 160 }} aria-label="Folder in the repository" placeholder="Folder, e.g. services/api (empty = whole repository)" value={m.path_prefix} onChange={(e) => setSvc((o) => o.map((x, k) => (k === i ? { ...x, path_prefix: e.target.value } : x)))} />
          <button className="btn sm ghost" aria-label="Remove service mapping" onClick={() => setSvc((o) => o.filter((_, k) => k !== i))}>Remove</button>
        </div>
      ))}
      <button className="btn sm" disabled={!options.length} onClick={() => setSvc((o) => [...o, { service_key: "", path_prefix: "" }])}>Add service to this repository</button>

      <div className="lbl" style={{ marginTop: 14 }}>Stack-trace paths</div>
      <p className="xs muted" style={{ marginBottom: 6 }}>When a log shows a runtime path such as <span className="mono">/var/task/src/app.js</span>, this tells TRACE which repository folder it came from.</p>
      {paths.map((m, i) => (
        <div key={i} className="row" style={{ gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <input className="input mono" style={{ flex: 1, minWidth: 140 }} aria-label="Runtime path prefix" placeholder="/var/task/" value={m.runtime_prefix} onChange={(e) => setPaths((o) => o.map((x, k) => (k === i ? { ...x, runtime_prefix: e.target.value } : x)))} />
          <input className="input mono" style={{ flex: 1, minWidth: 140 }} aria-label="Repository folder" placeholder="src/" value={m.repo_prefix} onChange={(e) => setPaths((o) => o.map((x, k) => (k === i ? { ...x, repo_prefix: e.target.value } : x)))} />
          <button className="btn sm ghost" aria-label="Remove path mapping" onClick={() => setPaths((o) => o.filter((_, k) => k !== i))}>Remove</button>
        </div>
      ))}
      <button className="btn sm" onClick={() => setPaths((o) => [...o, { runtime_prefix: "", repo_prefix: "" }])}>Add path mapping</button>
      <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
        <button className="btn pri sm" disabled={busy} onClick={save}>Save mappings</button>
      </div>
    </div>
  );
}

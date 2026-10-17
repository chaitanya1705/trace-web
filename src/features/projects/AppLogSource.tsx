"use client";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { call as api } from "@/lib/call";
import type { Project } from "@/lib/types";
import { invalidate, useApi } from "@/lib/useApi";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { ErrorState, Loading } from "@/components/ui/States";

type Source = {
  configured: boolean;
  connection_id?: string;
  endpoint_url?: string;
  signature_header?: string;
  environment_key?: string | null;
  secret_configured?: boolean;
  secret?: string | null;
  last_batch_at?: string | null;
  last_batch?: { received: number; accepted: number; duplicates: number; rejected: number } | null;
  stored_events?: number;
  forwarder_snippet: string;
  hook_snippet: string;
  accepted_fields: string;
};

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" }) : "never");

function Copy({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="field">
      <div className="lbl">{label}</div>
      <div className="copyv">
        <code style={{ wordBreak: "break-all", fontFamily: mono ? undefined : "inherit" }}>{value}</code>
        <button className="btn sm" onClick={() => { void navigator.clipboard?.writeText(value); toast("Copied"); }}>Copy</button>
      </div>
    </div>
  );
}

function Code({ title, text }: { title: string; text: string }) {
  return (
    <div className="field">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="lbl" style={{ margin: 0 }}>{title}</div>
        <button className="btn sm ghost" onClick={() => { void navigator.clipboard?.writeText(text); toast("Copied"); }}>Copy</button>
      </div>
      <pre className="tqp" style={{ margin: "6px 0 0", maxHeight: 280, overflow: "auto", whiteSpace: "pre" }}>{text}</pre>
    </div>
  );
}

/** The app pushes its own structured events to TRACE: complete logs with no hosting plan. Setup is two environment variables and a small forwarder. */
export function AppLogSource({ p }: { p: Project }) {
  const src = useApi<Source>(`/projects/${p.id}/log-source`);
  const [env, setEnv] = useState(p.environments.find((e) => e.key === "production")?.key || p.environments[0]?.key || "");
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  if (src.loading && !src.data) return <Loading label="Loading log source" />;
  if (src.error) return <ErrorState error={src.error} onRetry={src.reload} />;
  const s = src.data!;
  const make = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<Source>(`/projects/${p.id}/log-source`, { body: { environment_key: env || null } });
      setSecret(r.data.secret || null);
      invalidate();
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(false);
    }
  };
  const local = !!s.endpoint_url && /localhost|127\.0\.0\.1/.test(s.endpoint_url);
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 className="ct">Send logs from your app</h3>
          <p className="cs" style={{ maxWidth: 720 }}>
            Your application pushes its own structured events to TRACE as they happen. This gives complete logs on any hosting plan, and TRACE still connects only to your app.
          </p>
        </div>
        {s.configured ? s.last_batch_at ? <Badge c="good">Receiving</Badge> : <Badge c="warn">Waiting for the first event</Badge> : <Badge c="mute">Not set up</Badge>}
      </div>
      {err ? <ErrorState error={err} /> : null}

      {!s.configured ? (
        <div className="row wrapr" style={{ gap: 10, alignItems: "flex-end", marginTop: 6 }}>
          <div className="field" style={{ margin: 0 }}>
            <label className="lbl" htmlFor="lsEnv">Events belong to environment</label>
            <select id="lsEnv" className="input" value={env} onChange={(e) => setEnv(e.target.value)} style={{ width: "auto" }}>
              {p.environments.map((e) => <option key={e.id} value={e.key}>{e.key}</option>)}
            </select>
          </div>
          <button className="btn pri" disabled={busy} onClick={make}>
            <Icon n="plus" c="sm" />
            Set up log source
          </button>
        </div>
      ) : (
        <>
          <p className="sm" style={{ margin: "4px 0 10px" }}>
            {s.stored_events?.toLocaleString()} events stored{s.environment_key ? <> · default environment <b>{s.environment_key}</b></> : null}
            {s.last_batch ? <> · last batch {when(s.last_batch_at)} ({s.last_batch.accepted} new of {s.last_batch.received})</> : null}
          </p>
          <Copy label="Endpoint URL" value={s.endpoint_url!} />
          {local ? <div className="callout warn sm" style={{ marginBottom: 10 }}>This address is on localhost, so a hosted app cannot reach it. Use a tunnel (for example ngrok) and set TRACE_PUBLIC_ORIGIN in the API settings.</div> : null}
          {secret ? (
            <div className="callout warn sm" style={{ marginBottom: 10 }}>
              <b>Copy the signing secret now. It is shown once.</b>
              <Copy label="Signing secret" value={secret} />
            </div>
          ) : null}
          <button className="btn sm" disabled={busy} onClick={make}>
            <Icon n="key" c="sm" />
            Generate a new secret
          </button>
        </>
      )}

      <details style={{ marginTop: 14 }} open={!s.configured || !!secret}>
        <summary className="sm" style={{ cursor: "pointer", fontWeight: 500 }}>How to connect your app (about 15 lines)</summary>
        <ol className="sm ink2 olist" style={{ margin: "10px 0" }}>
          <li>In the app&apos;s hosting settings (Vercel › Project › Settings › Environment Variables) add <code>TRACE_INGEST_URL</code> (the endpoint above) and <code>TRACE_INGEST_SECRET</code> (the signing secret), then redeploy.</li>
          <li>Add the forwarder file below. It stays off unless both variables are set, never raises into a request, and times out after 2 seconds.</li>
          <li>Call it once per request, where the request ends, with that request&apos;s events.</li>
          <li>Any other app can use the same endpoint: POST JSON <code>{"{"}"events": [...]{"}"}</code> (or NDJSON) with the header <code>x-trace-signature: sha256=&lt;hex HMAC-SHA256 of the raw body&gt;</code>. Fields: <span className="mono xs">{s.accepted_fields}</span>. Events without a unique <code>event_id</code> or a <code>message</code> are rejected; a missing time stays unknown.</li>
        </ol>
        <Code title="app/observability/forward.py (new file)" text={s.forwarder_snippet} />
        <Code title="Where to call it" text={s.hook_snippet} />
      </details>
    </div>
  );
}

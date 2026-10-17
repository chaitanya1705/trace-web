"use client";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { call as api } from "@/lib/call";
import { invalidate, useApi } from "@/lib/useApi";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/States";

type Drain = { secret_configured: boolean; endpoint_url: string; last_batch_at: string | null; last_batch: { received: number; accepted: number } | null; stored_events: number };

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" }) : "never");

function CopyRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="field">
      <div className="lbl">{label}</div>
      <div className="copyv">
        <code style={{ wordBreak: "break-all" }}>{value}</code>
        <button className="btn sm" onClick={() => { void navigator.clipboard?.writeText(value); toast("Copied"); }}>Copy</button>
      </div>
      {hint ? <div className="xs muted fhint">{hint}</div> : null}
    </div>
  );
}

/** The Vercel log-drain address for one hosting connection: always visible, so it can be pasted into Vercel at any time. */
export function DrainPanel({ connectionId }: { connectionId: string }) {
  const d = useApi<Drain>(`/connections/${connectionId}/drain`);
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (d.loading && !d.data) return <Loading label="Loading log drain" />;
  if (!d.data) return null;
  const x = d.data;
  const local = /localhost|127\.0\.0\.1/.test(x.endpoint_url);
  const make = async () => {
    setBusy(true);
    try {
      const r = await api<{ secret: string }>(`/connections/${connectionId}/drain/secret`, { body: {} });
      setSecret(r.data.secret);
      invalidate();
    } catch (e) {
      toast((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 className="ct">Log drain</h3>
          <p className="cs">
            Vercel pushes every log line to this address, so history is kept.{" "}
            {x.last_batch_at ? `Last batch ${when(x.last_batch_at)}${x.last_batch ? ` (${x.last_batch.accepted} new of ${x.last_batch.received})` : ""}. ` : "Nothing received yet. "}
            {x.stored_events.toLocaleString()} events stored.
          </p>
        </div>
        {x.last_batch_at ? <Badge c="good">Receiving</Badge> : x.secret_configured ? <Badge c="warn">Secret set, waiting for Vercel</Badge> : <Badge c="mute">Not set up</Badge>}
      </div>
      <CopyRow label="Endpoint URL" value={x.endpoint_url} hint="Paste this into Vercel: Team Settings › Drains › Add Drain › Logs › Custom endpoint." />
      {local ? <div className="callout warn sm" style={{ marginBottom: 10 }}>This address is on localhost, so Vercel cannot reach it. Use a tunnel (for example ngrok) and set TRACE_PUBLIC_ORIGIN in the API settings to its public address.</div> : null}
      {secret ? (
        <div className="callout warn sm" style={{ margin: "10px 0" }}>
          <b>Copy the secret now. It is shown once.</b>
          <CopyRow label="Signature secret" value={secret} hint="Set this as the Drain's signature secret in Vercel. Choose JSON or NDJSON, and the projects and environments from Log scope." />
        </div>
      ) : null}
      <button className="btn sm" disabled={busy} onClick={make}>
        <Icon n="key" c="sm" />
        {x.secret_configured ? "Generate a new secret" : "Generate signing secret"}
      </button>
    </div>
  );
}

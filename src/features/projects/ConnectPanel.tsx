"use client";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { call as api } from "@/lib/call";
import type { Check, Connection } from "@/lib/types";
import { invalidate, useApi } from "@/lib/useApi";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { LogoTile } from "@/components/ui/Logo";
import { ErrorState, Loading } from "@/components/ui/States";

export type Owner = { draftId: string; projectId?: undefined } | { projectId: string; draftId?: undefined };
type Kind = "hosting" | "code";

const base = (o: Owner) => (o.draftId ? `/project-drafts/${o.draftId}` : `/projects/${o.projectId}`);
const pending = (c?: Connection) => !!c && (c.status === "draft" || c.status === "verifying");

export function statusBadge(s: string) {
  if (s === "connected") return <Badge c="good">Connected</Badge>;
  if (s === "connected_with_warnings") return <Badge c="warn">Connected with warnings</Badge>;
  if (s === "draft" || s === "verifying") return <Badge c="mute">Checking…</Badge>;
  if (s === "disconnected") return <Badge c="mute">Disconnected</Badge>;
  return <Badge c="crit">{s === "failed" ? "Failed" : s[0].toUpperCase() + s.slice(1)}</Badge>;
}

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "never");

/** Connect / verify / rotate / disconnect one provider for a draft or a project. Real checks only. */
export function ConnectionPanel({ kind, owner }: { kind: Kind; owner: Owner }) {
  const list = useApi<Connection[]>(`${base(owner)}/connections`, (d) => (d.some((c) => c.kind === kind && pending(c)) ? 1500 : false));
  const conn = list.data?.find((c) => c.kind === kind && c.status !== "disconnected");
  const checks = useApi<Check[]>(conn ? `/connections/${conn.id}/checks` : null, () => (pending(conn) ? 1500 : false));
  const [token, setToken] = useState("");
  const [team, setTeam] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [rotating, setRotating] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      if (ok) toast(ok);
      invalidate();
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  const connectGithub = () =>
    run(async () => {
      const r = await api<{ url: string }>("/connect/github/start", { body: owner.draftId ? { draft_id: owner.draftId } : { project_id: owner.projectId } });
      window.location.href = r.data.url; // GitHub asks the user to install/authorize, then returns to the setup page
    });
  const connectVercel = () =>
    run(async () => {
      await api(`${base(owner)}/connections`, {
        body: { provider: "vercel", auth_method: "vercel_token", secret: token.trim(), config: team.trim() ? { team_id: team.trim() } : {} },
      });
      setToken("");
    }, "Checking the Vercel connection…");

  if (list.loading && !list.data) return <Loading label="Loading connection" />;
  const last = checks.data?.[0];

  return (
    <div className="card">
      {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : null}
      {err ? <ErrorState error={err} /> : null}
      {!conn ? (
        kind === "code" ? (
          <>
            <div className="row" style={{ gap: 12, marginBottom: 10 }}>
              <LogoTile id="github" size={34} />
              <div>
                <h3 className="ct">Connect GitHub</h3>
                <p className="cs">You approve access on GitHub and choose which repositories TRACE may read. No password or token is typed here.</p>
              </div>
            </div>
            <button className="btn pri" disabled={busy} onClick={connectGithub}>
              <Icon n="out" c="sm" />
              Connect GitHub
            </button>
          </>
        ) : (
          <>
            <div className="row" style={{ gap: 12, marginBottom: 10 }}>
              <LogoTile id="vercel" size={34} />
              <div>
                <h3 className="ct">Connect Vercel</h3>
                <p className="cs">Paste an access token from Vercel (Account Settings › Tokens). Vercel tokens cannot be read-only; TRACE only sends read requests.</p>
              </div>
            </div>
            <div className="fgrid">
              <div className="field">
                <label className="lbl" htmlFor="vtok">Access token</label>
                <input id="vtok" className="input mono" type="password" autoComplete="off" spellCheck={false} placeholder="vcp_…" value={token} onChange={(e) => setToken(e.target.value)} />
                <div className="xs muted fhint">Stored encrypted. It is never shown again.</div>
              </div>
              <div className="field">
                <label className="lbl" htmlFor="vteam">Team ID <span className="muted" style={{ fontWeight: 400 }}>optional</span></label>
                <input id="vteam" className="input mono" placeholder="team_…" value={team} onChange={(e) => setTeam(e.target.value)} />
                <div className="xs muted fhint">Needed when the project belongs to a team (Team Settings › General).</div>
              </div>
            </div>
            <button className="btn pri" disabled={busy || token.trim().length < 8} onClick={connectVercel}>
              <Icon n="check" c="sm" />
              Verify and connect
            </button>
          </>
        )
      ) : (
        <>
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div className="row" style={{ gap: 12 }}>
              <LogoTile id={conn.provider} size={34} />
              <div>
                <h3 className="ct">{conn.provider === "github" ? "GitHub" : "Vercel"}</h3>
                <p className="cs">
                  {conn.provider === "github" && conn.config.account ? `Account ${conn.config.account} · ` : ""}
                  {conn.provider === "vercel" && conn.config.username ? `User ${conn.config.username} · ` : ""}
                  last verified {when(conn.last_verified_at)}
                </p>
              </div>
            </div>
            {statusBadge(conn.status)}
          </div>
          {conn.last_error ? <div className="callout warn sm" style={{ margin: "10px 0" }}>{conn.last_error.message}</div> : null}
          {last ? (
            <div className="chklist" style={{ marginTop: 10 }}>
              {last.stages.map((s) => (
                <div key={s.key} className={`chkr ${s.status === "ok" ? "ok" : s.status === "warn" ? "warn" : s.status === "fail" ? "fail" : ""}`}>
                  <span className="chk-ic">{s.status === "ok" ? "✓" : s.status === "warn" ? "!" : s.status === "fail" ? "×" : "–"}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="chk-t">
                      {s.title}
                      {s.api ? <span className="mono xs muted chk-api">{s.api}</span> : null}
                    </div>
                    <div className="xs chk-m">{s.message}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="row wrapr" style={{ marginTop: 12, gap: 8 }}>
            <button className="btn sm" disabled={busy || pending(conn)} onClick={() => run(() => api(`/connections/${conn.id}/verify`, { method: "POST", body: {} }), "Re-checking…")}>
              <Icon n="refresh" c="sm" />
              Verify again
            </button>
            {conn.provider === "github" ? (
              <button className="btn sm" disabled={busy} onClick={connectGithub}>
                <Icon n="out" c="sm" />
                Change repository access
              </button>
            ) : null}
            {conn.stores_secret ? (
              <button className="btn sm" disabled={busy} onClick={() => setRotating((r) => !r)}>
                <Icon n="key" c="sm" />
                Replace token
              </button>
            ) : null}
            <button
              className="btn sm ghost"
              disabled={busy}
              onClick={() => {
                if (confirm("Disconnect? TRACE stops reading from it. Evidence already collected is kept.")) void run(() => api(`/connections/${conn.id}/disconnect`, { method: "POST", body: {} }), "Disconnected");
              }}
            >
              Disconnect
            </button>
          </div>
          {rotating ? (
            <div className="row" style={{ marginTop: 10, gap: 8 }}>
              <input className="input mono" type="password" autoComplete="off" placeholder="New token" value={token} onChange={(e) => setToken(e.target.value)} style={{ flex: 1 }} aria-label="New token" />
              <button
                className="btn pri sm"
                disabled={busy || token.trim().length < 8}
                onClick={() =>
                  run(async () => {
                    await api(`/connections/${conn.id}/rotate`, { body: { secret: token.trim() } });
                    setToken("");
                    setRotating(false);
                  }, "Checking the new token. The current one stays active until it passes.")
                }
              >
                Verify and replace
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

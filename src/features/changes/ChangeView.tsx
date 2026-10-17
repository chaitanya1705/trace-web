"use client";
import Link from "next/link";
import { useState } from "react";
import { API_BASE, ApiError } from "@/lib/api";
import { call } from "@/lib/call";
import { closeLayer, openLayer } from "@/lib/layer";
import { toast } from "@/lib/toast";
import { invalidate, useApi } from "@/lib/useApi";
import { Badge, Chip, EnvBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Modal, ModalHead } from "@/components/ui/Modal";
import { ErrorState, Loading } from "@/components/ui/States";
import { RISK, STATUS, type ChangeDetail, type PatchFile } from "./types";

function DiffFile({ f }: { f: PatchFile }) {
  const [open, setOpen] = useState(true);
  let a = 0;
  let b = 0;
  return (
    <div className="dfile">
      <button className="dfh" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className={`dfc ${open ? "open" : ""}`}><Icon n="chev" c="sm" /></span>
        <span className="mono dfp">{f.path}</span>
        <span style={{ flex: 1 }} />
        <span className="ad">+{f.additions}</span>
        <span className="dl2">−{f.deletions}</span>
      </button>
      {open ? (
        <div className="diff">
          {f.diff.split("\n").filter((l) => !l.startsWith("---") && !l.startsWith("+++") && l !== "").map((l, i) => {
            const h = /^@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(l);
            if (h) {
              a = +h[1];
              b = +h[2];
              return <div className="dl" key={i} style={{ background: "var(--bg3)" }}><b /><b /><span className="muted">{l}</span></div>;
            }
            const t = l[0];
            const row = (
              <div className={`dl ${t === "+" ? "add" : t === "-" ? "del" : ""}`} key={i}>
                <b>{t === "+" ? "" : a}</b>
                <b>{t === "-" ? "" : b}</b>
                <span>{l.slice(1) || " "}</span>
              </div>
            );
            if (t !== "+") a++;
            if (t !== "-") b++;
            return row;
          })}
        </div>
      ) : null}
    </div>
  );
}

function Revise({ c }: { c: ChangeDetail }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const go = async () => {
    setBusy(true);
    setErr(null);
    try {
      await call(`/changes/${c.id}/versions`, { body: { instruction: text.trim() } });
      closeLayer();
      toast("New version created. Earlier approvals no longer apply.");
      invalidate();
    } catch (e) {
      setErr(e as ApiError);
      setBusy(false);
    }
  };
  return (
    <Modal label="Modify change" width="min(560px,100%)">
      <ModalHead><b>Modify change</b></ModalHead>
      <div className="mb">
        <p className="sm ink2" style={{ marginTop: 0 }}>
          Say what should be different. TRACE drafts a new version from the same source. This creates version {c.current_version + 1}; approvals are per version, so they start again.
        </p>
        <textarea className="input" style={{ minHeight: 90 }} placeholder="e.g. Keep the existing behaviour for fixed-amount coupons and only guard the percentage case" value={text} onChange={(e) => setText(e.target.value)} />
        {err ? <div style={{ marginTop: 10 }}><ErrorState error={err} /></div> : null}
      </div>
      <div className="mf">
        <span />
        <span className="row">
          <button className="btn" onClick={closeLayer} disabled={busy}>Cancel</button>
          <button className="btn pri" onClick={go} disabled={busy || text.trim().length < 3}>{busy ? "Drafting…" : "Create new version"}</button>
        </span>
      </div>
    </Modal>
  );
}

export function ChangeView({ id }: { id: string }) {
  const res = useApi<ChangeDetail>(`/changes/${id}`);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const c = res.data;
  if (res.error && !c) return <div className="page"><ErrorState error={res.error} onRetry={res.reload} /></div>;
  if (!c) return <div className="page"><Loading label="Opening the change" /></div>;
  const st = STATUS[c.status] || [c.status, "mute"];
  const act = async (path: string, body?: unknown, ok?: string) => {
    setBusy(true);
    setErr(null);
    try {
      await call(`/changes/${c.id}/${path}`, { body: body ?? {} });
      if (ok) toast(ok);
      invalidate();
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(false);
    }
  };
  const decide = (decision: "approve" | "reject") => act("approvals", { decision, patch_hash: c.current.content_hash }, decision === "approve" ? "Approval recorded" : "Rejected");
  const open = ["proposed", "approved"].includes(c.status);
  const failed = c.current.checks.filter((k) => k.result === "failed");
  const mine = c.approvals.some((a) => a.mine && a.current && !a.revoked);

  return (
    <div className="page">
      <div className="row sm muted" style={{ marginBottom: 10 }}>
        <Link className="link" href="/changes" style={{ color: "var(--mute)" }}>Changes &amp; PRs</Link>
        <Icon n="chev" c="sm" />
        <span className="mono">{c.display_id}</span>
      </div>
      <div className="ph">
        <div style={{ minWidth: 0 }}>
          <h1 className="h1">{c.title}</h1>
          <div className="chips">
            <Badge c={st[1]}>{st[0]}</Badge>
            <Chip d="v">{c.project_name}</Chip>
            {c.environment_key ? <EnvBadge e={c.environment_key} /> : null}
            <Badge c={RISK[c.risk]}>{c.risk} risk</Badge>
            <Chip>version {c.current_version}</Chip>
            <Link className="chip" href={`/investigate/${c.project_id}/${c.run_id}`}><Icon n="flask" c="sm" />Investigation</Link>
          </div>
        </div>
        <div className="row wrapr">
          <a className="btn" href={`${API_BASE}/changes/${c.id}/patch`} download><Icon n="file" c="sm" />Download patch</a>
          {open ? <button className="btn" onClick={() => openLayer(<Revise c={c} />)}><Icon n="code" c="sm" />Modify change</button> : null}
          {open ? <button className="btn" onClick={() => act("withdraw", {}, "Withdrawn")} disabled={busy}>Withdraw</button> : null}
        </div>
      </div>
      {err ? <ErrorState error={err} /> : null}
      <div className="invgrid">
        <div>
          <div className="card callout vio" style={{ marginBottom: 14 }}>
            <div className="eyebrow">Why this change</div>
            <div style={{ marginTop: 6, lineHeight: 1.5 }}>{c.rationale}</div>
            {c.current.risk_reason ? <div className="xs muted" style={{ marginTop: 6 }}>Risk: {c.current.risk_reason}</div> : null}
            {c.ticket_display_id ? <div className="xs muted" style={{ marginTop: 4 }}>From {c.ticket_display_id}</div> : null}
          </div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Proposed code change · base commit <span className="mono">{c.current.base_commit.slice(0, 7)}</span></div>
          {c.current.files.map((f) => <DiffFile key={f.path} f={f} />)}
          <div className="callout sm" style={{ marginTop: 12 }}>
            <b>Not applied. Not tested.</b>{" "}
            <span className="ink2">
              This is a proposal. TRACE has not applied it anywhere and has not run any tests.{" "}
              {c.current.checks.filter((k) => k.result === "passed").map((k) => `${k.check.replace("_", " ")} passed for ${k.path}.`).join(" ")}
              {failed.length ? ` ${failed.length} check(s) failed.` : ""}
            </span>
          </div>
          {c.current.tests.length ? (
            <div className="card" style={{ marginTop: 12 }}>
              <h3 className="ct" style={{ marginBottom: 6 }}>Suggested checks (not run)</h3>
              {c.current.tests.map((t, i) => <div className="sm" key={i} style={{ padding: "3px 0" }}>{i + 1}. {t}</div>)}
              {c.current.rollback ? <div className="xs muted" style={{ marginTop: 8 }}>Rollback: {c.current.rollback}</div> : null}
            </div>
          ) : null}
        </div>
        <div className="sticky-side">
          <div className="card">
            <h3 className="ct">Approval</h3>
            <p className="cs">
              Needs {c.policy.required_approvals} approval{c.policy.required_approvals > 1 ? "s" : ""} from {c.policy.author_can_approve ? "an approver" : "someone other than the author"}. Approval is for this exact version ({c.current.content_hash.slice(0, 10)}).
            </p>
            <div className="row" style={{ gap: 8, margin: "8px 0" }}>
              <span className="tnum" style={{ fontSize: 22, fontWeight: 600 }}>{c.approved_count}</span>
              <span className="muted sm">of {c.policy.required_approvals} approved</span>
            </div>
            {c.approvals.filter((a) => a.current && !a.revoked).map((a, i) => (
              <div className="sm" key={i} style={{ padding: "4px 0" }}>
                <Badge c={a.decision === "approve" ? "good" : "crit"}>{a.decision === "approve" ? "Approved" : "Rejected"}</Badge> {a.actor}
                {a.reason ? <span className="muted"> · {a.reason}</span> : null}
              </div>
            ))}
            {c.approvals.some((a) => !a.current && !a.revoked) ? <div className="xs muted" style={{ marginTop: 6 }}>Earlier decisions were on older versions and do not count.</div> : null}
            {open ? (
              c.eligibility.can_approve ? (
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  <button className="btn pri" disabled={busy} onClick={() => decide("approve")}><Icon n="check" c="sm" />Approve</button>
                  <button className="btn danger" disabled={busy} onClick={() => decide("reject")}>Reject</button>
                </div>
              ) : (
                <div className="callout sm" style={{ marginTop: 10 }}><Icon n="lock" c="sm" /> <span className="ink2">{c.eligibility.reason}</span></div>
              )
            ) : null}
            {mine && open ? <button className="btn sm" style={{ marginTop: 8 }} disabled={busy} onClick={() => act("approvals/revoke", {}, "Your decision was withdrawn")}>Withdraw my decision</button> : null}
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h3 className="ct">Draft pull request</h3>
            <p className="cs">{c.draft_pr.reason}</p>
            <button className="btn" disabled style={{ marginTop: 8 }}><Icon n="gh" c="sm" />Open draft PR</button>
          </div>
          {c.versions.length > 1 ? (
            <div className="card" style={{ marginTop: 14 }}>
              <h3 className="ct" style={{ marginBottom: 6 }}>Versions</h3>
              {[...c.versions].reverse().map((v) => (
                <div className="sm" key={v.version} style={{ padding: "4px 0" }}>
                  <b>v{v.version}</b> <span className="mono xs muted">{v.content_hash.slice(0, 10)}</span>
                  {v.instruction ? <div className="xs ink2">“{v.instruction}”</div> : <div className="xs muted">First proposal</div>}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

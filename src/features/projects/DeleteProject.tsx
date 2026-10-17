"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { call } from "@/lib/call";
import { closeLayer, openLayer } from "@/lib/layer";
import type { Project } from "@/lib/types";
import { toast } from "@/lib/toast";
import { invalidate } from "@/lib/useApi";
import { Icon } from "@/components/ui/Icon";
import { Modal, ModalHead } from "@/components/ui/Modal";
import { ErrorState } from "@/components/ui/States";

function Confirm({ p }: { p: Project }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [withTickets, setWithTickets] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const ok = typed.trim() === p.name;

  const go = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await call<{ graph_nodes_deleted: number; tickets_deleted: number }>(
        `/projects/${p.id}?confirm=${encodeURIComponent(p.name)}&delete_tickets=${withTickets}`,
        { method: "DELETE" },
      );
      closeLayer();
      toast(`Deleted ${p.name}: ${r.data.graph_nodes_deleted.toLocaleString()} graph nodes${withTickets ? `, ${r.data.tickets_deleted} tickets` : ""}`);
      invalidate();
      router.push("/projects");
    } catch (e) {
      setErr(e as ApiError);
      setBusy(false);
    }
  };

  return (
    <Modal label={`Delete ${p.name}`} width="min(520px,100%)">
      <ModalHead>
        <b>Delete project</b>
      </ModalHead>
      <div className="mb">
        <div className="callout warn sm" role="alert">
          <Icon n="alert" c="sm" /> <b>This cannot be undone.</b>
        </div>
        <p className="sm" style={{ margin: "12px 0 6px" }}>Deleting <b>{p.name}</b> permanently removes:</p>
        <ul className="sm ink2" style={{ margin: "0 0 12px 18px", padding: 0, lineHeight: 1.6 }}>
          <li>its evidence graph (code, deployments, logs, investigations and findings)</li>
          <li>stored logs, deployments and index runs</li>
          <li>its connections, with their stored credentials</li>
          <li>repositories, log scope, services, environments and members</li>
        </ul>
        <p className="xs muted" style={{ margin: "0 0 12px" }}>
          Nothing is deleted at GitHub, Vercel or your database. The audit trail is kept.
        </p>
        <label className="row sm" style={{ gap: 8, marginBottom: 14, alignItems: "flex-start" }}>
          <input type="checkbox" checked={withTickets} onChange={(e) => setWithTickets(e.target.checked)} style={{ marginTop: 3 }} />
          <span>
            Also delete the tickets assigned to this project
            <span className="xs muted" style={{ display: "block" }}>Otherwise they go back to “Need a project”.</span>
          </span>
        </label>
        <div className="field">
          <label className="lbl" htmlFor="delProj">Type <span className="mono">{p.name}</span> to confirm</label>
          <input id="delProj" className="input" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ok && !busy && void go()} />
        </div>
        {err ? <div style={{ marginTop: 12 }}><ErrorState error={err} /></div> : null}
      </div>
      <div className="mf">
        <span />
        <span className="row">
          <button className="btn" onClick={closeLayer} disabled={busy}>Cancel</button>
          <button className="btn danger" onClick={go} disabled={!ok || busy}>
            <Icon n="x" c="sm" />
            {busy ? "Deleting…" : "Delete project"}
          </button>
        </span>
      </div>
    </Modal>
  );
}

/** Danger action in the project header. Only offered to people who can manage the project. */
export function DeleteProjectButton({ p }: { p: Project }) {
  if (!p.capabilities?.includes("manage_project")) return null;
  return (
    <button className="btn danger" onClick={() => openLayer(<Confirm p={p} />)}>
      <Icon n="x" />
      Delete project
    </button>
  );
}

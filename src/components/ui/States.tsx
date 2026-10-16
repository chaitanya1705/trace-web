"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { Icon } from "./Icon";

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="card" style={{ padding: 24 }} role="status" aria-live="polite">
      <span className="lspin" style={{ width: 14, height: 14, margin: "0 8px 0 0", borderWidth: 2, display: "inline-block", verticalAlign: "-2px" }} />
      <span className="sm muted">{label}…</span>
    </div>
  );
}

/** Actionable error with the correlation id (shared behaviour contract: never a bare failure). */
export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div className="callout warn" role="alert" style={{ marginBottom: 14 }}>
      <Icon n="alert" c="sm" /> <b>{error.status === 0 ? "Can't reach the API" : "Something went wrong"}.</b> <span className="ink2">{error.message}</span>
      <div className="xs muted" style={{ marginTop: 6 }}>
        {error.code}
        {error.requestId && error.requestId !== "-" ? ` · request ${error.requestId}` : ""}
        {onRetry ? (
          <>
            {" · "}
            <button className="link" onClick={onRetry} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
              Try again
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function Empty({ title, lede, action }: { title: string; lede?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card" style={{ padding: "36px 24px", textAlign: "center" }}>
      <h3 className="ct">{title}</h3>
      {lede ? (
        <p className="cs" style={{ margin: "6px auto 14px", maxWidth: 520 }}>
          {lede}
        </p>
      ) : null}
      {action}
    </div>
  );
}

/** For screens whose backend does not exist yet. Shows a reason, never sample rows. */
export function Unavailable({ title, lede, needs }: { title: string; lede: ReactNode; needs?: string }) {
  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1 className="h1">{title}</h1>
          <p className="lede">{lede}</p>
        </div>
      </div>
      <Empty
        title="Not available yet"
        lede={
          <>
            This part of TRACE is not built yet, so there is nothing real to show. {needs ? <>It needs: {needs}.</> : null}
          </>
        }
        action={
          <Link className="btn" href="/tickets">
            Go to Tickets
          </Link>
        }
      />
    </div>
  );
}

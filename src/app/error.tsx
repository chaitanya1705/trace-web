"use client";

/** Route-level error state: says what happened and offers a retry. No stack trace or secrets are shown. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card" style={{ maxWidth: 480 }} role="alert">
        <div className="eyebrow">Something went wrong</div>
        <h1 className="h1" style={{ marginTop: 6 }}>This screen could not load</h1>
        <p className="lede">Try again. If it keeps happening, share this reference with support.</p>
        <p className="xs muted mono" style={{ margin: "8px 0 14px" }}>{error.digest || "no-reference"}</p>
        <button className="btn pri" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}

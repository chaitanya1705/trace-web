import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card" style={{ maxWidth: 460, textAlign: "center" }}>
        <div className="eyebrow">404</div>
        <h1 className="h1" style={{ marginTop: 6 }}>That page does not exist</h1>
        <p className="lede">The link may be old, or you may not have access to it.</p>
        <div className="row" style={{ justifyContent: "center", gap: 8, marginTop: 14 }}>
          <Link className="btn pri" href="/home">Go to Home</Link>
          <Link className="btn" href="/">Landing page</Link>
        </div>
      </div>
    </main>
  );
}

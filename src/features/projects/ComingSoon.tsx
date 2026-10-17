import { Badge } from "@/components/ui/Badge";
import { LogoTile } from "@/components/ui/Logo";

const SOON = {
  hosting: { title: "More hosting and cloud connectors", items: [["aws", "Amazon Web Services"], ["azure", "Microsoft Azure"], ["gcp", "Google Cloud"]] },
  code: { title: "More code connectors", items: [["ado", "Azure DevOps"], ["gitlab", "GitLab"], ["bitbucket", "Bitbucket"]] },
} as const;

/** Connectors that are planned but not built. Shown as disabled tiles with their brand colour; nothing here connects to anything. */
export function ComingSoon({ kind }: { kind: keyof typeof SOON }) {
  const c = SOON[kind];
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3 className="ct" style={{ marginBottom: 4 }}>{c.title}</h3>
      <p className="cs" style={{ marginBottom: 12 }}>On the roadmap. They are not available yet, so nothing can be connected here.</p>
      <div className="fgrid" style={{ gap: 10 }}>
        {c.items.map(([id, name]) => (
          <div key={id} className="ctile row" aria-disabled="true" style={{ gap: 12, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 12, background: "var(--bg2)", opacity: 0.92, cursor: "not-allowed" }}>
            <LogoTile id={id} size={34} />
            <span style={{ fontWeight: 500 }}>{name}</span>
            <Badge c="mute">Coming soon</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

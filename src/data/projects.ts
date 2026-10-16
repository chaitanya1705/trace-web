/* Projects and their provider setup. TRACE supports two connectors for now: Vercel (where it runs) and GitHub (code).
   Sample data only. */

export type CloudId = "vercel";
export type CodeId = "github";
export type TicketId = "github" | "none";

export type Project = {
  id: string;
  cloud: CloudId;
  code: CodeId;
  tickets: TicketId;
  envs: string[];
  owner: string;
  repo: string;
  team: number;
};

export const CLOUDS: Record<CloudId, { name: string; lang: string; store: string; levels: string[] }> = {
  vercel: { name: "Vercel", lang: "Vercel logs", store: "Log drain buffer", levels: ["Team", "Project", "Environment"] },
};
export const CODES: Record<CodeId, string> = { github: "GitHub" };
export const TICKETS: Record<TicketId, string> = { github: "GitHub Issues", none: "None" };

export const PROJ3: Project[] = [
  { id: "Payments", cloud: "vercel", code: "github", tickets: "github", envs: ["production", "staging", "dev"], owner: "Priya S.", repo: "acme/payments", team: 4 },
  { id: "Fulfilment", cloud: "vercel", code: "github", tickets: "github", envs: ["production", "staging"], owner: "Marcus L.", repo: "acme/fulfilment", team: 5 },
  { id: "Storefront", cloud: "vercel", code: "github", tickets: "none", envs: ["production", "staging", "dev"], owner: "Ana R.", repo: "acme/storefront", team: 6 },
];

export const projOf = (id: string): Project => PROJ3.find((p) => p.id === id) || PROJ3[0];

export type ScopeItem = { n: string; t: string; logs: boolean; where: string; note?: string };
export type Scope = { path: string[]; store: string; items: ScopeItem[] };

const ITEMS: Record<string, ScopeItem[]> = {
  Payments: [
    { n: "payment-service", t: "Serverless function", logs: true, where: "source=lambda" },
    { n: "refund-service", t: "Serverless function", logs: true, where: "source=lambda" },
    { n: "middleware", t: "Edge middleware", logs: true, where: "source=edge" },
    { n: "redis-sessions", t: "Redis (external)", logs: false, where: "Not sent to Vercel", note: "Redis does not send logs to Vercel. Add a drain from your Redis provider, or ask a person to check." },
  ],
  Fulfilment: [
    { n: "inventory-service", t: "Serverless function", logs: true, where: "source=lambda" },
    { n: "order-service", t: "Serverless function", logs: true, where: "source=lambda" },
    { n: "notification-svc", t: "Cron job", logs: true, where: "source=lambda" },
    { n: "pg-inventory", t: "Postgres (external)", logs: false, where: "Not sent to Vercel", note: "Database logs and host metrics live with your database provider. Vercel does not collect them." },
  ],
  Storefront: [
    { n: "web-storefront", t: "Next.js functions", logs: true, where: "source=lambda" },
    { n: "recommendations", t: "Serverless function", logs: true, where: "source=lambda" },
    { n: "search-api", t: "Serverless function", logs: true, where: "source=lambda" },
    { n: "web-storefront (static)", t: "Static files", logs: true, where: "source=static" },
  ],
};

/** Log scope per environment: which workloads send logs through the Vercel drain. */
export function scopeOf(p: Project, env: string): Scope {
  const slug = (p.repo || "").split("/")[1] || p.id.toLowerCase();
  return {
    path: ["acme (team)", slug, env === "production" ? "target=production" : "custom env " + env],
    store: "drain buffer",
    items: ITEMS[p.id] || [],
  };
}

/** Starter log query for a workload (what "Open in Logs" prefills). */
export const QDEF = (svc: string, project = "project", env = "production") =>
  `project: ${project}\nenvironment: ${env}\nfunction: ${svc}\nlevel: error | warning\ntext: error OR exception OR timeout\nlimit: 200`;

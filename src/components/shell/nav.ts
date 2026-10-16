import type { IconName } from "@/components/ui/Icon";

/** Final navigation (prototype NAV7). Settings lives in the toolbar. */
export const NAV7: Array<[group: string | null, items: Array<[id: string, label: string, icon: IconName]>]> = [
  [null, [["home", "Home", "home"]]],
  ["Inbox", [["tickets", "Tickets", "alert"]]],
  ["Operations", [["investigate", "Investigate", "flask"], ["changes", "Changes & PRs", "commit"], ["observability", "Observability", "chart"]]],
  ["Setup", [["projects", "Projects", "db"]]],
];

export const CRUMB_LBL: Record<string, string> = {
  tickets: "Tickets",
  investigate: "Investigate",
  changes: "Changes & PRs",
  observability: "Observability",
  projects: "Projects",
  settings: "Settings",
};

/** Items in the "Since you were away" group of the sidebar. */
export const ONCALL: Array<[string, string, string]> = [
  ["Payments", "Priya S.", "until 09:00"],
  ["Fulfilment", "Marcus L.", "until 09:00"],
  ["Storefront", "Ana R.", "until Mon 09:00"],
];

"use client";
import Link from "next/link";
import { INC_ALL } from "@/data/tickets";
import { S } from "@/lib/state";
import { notify, useStore } from "@/lib/store";
import { Icon } from "@/components/ui/Icon";

type Away = { id: string; ic: string; tone: string; t: string | (() => string); sub: string; go: string; age: string };

const AWAY: Away[] = [
  { id: "a1", ic: "users", tone: "a", t: "TRACE asked you about the Redis pool", sub: "INC-2417", go: "/investigate/INC-2417", age: "4 min" },
  {
    id: "a2", ic: "alert", tone: "r",
    t: () => {
      const n = INC_ALL.filter((r: any) => !r.project).length;
      return n ? n + " ticket" + (n > 1 ? "s" : "") + " need a project" : "All tickets have a project";
    },
    sub: "Tickets", go: "/tickets", age: "9 min",
  },
  { id: "a3", ic: "check", tone: "g", t: "Lee K. approved FIX-30", sub: "1 of 2 approvals", go: "/changes/FIX-30", age: "12 min" },
  { id: "a4", ic: "spark", tone: "v", t: "TRACE proposed FIX-31", sub: "Payments · production", go: "/changes/FIX-31", age: "18 min" },
  { id: "a5", ic: "chart", tone: "g", t: "OBS-14 recovered after merge", sub: "Storefront · staging", go: "/observability/OBS-14", age: "1 h" },
];

/** "Since you were away" in the sidebar. Read state is per session until the API stores it. */
export function SideExtra() {
  useStore();
  const unread = AWAY.filter((a) => !S.awayRead[a.id]).length;
  return (
    <div id="sideExtra">
      <div className="sx">
        <div className="sx-h">
          <span className="nav-l" style={{ padding: 0 }}>Since you were away</span>
          {unread ? (
            <button
              className="sx-link"
              onClick={() => {
                AWAY.forEach((a) => (S.awayRead[a.id] = 1));
                notify();
              }}
            >
              Mark read
            </button>
          ) : null}
        </div>
        {AWAY.slice(0, 3).map((a) => (
          <Link
            key={a.id}
            className={`sx-item ${S.awayRead[a.id] ? "read" : ""}`}
            href={a.go}
            onClick={() => {
              S.awayRead[a.id] = 1;
              notify();
            }}
          >
            <span className={`sx-ic ${a.tone}`}>
              <Icon n={a.ic} c="sm" />
            </span>
            <span className="sx-b">
              <span className="sx-t">{typeof a.t === "function" ? a.t() : a.t}</span>
              <span className="sx-s">
                {a.sub} · {a.age}
              </span>
            </span>
            {S.awayRead[a.id] ? null : <span className="sx-dot" />}
          </Link>
        ))}
      </div>
    </div>
  );
}

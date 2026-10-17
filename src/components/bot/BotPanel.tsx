"use client";
import { botUi, closeBot } from "@/lib/bot";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/ui/Icon";

/** The workspace-wide bot is not built. Questions about one run are asked on that investigation's page. Honest placeholder, no canned answers. */
export function BotPanel() {
  useStore();
  return (
    <aside className={`ask${botUi.open ? " on" : ""}`} id="ask" aria-label="TRACE Bot">
      <header>
        <Icon n="spark" style={{ color: "var(--accent)" }} />
        <b>TRACE Bot</b>
        <span className="sp1" />
        <button className="btn icon ghost sm" id="askX" aria-label="Close" onClick={closeBot}>
          <Icon n="x" />
        </button>
      </header>
      <div className="msgs" style={{ padding: 16 }}>
        <div className="callout sm">
          <b>Not available yet.</b>{" "}
          <span className="ink2">
            The workspace-wide bot (history, follow-ups, scoped chat) is not built yet, and TRACE will not make answers up. You can ask a question about a single run on its Investigate page; the answer cites only that run&apos;s evidence.
          </span>
        </div>
      </div>
    </aside>
  );
}

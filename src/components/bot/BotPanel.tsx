"use client";
import { botUi, closeBot } from "@/lib/bot";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/ui/Icon";

/** The bot answers from investigation evidence, which does not exist yet. Honest placeholder, no canned answers. */
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
            The bot answers questions from an investigation&apos;s cited evidence. Investigations are not built yet, so there is nothing for it to answer from, and TRACE will not make answers up.
          </span>
        </div>
      </div>
    </aside>
  );
}

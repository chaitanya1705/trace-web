"use client";
import { useState } from "react";
import { Empty } from "@/components/ui/States";
import { CodeGraph } from "./CodeGraph";

type View = "map" | "code" | "db";

/** Architecture: System map, Code graph, Database (prototype layout). Only the code graph has real data today. */
export function ArchitectureTab({ projectId }: { projectId: string }) {
  const [v, setV] = useState<View>("code");
  return (
    <>
      <div className="seg" style={{ marginBottom: 14 }}>
        {([["map", "System map"], ["code", "Code graph"], ["db", "Database"]] as Array<[View, string]>).map(([k, l]) => (
          <button key={k} className={v === k ? "on" : ""} onClick={() => setV(k)}>{l}</button>
        ))}
      </div>
      {v === "code" ? <CodeGraph projectId={projectId} /> : null}
      {v === "map" ? (
        <Empty title="System map is not available yet" lede="The map of services and resources, and how an incident spreads across it, needs runtime evidence (logs) and deployment ingestion. It will appear once those exist." />
      ) : null}
      {v === "db" ? (
        <Empty title="Database diagram is not available yet" lede="It will be built from migration and schema files in the repository once schema extraction is added. TRACE never connects to your database." />
      ) : null}
    </>
  );
}

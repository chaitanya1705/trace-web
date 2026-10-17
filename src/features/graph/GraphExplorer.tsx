"use client";
import * as d3 from "d3";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { call } from "@/lib/call";
import { toast } from "@/lib/toast";
import { useApi } from "@/lib/useApi";
import { Icon } from "@/components/ui/Icon";
import { Empty, ErrorState, Loading } from "@/components/ui/States";

/* ------------------------------------------------------------------ API shapes (trace-api graph_explore.py) */
export type GNode = { id: string; label: string; labels: string[]; caption: string; properties: Record<string, unknown> };
export type GRel = { id: string; type: string; start: string; end: string; properties: Record<string, unknown> };
type GraphResult = { nodes: GNode[]; relationships: GRel[]; truncated: boolean; cypher: string; total?: number };
type Schema = {
  labels: Array<{ label: string; count: number }>;
  relationship_types: Array<{ type: string; count: number }>;
  property_keys: string[];
  ontology: { version: string; labels: Record<string, string>; relationships: Record<string, { from: string[]; to: string[]; doc: string }> };
  stored_events: { pending: number; failed: number };
  database: string;
};
type Degree = { type: string; direction: "in" | "out"; label: string | null; count: number };
type Detail = { node: GNode; degree: Degree[] };

type SNode = GNode & d3.SimulationNodeDatum;
type SLink = { rel: GRel; source: SNode; target: SNode; off: number };

/* ------------------------------------------------------------------ styling (Neo4j Browser's default label palette) */
const PALETTE = ["#4C8EDA", "#F79767", "#57C7E3", "#F16667", "#D9C8AE", "#8DCC93", "#ECB5C9", "#FFC454", "#DA7194", "#569480", "#C990C0", "#A5ABB6"];
/** Fixed order so a label keeps its colour across views and sessions. */
const LABEL_ORDER = [
  "Project", "Service", "Environment", "Deployment", "Ticket", "Repository", "Revision", "InvestigationRun", "LogEvent", "CodeSymbol", "SourceFile",
  "Finding", "Hypothesis", "SourceConnection", "GraphBuild", "Claim", "Assessment", "ImpactAssessment", "RequestSpan", "Measurement", "SourceChunk",
  "CodeCommunity", "Step", "ToolExecution", "RetrievalManifest", "RevisionManifest", "EvidenceGap", "Change", "PullRequest", "HumanCheck", "Resource",
];
const colorOf = (label: string) => {
  const i = LABEL_ORDER.indexOf(label);
  if (i >= 0) return PALETTE[i % PALETTE.length];
  let h = 0;
  for (const ch of label) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};
const R = 24;

function wrap(caption: string): string[] {
  const words = caption.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= 9) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
    if (lines.length === 2) break;
  }
  if (lines.length < 2 && cur) lines.push(cur);
  const out = lines.slice(0, 2).map((l) => (l.length > 10 ? l.slice(0, 9) + "…" : l));
  if (words.join(" ").length > out.join(" ").length && out.length && !out[out.length - 1].endsWith("…")) out[out.length - 1] = out[out.length - 1].slice(0, 9) + "…";
  return out;
}

const fmt = (v: unknown): string => (v === null || v === undefined ? "null" : typeof v === "object" ? JSON.stringify(v) : String(v));

/**
 * The project's evidence graph exactly as Neo4j stores it: every node keeps its labels and properties and every
 * relationship its type and direction. Behaves like Neo4j Browser: drag, zoom, click to inspect, double-click to expand,
 * and each view shows the Cypher that returns the same graph in Neo4j Browser or Aura.
 */
export function GraphExplorer({ projectId }: { projectId: string }) {
  const params = useSearchParams();
  const schema = useApi<Schema>(`/projects/${projectId}/graph/schema`);
  /* the canvas only exists once the schema has loaded (until then the loader is shown), so the effects below wait for it */
  const ready = !!schema.data;
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const store = useRef({ nodes: new Map<string, SNode>(), rels: new Map<string, GRel>(), hidden: new Set<string>() });
  const api = useRef<{ render: () => void; fit: () => void; zoomBy: (k: number) => void; focus: (id: string) => void } | null>(null);
  const [counts, setCounts] = useState({ nodes: 0, rels: 0 });
  const [cypher, setCypher] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [sel, setSel] = useState<{ kind: "node"; id: string } | { kind: "rel"; id: string } | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [pathFrom, setPathFrom] = useState<string | null>(null);
  const [onPath, setOnPath] = useState<{ nodes: Set<string>; rels: Set<string> } | null>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GNode[] | null>(null);
  const [full, setFull] = useState(false);
  const [view, setView] = useState("Trace overview");
  const selRef = useRef(sel);
  selRef.current = sel;
  const pathRef = useRef<{ from: string | null; on: typeof onPath }>({ from: null, on: null });
  pathRef.current = { from: pathFrom, on: onPath };

  /* ---------------------------------------------------------------- data merging */
  const merge = useCallback((res: GraphResult, opts: { replace?: boolean; origin?: string } = {}) => {
    const s = store.current;
    if (opts.replace) {
      s.nodes.clear();
      s.rels.clear();
      s.hidden.clear();
    }
    const o = opts.origin ? s.nodes.get(opts.origin) : undefined;
    for (const n of res.nodes) {
      s.hidden.delete(n.id);
      const old = s.nodes.get(n.id);
      if (old) Object.assign(old, n);
      else s.nodes.set(n.id, { ...n, x: o?.x !== undefined ? o.x + (Math.random() - 0.5) * 80 : undefined, y: o?.y !== undefined ? o.y + (Math.random() - 0.5) * 80 : undefined });
    }
    for (const r of res.relationships) s.rels.set(r.id, r);
    setCypher(res.cypher);
    setTruncated(res.truncated);
    api.current?.render();
  }, []);

  const load = useCallback(
    async (path: string, title: string, opts: { replace?: boolean; origin?: string; fit?: boolean } = { replace: true, fit: true }) => {
      setBusy(true);
      setErr(null);
      try {
        const r = await call<GraphResult>(path);
        merge(r.data, opts);
        setView(title);
        if (opts.replace) {
          setSel(null);
          setOnPath(null);
        }
        if (opts.fit !== false) { setTimeout(() => api.current?.fit(), 900); setTimeout(() => api.current?.fit(), 2600); }
        return r.data;
      } catch (e) {
        setErr(e as ApiError);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [merge],
  );

  const expand = useCallback(
    (id: string, type?: string, direction: "in" | "out" | "both" = "both") => {
      const n = store.current.nodes.get(id);
      const qs = new URLSearchParams({ direction, limit: "50", ...(type ? { type } : {}) });
      return load(`/projects/${projectId}/graph/nodes/${encodeURIComponent(id)}/neighbors?${qs}`, `Expand ${n?.caption || id}${type ? " · " + type : ""}`, { origin: id, fit: false }).then((d) => {
        if (d?.truncated) toast(`Showing ${d.nodes.length - 1} of ${d.total} neighbours`);
      });
    },
    [load, projectId],
  );

  const dismiss = useCallback((id: string) => {
    const s = store.current;
    s.nodes.delete(id);
    s.hidden.add(id);
    for (const [k, r] of s.rels) if (r.start === id || r.end === id) s.rels.delete(k);
    setSel(null);
    api.current?.render();
  }, []);

  const trace = useCallback(
    async (from: string, to: string) => {
      setPathFrom(null);
      const d = await load(`/projects/${projectId}/graph/path?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, "Trace path", { origin: from, fit: false });
      if (d) {
        setOnPath({ nodes: new Set(d.nodes.map((n) => n.id)), rels: new Set(d.relationships.map((r) => r.id)) });
        toast(`Path of ${d.relationships.length} relationship${d.relationships.length === 1 ? "" : "s"}`);
      }
    },
    [load, projectId],
  );

  /* ---------------------------------------------------------------- canvas (built once) */
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !ready) return;
    const svg = d3.select(el);
    svg.selectAll("*").remove();
    const defs = svg.append("defs");
    for (const [id, c] of [["nxA", "var(--nx-rel)"], ["nxAon", "var(--accent)"], ["nxApath", "var(--crit)"]]) {
      defs.append("marker").attr("id", id).attr("viewBox", "0 0 10 10").attr("refX", 9).attr("refY", 5).attr("markerWidth", 7).attr("markerHeight", 7).attr("orient", "auto-start-reverse")
        .append("path").attr("d", "M0 0L10 5L0 10z").attr("fill", c);
    }
    const root = svg.append("g").attr("class", "nx-root");
    const linkG = root.append("g"), labelG = root.append("g"), nodeG = root.append("g"), ringG = root.append("g");
    const sim = d3.forceSimulation<SNode, SLink>()
      .force("link", d3.forceLink<SNode, SLink>().id((d) => d.id).distance(150).strength(0.45))
      .force("charge", d3.forceManyBody().strength(-760).distanceMax(700))
      .force("collide", d3.forceCollide(R + 14))
      .force("x", d3.forceX(0).strength(0.018))
      .force("y", d3.forceY(0).strength(0.018))
      .alphaDecay(0.035);
    let links: SLink[] = [];
    let t = d3.zoomIdentity;

    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.08, 4]).on("zoom", (ev) => {
      t = ev.transform;
      root.attr("transform", t.toString());
      root.classed("far", t.k < 0.28);
    });
    svg.call(zoom).on("dblclick.zoom", null);
    const size = () => ({ w: el.clientWidth || 900, h: el.clientHeight || 640 });
    svg.call(zoom.transform, d3.zoomIdentity.translate(size().w / 2, size().h / 2));
    svg.on("click", () => setSel(null));

    const geom = (l: SLink) => {
      const s = l.source, e = l.target;
      const sx = s.x ?? 0, sy = s.y ?? 0, ex = e.x ?? 0, ey = e.y ?? 0;
      const dx = ex - sx, dy = ey - sy, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const cx = (sx + ex) / 2 + nx * l.off * 34, cy = (sy + ey) / 2 + ny * l.off * 34;
      const u = (ax: number, ay: number, bx: number, by: number) => { const d = Math.hypot(bx - ax, by - ay) || 1; return [(bx - ax) / d, (by - ay) / d]; };
      const [ux, uy] = u(sx, sy, cx, cy), [vx, vy] = u(ex, ey, cx, cy);
      const p0 = [sx + ux * R, sy + uy * R], p2 = [ex + vx * (R + 2), ey + vy * (R + 2)];
      const mx = 0.25 * p0[0] + 0.5 * cx + 0.25 * p2[0], my = 0.25 * p0[1] + 0.5 * cy + 0.25 * p2[1];
      let ang = (Math.atan2(p2[1] - p0[1], p2[0] - p0[0]) * 180) / Math.PI;
      if (ang > 90 || ang < -90) ang += 180;
      return { d: `M${p0[0]},${p0[1]} Q${cx},${cy} ${p2[0]},${p2[1]}`, mx, my, ang };
    };

    const tick = () => {
      linkG.selectAll<SVGPathElement, SLink>("path").attr("d", (l) => geom(l).d);
      labelG.selectAll<SVGTextElement, SLink>("text").attr("transform", (l) => { const g = geom(l); return `translate(${g.mx},${g.my}) rotate(${g.ang}) translate(0,-3)`; });
      nodeG.selectAll<SVGGElement, SNode>("g.nx-n").attr("transform", (d) => `translate(${d.x},${d.y})`);
      const s = selRef.current;
      const n = s?.kind === "node" ? store.current.nodes.get(s.id) : undefined;
      ringG.attr("transform", n ? `translate(${n.x},${n.y})` : "").style("display", n ? "inline" : "none");
    };
    sim.on("tick", tick);

    const restyle = () => {
      const s = selRef.current, p = pathRef.current;
      const focus = s?.kind === "node" ? s.id : null;
      nodeG.selectAll<SVGGElement, SNode>("g.nx-n")
        .classed("sel", (d) => focus === d.id)
        .classed("pinned", (d) => d.fx != null)
        .classed("onpath", (d) => !!p.on?.nodes.has(d.id))
        .classed("dim", (d) => !!p.on && !p.on.nodes.has(d.id));
      const hl = (l: SLink) => (s?.kind === "rel" && s.id === l.rel.id) || (!!focus && (l.rel.start === focus || l.rel.end === focus));
      linkG.selectAll<SVGPathElement, SLink>("path")
        .classed("hl", hl)
        .classed("onpath", (l) => !!p.on?.rels.has(l.rel.id))
        .classed("dim", (l) => !!p.on && !p.on.rels.has(l.rel.id))
        .attr("marker-end", (l) => (p.on?.rels.has(l.rel.id) ? "url(#nxApath)" : hl(l) ? "url(#nxAon)" : "url(#nxA)"));
      labelG.selectAll<SVGTextElement, SLink>("text").classed("hl", hl).classed("dim", (l) => !!p.on && !p.on.rels.has(l.rel.id));
      ringG.selectAll("*").remove();
      if (focus) {
        const items: Array<[string, string, () => void]> = [
          ["+", "Expand", () => expand(focus)],
          ["×", "Dismiss", () => dismiss(focus)],
          ["⇢", "Trace path from here", () => setPathFrom(focus)],
        ];
        const arc = d3.arc<{ i: number }>().innerRadius(R + 3).outerRadius(R + 28).padAngle(0.04)
          .startAngle((d) => -Math.PI / 3 + (d.i * 2 * Math.PI) / 3 - Math.PI / 3)
          .endAngle((d) => -Math.PI / 3 + ((d.i + 1) * 2 * Math.PI) / 3 - Math.PI / 3);
        items.forEach(([glyph, title, fn], i) => {
          const g = ringG.append("g").attr("class", "nx-ring").attr("role", "button").attr("aria-label", title).attr("tabindex", 0)
            .on("click", (ev: MouseEvent) => { ev.stopPropagation(); fn(); })
            .on("keydown", (ev: KeyboardEvent) => { if (ev.key === "Enter") fn(); });
          g.append("path").attr("d", arc({ i })!);
          const [cx, cy] = arc.centroid({ i } as any);
          g.append("text").attr("x", cx).attr("y", cy).attr("dy", "0.35em").attr("text-anchor", "middle").text(glyph);
          g.append("title").text(title);
        });
      }
      tick();
    };

    const render = () => {
      const s = store.current;
      const nodes = [...s.nodes.values()];
      const groups = new Map<string, GRel[]>();
      for (const r of s.rels.values()) {
        if (!s.nodes.has(r.start) || !s.nodes.has(r.end)) continue;
        const k = [r.start, r.end].sort().join("|");
        (groups.get(k) || groups.set(k, []).get(k)!).push(r);
      }
      links = [];
      for (const [k, rs] of groups) {
        const [a] = k.split("|");
        rs.forEach((r, i) => {
          const off = rs.length === 1 ? 0 : i - (rs.length - 1) / 2;
          links.push({ rel: r, source: s.nodes.get(r.start)!, target: s.nodes.get(r.end)!, off: r.start === a ? off : -off });
        });
      }
      linkG.selectAll<SVGPathElement, SLink>("path").data(links, (l) => l.rel.id).join("path").attr("class", "nx-l")
        .on("click", (ev: MouseEvent, l) => { ev.stopPropagation(); setSel({ kind: "rel", id: l.rel.id }); });
      labelG.selectAll<SVGTextElement, SLink>("text").data(links, (l) => l.rel.id).join("text").attr("class", "nx-lt").attr("text-anchor", "middle").text((l) => l.rel.type);
      const ng = nodeG.selectAll<SVGGElement, SNode>("g.nx-n").data(nodes, (d) => d.id).join((enter) => {
        const g = enter.append("g").attr("class", "nx-n").attr("tabindex", 0).attr("role", "button");
        g.append("circle").attr("class", "halo").attr("r", R + 5);
        g.append("circle").attr("class", "body").attr("r", R);
        g.append("text").attr("class", "cap").attr("text-anchor", "middle");
        return g;
      });
      ng.attr("aria-label", (d) => `${d.label} ${d.caption}`);
      ng.select<SVGCircleElement>("circle.body").attr("fill", (d) => colorOf(d.label)).attr("stroke", (d) => d3.color(colorOf(d.label))!.darker(0.7).formatHex());
      ng.select<SVGTextElement>("text.cap").each(function (d) {
        const lines = wrap(d.caption || d.label);
        d3.select(this).selectAll("tspan").data(lines).join("tspan").attr("x", 0).attr("dy", (_l, i) => (i === 0 ? `${0.35 - (lines.length - 1) * 0.55}em` : "1.1em")).text((l) => l);
      });
      ng.on("click", (ev: MouseEvent, d) => {
        ev.stopPropagation();
        const from = pathRef.current.from;
        if (from && from !== d.id) return void trace(from, d.id);
        setSel({ kind: "node", id: d.id });
      })
        .on("dblclick", (ev: MouseEvent, d) => { ev.stopPropagation(); expand(d.id); })
        .on("keydown", (ev: KeyboardEvent, d) => { if (ev.key === "Enter") setSel({ kind: "node", id: d.id }); if (ev.key === " ") { ev.preventDefault(); expand(d.id); } })
        .call(d3.drag<SVGGElement, SNode>()
          .clickDistance(4)
          /* a click is not a drag: a node is pinned only once it has actually been moved */
          .on("start", (ev) => { if (!ev.active) sim.alphaTarget(0.25).restart(); })
          .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
          .on("end", (ev) => { if (!ev.active) sim.alphaTarget(0); restyle(); }));
      sim.nodes(nodes);
      (sim.force("link") as d3.ForceLink<SNode, SLink>).links(links);
      sim.alpha(nodes.length > 150 ? 0.8 : 0.6).restart();
      setCounts({ nodes: nodes.length, rels: links.length });
      restyle();
    };

    const fit = () => {
      const ns = [...store.current.nodes.values()];
      if (!ns.length) return;
      const { w, h } = size();
      const xs = ns.map((n) => n.x ?? 0), ys = ns.map((n) => n.y ?? 0);
      const x0 = Math.min(...xs) - 60, x1 = Math.max(...xs) + 60, y0 = Math.min(...ys) - 60, y1 = Math.max(...ys) + 60;
      const k = Math.min(w / (x1 - x0), h / (y1 - y0), 1.6);
      svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.translate(w / 2, h / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
    };
    const focus = (id: string) => {
      const n = store.current.nodes.get(id);
      if (!n) return;
      const { w, h } = size();
      svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.translate(w / 2, h / 2).scale(Math.max(t.k, 1)).translate(-(n.x ?? 0), -(n.y ?? 0)));
    };
    api.current = { render, fit, zoomBy: (k) => svg.transition().duration(250).call(zoom.scaleBy, k), focus };
    (el as any).__restyle = restyle;
    if (store.current.nodes.size) render();
    return () => {
      sim.stop();
      svg.on(".zoom", null);
    };
  }, [expand, dismiss, trace, ready]);

  /* restyle on selection/path changes without re-running the layout */
  useEffect(() => {
    (svgRef.current as any)?.__restyle?.();
  }, [sel, onPath, pathFrom]);

  /* first view: ?focus=<node id> expands that node; otherwise the trace overview */
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !ready) return;
    started.current = true;
    const f = params.get("focus");
    if (f) {
      load(`/projects/${projectId}/graph/nodes/${encodeURIComponent(f)}/neighbors?limit=60`, "Focus").then((d) => {
        if (d) setTimeout(() => setSel({ kind: "node", id: f }), 50);
      });
    } else load(`/projects/${projectId}/graph/explore?view=trace&limit=150`, "Trace overview");
  }, [load, params, projectId, ready]);

  /* node detail */
  useEffect(() => {
    if (sel?.kind !== "node") return setDetail(null);
    let dead = false;
    setDetail(null);
    call<Detail>(`/projects/${projectId}/graph/nodes/${encodeURIComponent(sel.id)}`).then((r) => !dead && setDetail(r.data)).catch(() => {});
    return () => void (dead = true);
  }, [sel, projectId]);

  /* search (debounced) */
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return setHits(null);
    const h = setTimeout(() => {
      call<GNode[]>(`/projects/${projectId}/graph/search?q=${encodeURIComponent(term)}&limit=15`).then((r) => setHits(r.data)).catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(h);
  }, [q, projectId]);

  const sync = async () => {
    setBusy(true);
    try {
      const r = await call<Record<string, number>>(`/projects/${projectId}/graph/sync`, { method: "POST" });
      toast(`Synced to Neo4j: ${r.data.deployments ?? 0} deployments, ${r.data.ticket_nodes ?? 0} tickets, ${r.data.stored_events ?? 0} new log events`);
      schema.reload();
      await load(`/projects/${projectId}/graph/explore?view=trace&limit=150`, "Trace overview");
    } catch (e) {
      setErr(e as ApiError);
    } finally {
      setBusy(false);
    }
  };

  const copy = () => navigator.clipboard?.writeText(cypher).then(() => toast("Cypher copied. Paste it into Neo4j Browser to see the same graph."));
  const shownLabels = useMemo(() => {
    const m = new Map<string, number>();
    store.current.nodes.forEach((n) => m.set(n.label, (m.get(n.label) || 0) + 1));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts]);

  if (schema.loading && !schema.data) return <Loading label="Reading the graph" />;
  if (schema.error)
    return schema.error.code === "dependency_unavailable"
      ? <Empty title="Neo4j is not connected" lede="The evidence graph (Neo4j) is not configured on the API, so there is nothing to explore yet." />
      : <ErrorState error={schema.error} onRetry={schema.reload} />;
  const sc = schema.data!;
  const total = sc.labels.reduce((a, l) => a + (l.label === "EvidenceRecord" ? 0 : l.count), 0);
  const selNode = sel?.kind === "node" ? store.current.nodes.get(sel.id) : undefined;
  const selRel = sel?.kind === "rel" ? store.current.rels.get(sel.id) : undefined;

  return (
    <div className={`nx ${full ? "full" : ""}`}>
      <div className="nx-bar">
        <span className="nx-prompt mono" title="The Cypher that returns this graph in Neo4j Browser">
          <b>neo4j$</b> {cypher || "…"}
        </span>
        <button className="btn sm" onClick={copy} disabled={!cypher}><Icon n="file" c="sm" />Copy Cypher</button>
      </div>
      <div className="nx-main">
        <div className="nx-canvas" ref={wrapRef}>
          <svg ref={svgRef} role="img" aria-label="Evidence graph. Drag to move nodes, scroll to zoom, double-click a node to expand it." />
          <div className="nx-search">
            <div className="tb-search">
              <Icon n="search" c="sm" />
              <input type="search" placeholder="Search nodes: name, title, path, message, commit, id" aria-label="Search graph" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {hits ? (
              <div className="nx-hits">
                {hits.length ? hits.map((h) => (
                  <button key={h.id} onClick={() => { setQ(""); setHits(null); merge({ nodes: [h], relationships: [], truncated: false, cypher: `MATCH (n {id: ${JSON.stringify(h.id)}}) RETURN n` }); expand(h.id).then(() => { setSel({ kind: "node", id: h.id }); setTimeout(() => api.current?.focus(h.id), 700); }); }}>
                    <i style={{ background: colorOf(h.label) }} /><span className="nx-hl">{h.label}</span><span className="nx-hc">{h.caption}</span>
                  </button>
                )) : <div className="xs muted" style={{ padding: 10 }}>No matching nodes</div>}
              </div>
            ) : null}
          </div>
          <div className="cg-tools">
            <button className="btn icon sm" aria-label="Zoom in" onClick={() => api.current?.zoomBy(1.3)}><Icon n="plus" c="sm" /></button>
            <button className="btn icon sm" aria-label="Zoom out" onClick={() => api.current?.zoomBy(1 / 1.3)}><svg className="ic sm"><path d="M5 12h14" /></svg></button>
            <button className="btn sm" onClick={() => api.current?.fit()}>Fit</button>
            <button className="btn sm" onClick={() => setFull((f) => !f)}>{full ? "Exit full screen" : "Full screen"}</button>
          </div>
          {pathFrom ? (
            <div className="nx-banner">
              Click another node to trace the shortest path from <b>{store.current.nodes.get(pathFrom)?.caption}</b>.
              <button className="btn sm ghost" onClick={() => setPathFrom(null)}>Cancel</button>
            </div>
          ) : onPath ? (
            <div className="nx-banner">
              Showing a traced path ({onPath.rels.size} relationships). <button className="btn sm ghost" onClick={() => setOnPath(null)}>Clear highlight</button>
            </div>
          ) : null}
          {busy ? <div className="nx-busy xs">Querying Neo4j…</div> : null}
          <div className="nx-foot xs">
            Displaying {counts.nodes} nodes, {counts.rels} relationships{truncated ? " (limited; expand nodes to see more)" : ""} · {view}
          </div>
        </div>
        <aside className="nx-side">
          {err ? <div className="callout warn sm" style={{ marginBottom: 10 }}>{err.message}{err.requestId !== "-" ? ` (request ${err.requestId})` : ""}</div> : null}
          {selNode ? (
            <NodePanel n={selNode} detail={detail} onExpand={(t, d) => expand(selNode.id, t, d)} onTrace={() => setPathFrom(selNode.id)} onDismiss={() => dismiss(selNode.id)}
              onPin={() => { if (selNode.fx != null) { selNode.fx = null; selNode.fy = null; } else { selNode.fx = selNode.x; selNode.fy = selNode.y; } (svgRef.current as any)?.__restyle?.(); }} />
          ) : selRel ? (
            <RelPanel r={selRel} doc={sc.ontology.relationships[selRel.type]?.doc} a={store.current.nodes.get(selRel.start)} b={store.current.nodes.get(selRel.end)} onPick={(id) => setSel({ kind: "node", id })} />
          ) : (
            <div>
              <div className="nx-h">Database <span className="mono xs muted">{sc.database}</span></div>
              <p className="xs muted" style={{ margin: "0 0 10px" }}>Ontology v{sc.ontology.version} · {total.toLocaleString()} nodes in this project</p>
              <div className="nx-h">Node labels</div>
              <div className="nx-pills">
                <button className="nx-pill all" onClick={() => load(`/projects/${projectId}/graph/explore?view=trace&limit=150`, "Trace overview")}>Trace overview</button>
                {sc.labels.map((l) => (
                  <button key={l.label} className="nx-pill" style={{ background: colorOf(l.label) }} title={sc.ontology.labels[l.label] || l.label}
                    onClick={() => load(`/projects/${projectId}/graph/explore?view=label&label=${l.label}&limit=100`, `Label ${l.label}`)}>
                    {l.label} <span>({l.count.toLocaleString()}{shownLabels.get(l.label) ? `, ${shownLabels.get(l.label)} shown` : ""})</span>
                  </button>
                ))}
              </div>
              <div className="nx-h">Relationship types</div>
              <div className="nx-pills">
                {sc.relationship_types.map((r) => (
                  <button key={r.type} className="nx-pill rel" title={sc.ontology.relationships[r.type]?.doc || `${(sc.ontology.relationships[r.type]?.from || []).join("|")} → ${(sc.ontology.relationships[r.type]?.to || []).join("|")}`}
                    onClick={() => load(`/projects/${projectId}/graph/explore?view=type&type=${r.type}&limit=60`, `Type ${r.type}`)}>
                    {r.type} <span>({r.count.toLocaleString()})</span>
                  </button>
                ))}
              </div>
              <hr className="hr" />
              <div className="nx-h">Keeping Neo4j current</div>
              <p className="xs muted" style={{ margin: "0 0 8px" }}>
                Scope, connections, repositories, deployments, tickets and stored logs are projected into Neo4j automatically by the worker.
                {sc.stored_events.pending ? ` ${sc.stored_events.pending} stored log event${sc.stored_events.pending === 1 ? " is" : "s are"} not in the graph yet.` : " Every stored log event is in the graph."}
                {sc.stored_events.failed ? ` ${sc.stored_events.failed} could not be written.` : ""}
              </p>
              <button className="btn sm" disabled={busy} onClick={sync}><Icon n="refresh" c="sm" />Sync now</button>
              <hr className="hr" />
              <p className="xs muted" style={{ margin: 0 }}>Click a node to inspect it, double-click to expand, drag to pin. Use ⇢ on a selected node, then click another to trace how they connect.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function NodePanel({ n, detail, onExpand, onTrace, onDismiss, onPin }: { n: SNode; detail: Detail | null; onExpand: (type?: string, dir?: "in" | "out") => void; onTrace: () => void; onDismiss: () => void; onPin: () => void }) {
  const props = detail?.node.properties || n.properties;
  const keys = Object.keys(props).filter((k) => k !== "id").sort();
  return (
    <div>
      <div className="nx-h">Node properties</div>
      <div className="nx-pills" style={{ marginBottom: 8 }}>
        {n.labels.map((l) => <span key={l} className="nx-pill" style={{ background: colorOf(l) }}>{l}</span>)}
      </div>
      <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <button className="btn sm pri" onClick={() => onExpand()}><Icon n="plus" c="sm" />Expand</button>
        <button className="btn sm" onClick={onTrace}>Trace path…</button>
        <button className="btn sm" onClick={onPin}>{n.fx != null ? "Unpin" : "Pin"}</button>
        <button className="btn sm ghost" onClick={onDismiss}>Dismiss</button>
      </div>
      <table className="nx-props">
        <tbody>
          <tr><th>&lt;id&gt;</th><td className="mono">{n.id}</td></tr>
          {keys.map((k) => <tr key={k}><th>{k}</th><td className={typeof props[k] === "string" && String(props[k]).length > 80 ? "long" : ""}>{fmt(props[k])}</td></tr>)}
        </tbody>
      </table>
      <div className="nx-h" style={{ marginTop: 12 }}>Relationships</div>
      {!detail ? <div className="xs muted">Loading…</div> : detail.degree.length ? (
        detail.degree.map((d, i) => (
          <button key={i} className="nx-deg" onClick={() => onExpand(d.type, d.direction)} title="Expand these">
            <span className="mono">{d.direction === "out" ? `-[:${d.type}]->` : `<-[:${d.type}]-`}</span>
            <span><i style={{ background: colorOf(d.label || "") }} />{d.label}</span>
            <b>{d.count}</b>
          </button>
        ))
      ) : <div className="xs muted">No relationships</div>}
    </div>
  );
}

function RelPanel({ r, doc, a, b, onPick }: { r: GRel; doc?: string; a?: SNode; b?: SNode; onPick: (id: string) => void }) {
  const keys = Object.keys(r.properties).sort();
  return (
    <div>
      <div className="nx-h">Relationship properties</div>
      <span className="nx-pill rel">{r.type}</span>
      {doc ? <p className="xs muted" style={{ margin: "8px 0 0" }}>{doc}</p> : null}
      <div className="nx-ends">
        <button onClick={() => a && onPick(a.id)}><i style={{ background: colorOf(a?.label || "") }} />{a?.caption || r.start}</button>
        <span className="mono">-[:{r.type}]-&gt;</span>
        <button onClick={() => b && onPick(b.id)}><i style={{ background: colorOf(b?.label || "") }} />{b?.caption || r.end}</button>
      </div>
      <table className="nx-props">
        <tbody>
          <tr><th>&lt;id&gt;</th><td className="mono">{r.id}</td></tr>
          {keys.map((k) => <tr key={k}><th>{k}</th><td>{fmt(r.properties[k])}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

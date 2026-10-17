"use client";
import * as d3 from "d3";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CodeGraphData, GraphNode, SymbolDetail } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { call } from "@/lib/call";
import { useApi } from "@/lib/useApi";
import { Icon } from "@/components/ui/Icon";
import { Empty, ErrorState, Loading } from "@/components/ui/States";

const REL_LABEL: Record<string, string> = { CALLS: "calls", USES: "uses", INHERITS_FROM: "inherits", CONTAINS: "contains" };
const rad = (n: GraphNode) => (n.kind === "class" ? 6 : 4) + Math.min(9, Math.sqrt(n.degree) * 1.3);
const edgeClass = (d: string) => (d === "resolved" || d === "extracted" ? "extracted" : d);

/** Incoming callers within the shown graph, up to `hops` away: the blast radius of a change to `id` as far as this view knows. */
function blast(id: string, edges: CodeGraphData["edges"], hops = 2) {
  const hit = new Map<string, number>([[id, 0]]);
  let frontier = [id];
  for (let d = 1; d <= hops; d++) {
    const next: string[] = [];
    for (const e of edges) if (e.relation !== "CONTAINS" && frontier.includes(e.target) && !hit.has(e.source)) (hit.set(e.source, d), next.push(e.source));
    frontier = next;
  }
  return hit;
}

/**
 * Code graph from the evidence graph (published build only). Static structure: a path here is connectivity, never proof
 * that anything failed at runtime.
 */
export function CodeGraph({ projectId }: { projectId: string }) {
  const [limit, setLimit] = useState(200);
  const res = useApi<CodeGraphData>(`/projects/${projectId}/graph/code?limit=${limit}`);
  const data = res.data;
  const [sel, setSel] = useState<string | null>(null);
  const [showBlast, setShowBlast] = useState(false);
  const [q, setQ] = useState("");
  const [comm, setComm] = useState<string | null>(null);
  const [rels, setRels] = useState<Record<string, boolean>>({ CALLS: true, USES: true, INHERITS_FROM: true });
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const fitRef = useRef<(() => void) | null>(null);
  const hover = useRef<string | null>(null);
  const colorOf = useMemo(() => {
    const m = new Map((data?.communities || []).map((c, i) => [c.id, i]));
    return (id: string | null) => `var(--s${((m.get(id || "") ?? 0) % 4) + 1})`;
  }, [data]);

  const visibleEdges = useMemo(() => (data?.edges || []).filter((e) => rels[e.relation] !== false), [data, rels]);
  const reach = useMemo(() => (sel && showBlast ? blast(sel, visibleEdges) : null), [sel, showBlast, visibleEdges]);

  /* layout is rebuilt only when the data or the relationship filter changes */
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !data || data.status !== "ready") return;
    const W = el.clientWidth || 900, H = 560;
    const svg = d3.select(el);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const defs = svg.append("defs");
    [["cgA", "var(--axis)"], ["cgAon", "var(--accent)"], ["cgAbr", "var(--crit)"]].forEach(([id, c]) =>
      defs.append("marker").attr("id", id).attr("viewBox", "0 0 10 10").attr("refX", 10).attr("refY", 5).attr("markerWidth", 5).attr("markerHeight", 5).attr("orient", "auto").append("path").attr("d", "M0 0L10 5L0 10z").attr("fill", c),
    );
    const root = svg.append("g");
    const nodes: any[] = data.nodes.map((n) => ({ ...n }));
    const ids = new Set(nodes.map((n) => n.id));
    const links: any[] = visibleEdges.filter((e) => ids.has(e.source) && ids.has(e.target)).map((e) => ({ ...e }));
    const comms = data.communities.map((c) => c.id);
    const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, comms.length);
    const cxy = Object.fromEntries(comms.map((c, i) => [c, [W / 2 + Math.cos(ang(i)) * W * 0.22, H / 2 + Math.sin(ang(i)) * H * 0.22]]));
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(42).strength(0.3))
      .force("charge", d3.forceManyBody().strength(-110))
      .force("collide", d3.forceCollide().radius((d: any) => rad(d) + 4))
      .force("x", d3.forceX((d: any) => (cxy[d.community] || [W / 2])[0]).strength(0.08))
      .force("y", d3.forceY((d: any) => (cxy[d.community] || [0, H / 2])[1]).strength(0.08))
      .stop();
    for (let i = 0; i < 300; i++) sim.tick();
    const hullG = root.append("g"), linkG = root.append("g"), nodeG = root.append("g"), labG = root.append("g");
    const line = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.6));
    const hulls = () => {
      hullG.selectAll("*").remove();
      data.communities.forEach((c) => {
        const pts: Array<[number, number]> = [];
        nodes.filter((n) => n.community === c.id).forEach((n) => { for (let a = 0; a < 8; a++) { const r = rad(n) + 18; pts.push([n.x + Math.cos((a * Math.PI) / 4) * r, n.y + Math.sin((a * Math.PI) / 4) * r]); } });
        const h = d3.polygonHull(pts);
        if (!h) return;
        const g = hullG.append("g").attr("class", "cg-hull").attr("data-c", c.id);
        g.append("path").attr("d", line(h as any)!);
        const top = h.reduce((a, b) => (b[1] < a[1] ? b : a));
        g.append("text").attr("x", top[0]).attr("y", top[1] - 6).attr("text-anchor", "middle").text(c.label);
      });
    };
    const edgeSel = linkG.selectAll("line").data(links).join("line").attr("class", (d: any) => "cg-e " + edgeClass(d.derivation)).attr("marker-end", "url(#cgA)");
    const nodeSel = nodeG.selectAll("g").data(nodes).join("g").attr("class", (d: any) => "cg-nd k-" + d.kind).attr("tabindex", 0).attr("role", "button").attr("aria-label", (d: any) => `${d.label}, ${d.kind}`);
    nodeSel.append("circle").attr("class", "halo").attr("r", (d: any) => rad(d) + 6);
    nodeSel.each(function (d: any) {
      const g = d3.select(this), r = rad(d);
      if (d.kind === "class") g.append("rect").attr("class", "body").attr("x", -r).attr("y", -r).attr("width", r * 2).attr("height", r * 2).attr("rx", r * 0.6).attr("transform", "rotate(45)").style("fill", colorOf(d.community));
      else g.append("circle").attr("class", "body").attr("r", r).style("fill", colorOf(d.community));
    });
    const labSel = labG.selectAll("text").data(nodes).join("text").attr("class", (d: any) => "cg-lbl" + (d.degree >= 10 ? " god" : "")).attr("text-anchor", "middle").text((d: any) => d.label);
    const place = () => {
      edgeSel.each(function (d: any) {
        const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y, len = Math.hypot(dx, dy) || 1, rt = rad(d.target) + 3;
        d3.select(this).attr("x1", d.source.x).attr("y1", d.source.y).attr("x2", d.target.x - (dx / len) * rt).attr("y2", d.target.y - (dy / len) * rt);
      });
      nodeSel.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      labSel.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y - rad(d) - 6);
    };
    place();
    hulls();
    const tip = tipRef.current!;
    nodeSel
      .on("mouseenter", (_e: any, d: any) => { hover.current = d.id; restyle(); tip.innerHTML = `<b class="mono">${d.label}</b><span>${d.kind} · ${d.file}:${d.line} · ${d.degree} links</span>`; tip.classList.add("on"); })
      .on("mousemove", (ev: MouseEvent) => { const b = el.getBoundingClientRect(); tip.style.left = ev.clientX - b.left + 14 + "px"; tip.style.top = ev.clientY - b.top + 14 + "px"; })
      .on("mouseleave", () => { hover.current = null; restyle(); tip.classList.remove("on"); })
      .on("click", (ev: MouseEvent, d: any) => { ev.stopPropagation(); setSel((s) => (s === d.id ? null : d.id)); })
      .on("keydown", (ev: KeyboardEvent, d: any) => { if (ev.key === "Enter") setSel(d.id); })
      .call(d3.drag<any, any>().on("start", (_e, d) => { d.fx = d.x; d.fy = d.y; }).on("drag", (e, d) => { d.x = d.fx = e.x; d.y = d.fy = e.y; place(); }).on("end", () => { hulls(); restyle(); }) as any);
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 4]).on("zoom", (ev) => root.attr("transform", ev.transform.toString()));
    svg.call(zoom as any).on("dblclick.zoom", null);
    svg.on("click", () => setSel(null));
    zoomRef.current = zoom;
    fitRef.current = () => {
      const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
      const x0 = Math.min(...xs) - 50, x1 = Math.max(...xs) + 50, y0 = Math.min(...ys) - 50, y1 = Math.max(...ys) + 50;
      const k = Math.min(W / (x1 - x0), H / (y1 - y0), 1.4);
      svg.transition().duration(450).call(zoom.transform as any, d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
    };
    fitRef.current();
    function restyle() { (el as any).__restyle?.(); }
    (el as any).__nodes = nodes;
    (el as any).__links = links;
    restyle();
    return () => { svg.on(".zoom", null); svg.selectAll("*").remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, visibleEdges, colorOf]);

  /* selection, search, community focus and blast radius only restyle: the layout is not rebuilt */
  useEffect(() => {
    const el = svgRef.current as any;
    if (!el || !data) return;
    const svg = d3.select(el as SVGSVGElement);
    const restyle = () => {
      const links: any[] = el.__links || [];
      const ql = q.trim().toLowerCase();
      const focus = hover.current || sel;
      const nb = new Set<string>();
      if (focus) { nb.add(focus); links.forEach((l) => { if (l.source.id === focus) nb.add(l.target.id); if (l.target.id === focus) nb.add(l.source.id); }); }
      const on = (d: any) => (!comm || d.community === comm) && (!ql || d.label.toLowerCase().includes(ql) || d.file.toLowerCase().includes(ql)) && (!reach || reach.has(d.id)) && (!focus || reach || nb.has(d.id));
      svg.selectAll<SVGGElement, any>(".cg-nd").classed("dim", (d) => !on(d)).classed("sel", (d) => d.id === sel).classed("br0", (d) => !!reach && reach.get(d.id) === 0).classed("br1", (d) => !!reach && reach.get(d.id) === 1).classed("br2", (d) => !!reach && reach.get(d.id) === 2);
      svg.selectAll<SVGTextElement, any>(".cg-lbl").classed("show", (d) => d.degree >= 10 || d.id === sel || d.id === hover.current || !!(ql && on(d)) || !!(reach && reach.has(d.id)) || !!(focus && nb.has(d.id))).classed("dim", (d) => !on(d));
      const inReach = (d: any) => !!reach && reach.has(d.source.id) && reach.has(d.target.id);
      svg.selectAll<SVGLineElement, any>(".cg-e").classed("dim", (d) => !(on(d.source) && on(d.target))).classed("hl", (d) => !reach && !!focus && (d.source.id === focus || d.target.id === focus)).classed("br", inReach)
        .attr("marker-end", (d) => (inReach(d) ? "url(#cgAbr)" : !reach && focus && (d.source.id === focus || d.target.id === focus) ? "url(#cgAon)" : "url(#cgA)"));
      svg.selectAll<SVGGElement, unknown>(".cg-hull").classed("dim", function () { return !!comm && (this as any).dataset.c !== comm; });
    };
    el.__restyle = restyle;
    restyle();
  }, [sel, q, comm, reach, data, visibleEdges]);

  if (res.loading && !data) return <Loading label="Loading the code graph" />;
  if (res.error)
    return res.error.code === "dependency_unavailable"
      ? <Empty title="The graph database is not connected" lede="The evidence graph (Neo4j) is not configured on the API, so there is no code graph to show." />
      : <ErrorState error={res.error} onRetry={res.reload} />;
  if (!data || data.status !== "ready")
    return (
      <Empty
        title="No code graph yet"
        lede="Select repositories and generate the graph from the Code tab."
        action={<Link className="btn pri" href={`/projects/${projectId}/code`}>Open Code</Link>}
      />
    );

  const build = data.builds[0];
  const counts = (() => { try { return JSON.parse(build.counts); } catch { return null; } })();
  const selNode = sel ? data.nodes.find((n) => n.id === sel) : null;

  return (
    <>
      <div className="row wrapr" style={{ gap: 10, marginBottom: 12 }}>
        <div className="tb-search" style={{ minWidth: 240 }}>
          <Icon n="search" c="sm" />
          <input type="search" placeholder="Find a function, class or file" aria-label="Find a symbol" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 6 }}>
          {Object.keys(REL_LABEL).filter((r) => r !== "CONTAINS").map((r) => (
            <button key={r} className={`badge ${rels[r] ? "b-mute" : ""}`} style={{ cursor: "pointer", border: "1px solid var(--line)", opacity: rels[r] ? 1 : 0.55 }} onClick={() => setRels((m) => ({ ...m, [r]: !m[r] }))}>
              {rels[r] ? "●" : "○"} {REL_LABEL[r]}
            </button>
          ))}
        </div>
        <select className="input" style={{ width: "auto" }} aria-label="Symbols shown" value={limit} onChange={(e) => setLimit(+e.target.value)}>
          {[100, 200, 400].map((n) => <option key={n} value={n}>{n} symbols</option>)}
        </select>
        <span className="sp1" />
        <span className="xs muted">
          {counts ? `${counts.symbols.toLocaleString()} symbols · ${(typeof counts.edges === "number" ? counts.edges : Object.values(counts.edges as Record<string, number>).reduce((a, b) => a + b, 0)).toLocaleString()} relationships · ` : ""}
          {build.repository} @ <span className="mono">{build.commit_sha.slice(0, 7)}</span>{data.truncated ? " · showing the most connected" : ""}
        </span>
      </div>
      <div className="grid g-side" style={{ alignItems: "start" }}>
        <div>
          <div className="gwrap cg-wrap" id="cgw">
            <svg ref={svgRef} id="cgsvg" role="img" aria-label="Code graph. Drag to move, scroll to zoom." style={{ width: "100%", height: 560, display: "block" }} />
            <div className="cg-tools">
              <button className="btn icon sm" aria-label="Zoom in" onClick={() => svgRef.current && zoomRef.current && d3.select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy as any, 1.3)}><Icon n="plus" c="sm" /></button>
              <button className="btn icon sm" aria-label="Zoom out" onClick={() => svgRef.current && zoomRef.current && d3.select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy as any, 1 / 1.3)}><svg className="ic sm"><path d="M5 12h14" /></svg></button>
              <button className="btn sm" onClick={() => fitRef.current?.()}>Fit</button>
            </div>
            <div className="cg-tip" ref={tipRef} />
          </div>
          <div className="glegend">
            <span><i style={{ borderColor: "var(--ink2)", background: "var(--ink2)" }} />Function or method</span>
            <span><i style={{ borderColor: "var(--ink2)", borderRadius: 2, background: "var(--bg3)" }} />Class</span>
            <span>── resolved</span><span>- - inferred</span><span>··· ambiguous</span>
            {showBlast && sel ? <span style={{ color: "var(--crit-ink)" }}>● in blast radius (callers within the shown graph)</span> : null}
          </div>
        </div>
        <div id="cgp">
          {!selNode ? (
            <div className="card">
              <h3 className="ct" style={{ marginBottom: 8 }}>Communities</h3>
              {data.communities.map((c) => (
                <button key={c.id} className={`cg-com ${comm === c.id ? "on" : ""}`} onClick={() => setComm((x) => (x === c.id ? null : c.id))}>
                  <span>{c.label}</span><span className="xs muted">{c.symbols} symbols</span>
                </button>
              ))}
              <hr className="hr" />
              <h3 className="ct" style={{ marginBottom: 8 }}>Most connected</h3>
              {data.nodes.slice(0, 5).map((n) => (
                <button key={n.id} className="cg-com" onClick={() => setSel(n.id)}>
                  <span className="mono" style={{ fontSize: 12.5 }}>{n.label}</span><span className="xs muted">{n.degree} links</span>
                </button>
              ))}
              <p className="xs muted" style={{ margin: "12px 0 0" }}>Select a symbol to see its callers, callees and blast radius.</p>
            </div>
          ) : (
            <SymbolPanel projectId={projectId} node={selNode} showBlast={showBlast} reachCount={reach ? reach.size - 1 : 0} onBlast={() => setShowBlast((b) => !b)} onClose={() => { setSel(null); setShowBlast(false); }} onPick={setSel} />
          )}
        </div>
      </div>
    </>
  );
}

function SymbolPanel({ projectId, node, showBlast, reachCount, onBlast, onClose, onPick }: { projectId: string; node: GraphNode; showBlast: boolean; reachCount: number; onBlast: () => void; onClose: () => void; onPick: (id: string) => void }) {
  const [d, setD] = useState<SymbolDetail | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  useEffect(() => {
    setD(null);
    setErr(null);
    call<SymbolDetail>(`/projects/${projectId}/graph/symbols/${node.id}`).then((r) => setD(r.data)).catch((e) => setErr(e));
  }, [projectId, node.id]);
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="eyebrow">{node.kind}</span>
        <button className="btn icon ghost sm" aria-label="Close" onClick={onClose}><Icon n="x" c="sm" /></button>
      </div>
      <h3 className="mono" style={{ font: "600 18px var(--f-mono)", margin: "4px 0 2px", letterSpacing: "-.01em" }}>{node.label}</h3>
      <div className="xs muted mono">{node.file}:{node.line}</div>
      <button className={`btn ${showBlast ? "pri" : ""} block`} style={{ marginTop: 12 }} onClick={onBlast}>
        <Icon n="network" c="sm" />{showBlast ? "Hide blast radius" : "Show blast radius"}
      </button>
      {showBlast ? (
        <div className="callout" style={{ marginTop: 10, padding: "10px 12px", fontSize: 12.5 }}>
          <b>{reachCount} symbol{reachCount === 1 ? "" : "s"} call {node.label}</b> within 2 hops of the symbols shown. Static reachability, not an observed failure.
        </div>
      ) : null}
      {err ? <div className="callout warn sm" style={{ marginTop: 10 }}>{err.message}{err.requestId !== "-" ? ` (request ${err.requestId})` : ""}</div> : null}
      {!d && !err ? <div className="xs muted" style={{ marginTop: 10 }}>Loading…</div> : null}
      {d ? (
        <>
          <hr className="hr" />
          <Refs title="Used by" items={d.used_by} onPick={onPick} />
          <Refs title="Uses" items={d.uses} onPick={onPick} />
          {d.chunks.length ? (
            <>
              <hr className="hr" />
              <div className="eyebrow" style={{ marginBottom: 6 }}>Source as indexed</div>
              {d.chunks.map((c) => (
                <div key={c.start}>
                  <div className="xs muted mono" style={{ marginBottom: 4 }}>lines {c.start}–{c.end} · sha256 {c.hash.slice(0, 12)}</div>
                  <pre className="tqp" style={{ maxHeight: 240, overflow: "auto", fontSize: 11.5 }}>{c.content}</pre>
                </div>
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Refs({ title, items, onPick }: { title: string; items: SymbolDetail["used_by"]; onPick: (id: string) => void }) {
  return (
    <>
      <div className="eyebrow" style={{ margin: "8px 0 6px" }}>{title} ({items.length})</div>
      {items.length ? items.slice(0, 20).map((r, i) => (
        <button key={r.id + i} className="cg-rel" onClick={() => onPick(r.id)} title={r.locator}>
          <span className="mono">{r.name}</span><span className="xs muted">{r.file.split("/").pop()}{r.derivation !== "resolved" ? " · " + r.derivation : ""}</span>
        </button>
      )) : <div className="xs muted">None in the published graph</div>}
      {items.length > 20 ? <div className="xs muted">+{items.length - 20} more</div> : null}
    </>
  );
}

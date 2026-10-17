import type { ReactNode } from "react";

/**
 * Minimal Markdown for bot answers: headings, paragraphs, bullet/numbered lists (nested by indent), **bold**,
 * *italic*, `code`, fenced code, simple tables and rules. Each answer is flattened into one token stream so the
 * typing animation and the [node_id] citation chips keep working across blocks.
 */

export type Inl<C> = { w?: string; cite?: C; br?: boolean; b?: boolean; i?: boolean; code?: boolean };
export type Block<C> =
  | { kind: "p"; toks: Inl<C>[] }
  | { kind: "h"; level: number; toks: Inl<C>[] }
  | { kind: "li"; depth: number; mark: string; toks: Inl<C>[] }
  | { kind: "code"; text: string }
  | { kind: "table"; rows: Inl<C>[][][] }
  | { kind: "hr" };

const CITE = /^\[([a-z]+_[0-9a-f]+)\]$/;
const SPLIT = /(\*\*[^*]+\*\*|`[^`]+`|\[[a-z]+_[0-9a-f]+\]|\*[^*\s][^*]*\*)/;

function inline<C>(text: string, cite: (id: string) => C | undefined, f: Omit<Inl<C>, "w" | "cite" | "br"> = {}): Inl<C>[] {
  const out: Inl<C>[] = [];
  text.split(SPLIT).forEach((part) => {
    if (!part) return;
    const id = CITE.exec(part)?.[1];
    if (id) {
      const c = cite(id);
      if (c) out.push({ cite: c });
    } else if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) out.push(...inline(part.slice(2, -2), cite, { ...f, b: true }));
    else if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      const inner = part.slice(1, -1), cid = /^[a-z]+_[0-9a-f]+$/.test(inner) ? cite(inner) : undefined;
      out.push(cid ? { cite: cid } : { ...f, w: inner, code: true });
    } else if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) out.push(...inline(part.slice(1, -1), cite, { ...f, i: true }));
    else part.split(/(\s+)/).forEach((w) => w && out.push({ ...f, w }));
  });
  return out;
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function parseMarkdown<C>(src: string, cite: (id: string) => C | undefined): Block<C>[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block<C>[] = [];
  let para: string[] = [];
  const flush = () => {
    if (!para.length) return;
    const toks: Inl<C>[] = [];
    para.forEach((l, n) => {
      if (n) toks.push({ br: true });
      toks.push(...inline(l.trim(), cite));
    });
    blocks.push({ kind: "p", toks });
    para = [];
  };
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    if (/^\s*```/.test(line)) {
      flush();
      const body: string[] = [];
      while (++n < lines.length && !/^\s*```/.test(lines[n])) body.push(lines[n]);
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }
    if (!line.trim()) { flush(); continue; }
    const h = /^\s*(#{1,4})\s+(.*)$/.exec(line);
    if (h) { flush(); blocks.push({ kind: "h", level: h[1].length, toks: inline(h[2], cite) }); continue; }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { flush(); blocks.push({ kind: "hr" }); continue; }
    const li = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) {
      flush();
      const mark = /\d/.test(li[2]) ? li[2].replace(")", ".") : "•";
      blocks.push({ kind: "li", depth: Math.min(4, Math.floor(li[1].replace(/\t/g, "  ").length / 2)), mark, toks: inline(li[3], cite) });
      continue;
    }
    const prev = blocks[blocks.length - 1];
    if (!para.length && prev?.kind === "li" && /^\s{2,}\S/.test(line)) {
      // indented text under a list item continues that item on its own line
      blocks.push({ kind: "li", depth: prev.mark ? prev.depth + 1 : prev.depth, mark: "", toks: inline(line.trim(), cite) });
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flush();
      const rows: Inl<C>[][][] = [];
      for (; n < lines.length && /^\s*\|.*\|\s*$/.test(lines[n]); n++) {
        if (/^\s*\|[\s:|-]+\|\s*$/.test(lines[n])) continue; // header separator
        rows.push(cells(lines[n]).map((c) => inline(c, cite)));
      }
      n--;
      blocks.push({ kind: "table", rows });
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

/** Number of reveal steps a block takes in the typing animation. Tables, code and rules appear whole. */
export const blockSize = (b: Block<unknown>) => (b.kind === "p" || b.kind === "h" || b.kind === "li" ? b.toks.length : 1);

/** Render blocks, revealing only the first `k` steps; `tok` renders one inline token. */
export function renderMarkdown<C>(blocks: Block<C>[], k: number, tok: (t: Inl<C>, key: string) => ReactNode, caret: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  let used = 0;
  const inl = (toks: Inl<C>[], key: string, room: number) => toks.slice(0, room).map((t, i) => (t.br ? <br key={`${key}-${i}`} /> : tok(t, `${key}-${i}`)));
  for (let bi = 0; bi < blocks.length && used < k; bi++) {
    const b = blocks[bi], room = k - used, size = blockSize(b);
    const key = `b${bi}`;
    const tail = room <= size ? caret : null;
    if (b.kind === "p") out.push(<p key={key} className="md-p">{inl(b.toks, key, room)}{tail}</p>);
    else if (b.kind === "h") out.push(<div key={key} className={`md-h md-h${b.level}`}>{inl(b.toks, key, room)}{tail}</div>);
    else if (b.kind === "li") out.push(
      <div key={key} className="md-li" style={{ paddingLeft: b.depth * 16 }}>
        {b.mark ? <span className={`md-mark${b.mark === "•" ? "" : " num"}`}>{b.mark}</span> : null}
        <span className="md-lt">{inl(b.toks, key, room)}{tail}</span>
      </div>,
    );
    else if (b.kind === "code") out.push(<pre key={key} className="md-code">{b.text}</pre>);
    else if (b.kind === "hr") out.push(<hr key={key} className="md-hr" />);
    else out.push(
      <div key={key} className="md-tw">
        <table className="md-table">
          <thead><tr>{(b.rows[0] || []).map((c, ci) => <th key={ci}>{inl(c, `${key}h${ci}`, c.length)}</th>)}</tr></thead>
          <tbody>{b.rows.slice(1).map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inl(c, `${key}r${ri}c${ci}`, c.length)}</td>)}</tr>)}</tbody>
        </table>
      </div>,
    );
    used += size;
  }
  return out;
}

/** Flat reveal steps (one per inline token, one per whole block), used to pace the typing animation. */
export function revealSteps<C>(blocks: Block<C>[]): Array<{ cite: boolean }> {
  return blocks.flatMap((b) => (b.kind === "p" || b.kind === "h" || b.kind === "li" ? b.toks.map((t) => ({ cite: !!t.cite })) : [{ cite: false }]));
}

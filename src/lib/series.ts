import { rng } from "./util";

/** Deterministic demo metric series (the prototype's `mkSeries`). */
export function mkSeries(kind: string): Array<[number, number]> {
  const r = rng(kind.length * 97 + 13);
  const p: Array<[number, number]> = [];
  for (let x = 0; x <= 26; x++) {
    let y: number;
    if (kind === "errors") y = x < 9 ? 2 + r() * 2 : Math.max(0, 186 * (1 - Math.exp(-(x - 9) / 1.8)) + (r() - 0.5) * 14);
    else if (kind === "lat") y = 690 + (r() - 0.5) * 26 + (x > 9 ? 6 : 0);
    else if (kind === "inv") y = 0.3 + r() * 0.15;
    else if (kind === "db") y = x < 7 ? 38 + (r() - 0.5) * 8 : 38 + 2362 * (1 - Math.exp(-(x - 7) / 1.2)) + (r() - 0.5) * 90;
    else if (kind === "pool") y = 3 + r() * 2.4;
    else y = 0;
    p.push([x, +y.toFixed(1)]);
  }
  return p;
}

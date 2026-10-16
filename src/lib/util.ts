/** Deterministic Park–Miller generator used for reproducible demo series. */
export const rng = (s: number) => () => {
  s = (s * 16807) % 2147483647;
  return (s - 1) / 2147483646;
};

export const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)];

/** "11:55" + 9 minutes => "12:04" */
export const clock = (t0: string, m: number) => {
  const [h, mm] = t0.split(":").map(Number);
  const T = h * 60 + mm + m;
  return String(Math.floor(T / 60)).padStart(2, "0") + ":" + String(T % 60).padStart(2, "0");
};

export const niceMax = (v: number) => {
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
};

export const ageLbl = (m: number) =>
  m < 1 ? "now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago";

export const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(" ");

import type { CSSProperties } from "react";

export type IconName =
  | "home" | "alert" | "search" | "flask" | "network" | "commit" | "chart" | "history" | "db" | "spark"
  | "send" | "check" | "x" | "chev" | "chevd" | "clock" | "code" | "shield" | "refresh" | "moon" | "sun"
  | "panel" | "play" | "bolt" | "lock" | "cloud" | "plus" | "filter" | "book" | "users" | "arrow" | "key"
  | "layers" | "eye" | "file" | "gh" | "out" | "mail" | "gear" | "bell" | "mark";

/** Mirrors the prototype's `ic()` helper: `<svg class="ic sm"><use href="#i-name"/></svg>`. */
export function Icon({
  n,
  c = "",
  style,
  ...rest
}: {
  n: IconName | (string & {});
  c?: string;
  style?: CSSProperties;
  "aria-label"?: string;
  role?: string;
}) {
  return (
    <svg className={`ic ${c}`.trim()} style={style} {...rest}>
      <use href={`#i-${n}`} />
    </svg>
  );
}

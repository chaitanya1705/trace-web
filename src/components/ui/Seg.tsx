import type { ReactNode } from "react";

/** Segmented control (`.seg`). */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  style,
  id,
}: {
  options: Array<[T, ReactNode]> | Array<{ k: T; label: ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  style?: React.CSSProperties;
  id?: string;
}) {
  const opts = (options as any[]).map((o) => (Array.isArray(o) ? o : [o.k, o.label])) as Array<[T, ReactNode]>;
  return (
    <div className="seg" style={style} id={id}>
      {opts.map(([k, l]) => (
        <button key={k} type="button" className={k === value ? "on" : ""} onClick={() => onChange(k)}>
          {l}
        </button>
      ))}
    </div>
  );
}

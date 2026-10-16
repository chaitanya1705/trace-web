import type { ReactNode } from "react";

/** `.ph` page header: title, lede, chips and right-hand actions. */
export function PageHead({
  title,
  lede,
  chips,
  right,
  eyebrow,
}: {
  title: ReactNode;
  lede?: ReactNode;
  chips?: ReactNode;
  right?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="ph">
      <div>
        {eyebrow ? (
          <div className="xs muted" style={{ marginBottom: 4 }}>
            {eyebrow}
          </div>
        ) : null}
        <h1 className="h1">{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
        {chips ? <div className="chips">{chips}</div> : null}
      </div>
      <div className="row wrapr">{right}</div>
    </div>
  );
}

"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { closeLayer } from "@/lib/layer";
import { Icon } from "./Icon";

/** Scrim + dialog. Clicking the scrim or pressing Escape closes; focus returns to the opener. */
export function Modal({
  label,
  children,
  width,
  onClose = closeLayer,
  className = "modal",
}: {
  label: string;
  children: ReactNode;
  width?: string;
  onClose?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>("input,select,textarea,button:not([aria-label='Close'])");
    first?.focus();
    return () => prev?.focus?.();
  }, []);
  return (
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={className} onKeyDown={(e) => {
          if (e.key !== "Tab" || !ref.current) return;
          const f = Array.from(ref.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex='-1'])"));
          if (!f.length) return;
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }} role="dialog" aria-modal="true" aria-label={label} ref={ref} style={width ? { width } : undefined}>
        {children}
      </div>
    </div>
  );
}

export function ModalHead({ children, onClose = closeLayer }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="mh2">
      {children}
      <button className="btn icon ghost sm" aria-label="Close" onClick={onClose}>
        <Icon n="x" />
      </button>
    </div>
  );
}

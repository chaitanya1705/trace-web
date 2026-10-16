"use client";
import { useEffect } from "react";
import { closeLayer, layerState } from "@/lib/layer";
import { useStore } from "@/lib/store";
import { toastState } from "@/lib/toast";
import { Icon } from "@/components/ui/Icon";

/** Toast host: one transient message at a time. */
export function Toaster() {
  useStore();
  return (
    <div className={`toast${toastState.on ? " on" : ""}`} id="toast" role="status" aria-live="polite">
      <Icon n="check" />
      {toastState.msg}
    </div>
  );
}

/** Overlay slot for modals, the command palette and the diff viewer. Escape closes it. */
export function LayerHost() {
  useStore();
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLayer();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);
  return <div id="layer">{layerState.node}</div>;
}

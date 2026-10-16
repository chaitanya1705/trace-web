"use client";
import type { ReactNode } from "react";
import { notify } from "./store";

/** One overlay slot (command palette, modals, diff viewer). Mirrors the prototype's `#layer`. */
export const layerState: { node: ReactNode | null; key: number } = { node: null, key: 0 };

export const openLayer = (node: ReactNode) => {
  layerState.node = node;
  layerState.key++;
  notify();
};
export const closeLayer = () => {
  if (layerState.node === null) return;
  layerState.node = null;
  notify();
};

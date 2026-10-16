"use client";
import { useSyncExternalStore } from "react";

/**
 * Tiny external store. Demo fixtures in `src/data` are mutable module state (exactly like the
 * prototype's globals); any action that mutates them calls `notify()` and every component that
 * called `useStore()` re-renders. When a real API lands this is the seam that TanStack Query replaces.
 */
let version = 0;
const listeners = new Set<() => void>();

export const notify = () => {
  version++;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Re-render the calling component whenever `notify()` runs. Returns the current version. */
export const useStore = () => useSyncExternalStore(subscribe, () => version, () => 0);

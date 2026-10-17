"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ApiError } from "./api";
import { call, type Meta } from "./call";

/** Bump after any write so every mounted `useApi` refetches. Replaces the old demo-fixture store. */
let ver = 0;
const subs = new Set<() => void>();
export const invalidate = () => {
  ver++;
  subs.forEach((f) => f());
};
const sub = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

export type ApiState<T> = { data: T | null; meta: Meta | null; error: ApiError | null; loading: boolean; reload: () => void };

/** GET `path` (null = skip). `poll(data)` returns ms to refetch again, or false to stop (used while a job is running). */
export function useApi<T>(path: string | null, poll?: (d: T) => number | false): ApiState<T> {
  const v = useSyncExternalStore(sub, () => ver, () => 0);
  const [s, setS] = useState<{ data: T | null; meta: Meta | null; error: ApiError | null; loading: boolean }>({ data: null, meta: null, error: null, loading: !!path });
  const [tick, setTick] = useState(0);
  const pollRef = useRef(poll);
  pollRef.current = poll;
  useEffect(() => {
    if (!path) {
      setS({ data: null, meta: null, error: null, loading: false });
      return;
    }
    let dead = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setS((o) => ({ ...o, loading: o.data === null }));
    call<T>(path)
      .then((r) => {
        if (dead) return;
        setS({ data: r.data, meta: r.meta, error: null, loading: false });
        const next = pollRef.current?.(r.data);
        if (next) timer = setTimeout(() => setTick((t) => t + 1), next);
      })
      .catch((e) => !dead && setS((o) => ({ ...o, error: e instanceof ApiError ? e : new ApiError(String(e), "error", "-", 0), loading: false })));
    return () => {
      dead = true;
      if (timer) clearTimeout(timer);
    };
  }, [path, v, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...s, reload };
}

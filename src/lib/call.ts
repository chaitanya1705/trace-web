import { api, ApiError } from "./api";

export type Meta = { request_id?: string; as_of?: string; next_cursor?: string | null; coverage?: Record<string, any> | null };
export type Envelope<T> = { data: T; meta: Meta };

/** JSON request helper over `api()`: `body` is serialized, `rawBody` is sent as is (PulseLab export), method defaults sensibly. */
export async function call<T>(path: string, init: { method?: string; body?: unknown; rawBody?: string } = {}): Promise<Envelope<T>> {
  const has = init.body !== undefined || init.rawBody !== undefined;
  const r = await api<T>(path, {
    method: init.method || (has ? "POST" : "GET"),
    body: init.rawBody ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
  return { data: r.data, meta: (r.meta || {}) as Meta };
}

export { ApiError };

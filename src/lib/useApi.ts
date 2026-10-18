"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "@/app/firebase/config";
import { ApiError, api, toApiError } from "@/lib/api";
import { cacheKey, dedupe, getEntry, isFresh, onInvalidate, sameJson, setEntry } from "@/lib/apiCache";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * GET helper with stale-while-revalidate caching.
 * - Cached data renders immediately; a background refresh updates it only if it changed.
 * - `loading` is true only when there is nothing to show yet (or a forced refresh is running).
 * - Pass `null` as the path to skip fetching (e.g. until the user is known).
 * - `refetch(extra)` with extra params forces a network call (e.g. `{ refresh: true }`).
 */
export function useApi<T>(path: string | null, params?: Record<string, unknown>) {
  const paramsKey = JSON.stringify(params ?? {});
  const uid = auth.currentUser?.uid ?? null;
  const key = path && uid ? cacheKey(uid, path, params) : null;

  const [state, setState] = useState<State<T>>(() => {
    const cached = key ? getEntry(key) : undefined;
    return { data: (cached?.data as T) ?? null, loading: !!path && !cached, error: null };
  });
  const seq = useRef(0);

  const run = useCallback(
    async (extra?: Record<string, unknown>) => {
      if (!path) return;
      const force = !!extra;
      const entry = key ? getEntry(key) : undefined;

      if (entry && !force) {
        const cached = entry.data as T;
        setState((s) => (s.data === cached && !s.loading && !s.error ? s : { data: cached, loading: false, error: null }));
        if (isFresh(entry)) return; // recent enough: no network at all
      } else {
        setState((s) => ({ ...s, loading: true, error: null }));
      }

      const id = ++seq.current;
      const fetcher = () => api.get<T>(path, { params: { ...JSON.parse(paramsKey), ...extra } }).then((r) => r.data);
      try {
        const fresh = key && !force ? await dedupe(key, fetcher) : await fetcher();
        // keep the old reference when nothing changed so React skips the re-render
        const prev = key ? getEntry(key)?.data : undefined;
        const next = prev !== undefined && sameJson(prev, fresh) ? (prev as T) : fresh;
        if (key) setEntry(key, next);
        if (id === seq.current) {
          setState((s) => (s.data === next && !s.loading && !s.error ? s : { data: next, loading: false, error: null }));
        }
      } catch (e) {
        if (id !== seq.current) return;
        // a failed background refresh must not wipe good cached data
        setState((s) => (s.data !== null && !force ? { ...s, loading: false } : { ...s, loading: false, error: toApiError(e) }));
      }
    },
    [path, paramsKey, key]
  );

  useEffect(() => {
    run();
  }, [run]);

  // after any write elsewhere in the app, revalidate in place
  useEffect(() => onInvalidate(() => run()), [run]);

  const setData = useCallback(
    (d: T | null) => {
      if (key && d !== null) setEntry(key, d);
      setState((s) => ({ ...s, data: d }));
    },
    [key]
  );

  return { ...state, refetch: run, setData };
}

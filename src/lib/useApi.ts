"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, toApiError } from "@/lib/api";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * GET helper with loading / error state and refetch.
 * Pass `null` as the path to skip fetching (e.g. until the user is known).
 */
export function useApi<T>(path: string | null, params?: Record<string, unknown>) {
  const [state, setState] = useState<State<T>>({ data: null, loading: !!path, error: null });
  const paramsKey = JSON.stringify(params ?? {});
  const seq = useRef(0);

  const run = useCallback(
    async (extra?: Record<string, unknown>) => {
      if (!path) return;
      const id = ++seq.current;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await api.get<T>(path, { params: { ...JSON.parse(paramsKey), ...extra } });
        if (id === seq.current) setState({ data: res.data, loading: false, error: null });
      } catch (e) {
        if (id === seq.current) setState((s) => ({ ...s, loading: false, error: toApiError(e) }));
      }
    },
    [path, paramsKey]
  );

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, refetch: run, setData: (d: T | null) => setState((s) => ({ ...s, data: d })) };
}

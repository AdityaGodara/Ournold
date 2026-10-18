/**
 * Stale-while-revalidate cache for API GETs. Free: lives in memory and in the browser's localStorage.
 *
 * - Data is shown instantly from the cache, then revalidated in the background.
 * - Components re-render only when the fresh data actually differs.
 * - Entries are keyed by user id, so accounts never see each other's data on a shared browser.
 * - Any successful write (POST/PUT/PATCH/DELETE) marks everything stale so it refreshes.
 */

interface Entry {
  data: unknown;
  at: number;
}

const STORE_KEY = "ournold:api-cache:v1";
export const STALE_MS = 60_000; // within this window a cached entry is used without touching the network
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // persisted entries older than a day are dropped
const MAX_ENTRIES = 80;

const mem = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Set<() => void>();
let loaded = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

const hasWindow = () => typeof window !== "undefined";

function load() {
  if (loaded || !hasWindow()) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Entry>;
    const now = Date.now();
    for (const [k, v] of Object.entries(parsed)) {
      if (v && typeof v.at === "number" && now - v.at < MAX_AGE_MS) mem.set(k, v);
    }
  } catch {
    /* storage unavailable or corrupt: just start empty */
  }
}

function schedulePersist() {
  if (!hasWindow()) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      // keep only the most recent entries so we never outgrow localStorage
      const entries = [...mem.entries()].sort((a, b) => b[1].at - a[1].at).slice(0, MAX_ENTRIES);
      window.localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {
      /* quota exceeded or private mode: the in-memory cache still works */
    }
  }, 400);
}

const stable = (o: unknown) => JSON.stringify(o ?? {});

export const cacheKey = (uid: string, path: string, params?: unknown) => `${uid}|${path}|${stable(params)}`;

export function getEntry(key: string): Entry | undefined {
  load();
  return mem.get(key);
}

export const isFresh = (entry: Entry | undefined, now = Date.now()) => !!entry && now - entry.at < STALE_MS;

export function setEntry(key: string, data: unknown) {
  load();
  mem.set(key, { data, at: Date.now() });
  schedulePersist();
}

/** Returns the existing request if the same key is already loading, so identical calls share one round trip. */
export function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = run().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Marks every entry stale (data stays visible) and tells mounted components to revalidate. */
export function invalidateAll() {
  load();
  for (const [k, v] of mem) mem.set(k, { ...v, at: 0 });
  schedulePersist();
  listeners.forEach((fn) => fn());
}

export function onInvalidate(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Wipes everything (used on sign-out). */
export function clearApiCache() {
  mem.clear();
  inflight.clear();
  if (hasWindow()) {
    try {
      window.localStorage.removeItem(STORE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export const sameJson = (a: unknown, b: unknown) => a === b || stable(a) === stable(b);

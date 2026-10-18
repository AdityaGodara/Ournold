import assert from "node:assert/strict";
import { test } from "node:test";
import { cacheKey, clearApiCache, dedupe, getEntry, invalidateAll, isFresh, onInvalidate, sameJson, setEntry } from "../src/lib/apiCache.ts";

test("keys are per-user and per-params", () => {
  assert.notEqual(cacheKey("a", "/x", { t: 1 }), cacheKey("b", "/x", { t: 1 }));
  assert.notEqual(cacheKey("a", "/x", { t: 1 }), cacheKey("a", "/x", { t: 2 }));
});

test("fresh entries are fresh, invalidated ones are stale but keep their data", () => {
  clearApiCache();
  const k = cacheKey("u", "/p");
  setEntry(k, { n: 1 });
  assert.equal(isFresh(getEntry(k)), true);
  invalidateAll();
  assert.equal(isFresh(getEntry(k)), false);
  assert.deepEqual(getEntry(k)?.data, { n: 1 });
});

test("invalidate notifies listeners", () => {
  let hits = 0;
  const off = onInvalidate(() => hits++);
  invalidateAll();
  off();
  invalidateAll();
  assert.equal(hits, 1);
});

test("identical in-flight requests share one call", async () => {
  let calls = 0;
  const slow = () => new Promise<number>((r) => setTimeout(() => r(++calls), 10));
  const [a, b] = await Promise.all([dedupe("k", slow), dedupe("k", slow)]);
  assert.equal(calls, 1);
  assert.equal(a, b);
});

test("sameJson compares by value", () => {
  assert.equal(sameJson({ a: [1] }, { a: [1] }), true);
  assert.equal(sameJson({ a: 1 }, { a: 2 }), false);
});

test("clearApiCache empties everything", () => {
  const k = cacheKey("u", "/q");
  setEntry(k, 1);
  clearApiCache();
  assert.equal(getEntry(k), undefined);
});

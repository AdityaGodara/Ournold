import assert from "node:assert/strict";
import { test } from "node:test";
import { EXERCISES, RepCounter, angleAt } from "../src/lib/reps.ts";

const feed = (c: RepCounter, angles: number[]) => angles.forEach((a) => c.update(a));

test("angleAt measures a right angle and a straight line", () => {
  assert.equal(Math.round(angleAt({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 })), 90);
  assert.equal(Math.round(angleAt({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })), 180);
});

test("a full squat is counted once, only when returning to standing", () => {
  const c = new RepCounter(EXERCISES.squat);
  feed(c, [170, 170, 150, 120, 95, 85, 85, 85, 95, 120, 150, 165, 170, 170, 170]);
  assert.equal(c.state.reps, 1);
});

test("jitter around the thresholds does not double count", () => {
  const c = new RepCounter(EXERCISES.squat);
  feed(c, [170, 120, 90, 92, 88, 91, 89, 130, 165, 163, 168, 161, 166]);
  assert.equal(c.state.reps, 1);
});

test("a shallow squat is not counted and triggers a hint", () => {
  const c = new RepCounter(EXERCISES.squat);
  feed(c, [170, 170, 150, 125, 118, 125, 150, 170, 170]);
  assert.equal(c.state.reps, 0);
  assert.equal(c.state.hint, EXERCISES.squat.hintShallow);
});

test("shoulder press starts from the low position", () => {
  const c = new RepCounter(EXERCISES.press);
  feed(c, [85, 85, 120, 150, 170, 175, 175, 150, 120, 90, 85, 85, 85, 130, 170, 175, 175, 150, 100, 85, 85, 85]);
  assert.equal(c.state.reps, 2);
});

test("reset clears the count", () => {
  const c = new RepCounter(EXERCISES.curl);
  feed(c, [170, 170, 120, 40, 40, 40, 120, 170, 170, 170]);
  assert.equal(c.state.reps, 1);
  c.reset();
  assert.equal(c.state.reps, 0);
});

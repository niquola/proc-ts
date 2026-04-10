import { test, expect } from "bun:test";
import counter_proc_increment from "./counter_proc_increment";

test("increments counter from 0", () => {
  const ctx: any = {};
  expect(counter_proc_increment(ctx)).toBe(1);
  expect(ctx.counter).toBe(1);
});

test("increments existing counter", () => {
  const ctx: any = { counter: 5 };
  expect(counter_proc_increment(ctx)).toBe(6);
  expect(counter_proc_increment(ctx)).toBe(7);
});

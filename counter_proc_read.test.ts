import { test, expect } from "bun:test";
import counter_proc_read from "./counter_proc_read";

test("returns 0 when no counter", () => {
  const ctx = { state: {} } as any;
  expect(counter_proc_read(ctx)).toBe(0);
});

test("returns current counter", () => {
  const ctx = { state: { counter: 42 } } as any;
  expect(counter_proc_read(ctx)).toBe(42);
});

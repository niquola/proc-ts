import { test, expect } from "bun:test";
import test_ctx from "./test_ctx";

test("ctx.env: has process.env values", () => {
  const ctx = test_ctx();
  expect(ctx.env.HOME).toBeDefined();
  expect(ctx.env.PATH).toBeDefined();
  ctx.db.stop(ctx);
});

test("ctx.env: can be overridden in tests", () => {
  const ctx = test_ctx();
  ctx.env.CUSTOM_VAR = "test_value";
  expect(ctx.env.CUSTOM_VAR).toBe("test_value");
  ctx.db.stop(ctx);
});

test("ctx.env: test ctx has isolated env", () => {
  const ctx1 = test_ctx();
  const ctx2 = test_ctx();
  ctx1.env.ISOLATED = "from_ctx1";
  expect(ctx2.env.ISOLATED).toBeUndefined();
  ctx1.db.stop(ctx1);
  ctx2.db.stop(ctx2);
});

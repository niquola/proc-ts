import { test, expect } from "bun:test";
import test_ctx from "./test_ctx";

test("namespaces: ui functions available", () => {
  const ctx = test_ctx();
  expect(typeof ctx.ui.issues).toBe("function");
  expect(typeof ctx.ui.login).toBe("function");
  expect(typeof ctx.ui.logout).toBe("function");
  expect(typeof ctx.ui.layout).toBe("function");
  expect(typeof ctx.ui.escapeHtml).toBe("function");
  ctx.db.stop(ctx);
});

test("namespaces: api functions available", () => {
  const ctx = test_ctx();
  expect(typeof ctx.api.issues).toBe("function");
  expect(typeof ctx.api.issues_$id_comments).toBe("function");
  ctx.db.stop(ctx);
});

test("namespaces: db functions available", () => {
  const ctx = test_ctx();
  expect(typeof ctx.db.query).toBe("function");
  expect(typeof ctx.db.exec).toBe("function");
  expect(typeof ctx.db.start).toBe("function");
  expect(typeof ctx.db.stop).toBe("function");
  expect(typeof ctx.db.migrate).toBe("function");
  ctx.db.stop(ctx);
});

test("namespaces: system functions available", () => {
  const ctx = test_ctx();
  expect(typeof ctx.system.start).toBe("function");
  expect(typeof ctx.system.stop).toBe("function");
  expect(typeof ctx.auth.session_from_cookie).toBe("function");
  ctx.db.stop(ctx);
});

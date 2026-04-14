import { test, expect } from "bun:test";
import test_ctx from "./test_ctx";

test("issues: create and read", () => {
  const ctx = test_ctx();
  const r = ctx.db.exec(ctx, "INSERT INTO issues (title, description) VALUES (?, ?)", ["Bug", "Crashes"]);
  const issues = ctx.db.query(ctx, "SELECT * FROM issues WHERE id = ?", [r.lastInsertRowid]);
  expect(issues[0].title).toBe("Bug");
  expect(issues[0].status).toBe("open");
  ctx.db.stop(ctx);
});

test("issues: update status", () => {
  const ctx = test_ctx();
  const r = ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Feature"]);
  ctx.db.exec(ctx, "UPDATE issues SET status = ? WHERE id = ?", ["in_progress", r.lastInsertRowid]);
  const issues = ctx.db.query(ctx, "SELECT * FROM issues WHERE id = ?", [r.lastInsertRowid]);
  expect(issues[0].status).toBe("in_progress");
  ctx.db.stop(ctx);
});

test("issues: list", () => {
  const ctx = test_ctx();
  ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["First"]);
  ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Second"]);
  const issues = ctx.db.query(ctx, "SELECT * FROM issues ORDER BY id");
  expect(issues.length).toBe(2);
  expect(issues[0].title).toBe("First");
  ctx.db.stop(ctx);
});

test("issues: null title throws NOT NULL", () => {
  const ctx = test_ctx();
  expect(() => ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", [null])).toThrow("NOT NULL");
  ctx.db.stop(ctx);
});

test("issues: update nonexistent — 0 changes", () => {
  const ctx = test_ctx();
  const r = ctx.db.exec(ctx, "UPDATE issues SET status = ? WHERE id = ?", ["done", 999]);
  expect(r.changes).toBe(0);
  ctx.db.stop(ctx);
});

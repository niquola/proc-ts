import { test, expect } from "bun:test";
import test_ctx from "./test_ctx";

test("system_start: creates tables", () => {
  const ctx = test_ctx();
  const result = ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test issue"]);
  expect(result.lastInsertRowid).toBeGreaterThan(0);

  const issues = ctx.db.query(ctx, "SELECT * FROM issues WHERE id = ?", [result.lastInsertRowid]);
  expect(issues[0].title).toBe("Test issue");
  expect(issues[0].status).toBe("open");
  ctx.db.stop(ctx);
});

test("system_start: creates comments table", () => {
  const ctx = test_ctx();
  ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Issue"]);
  ctx.db.exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "Hello"]);

  const comments = ctx.db.query(ctx, "SELECT * FROM comments WHERE issue_id = 1");
  expect(comments[0].body).toBe("Hello");
  ctx.db.stop(ctx);
});

test("system_start: seeds admin user", () => {
  const ctx = test_ctx();
  const users = ctx.db.query(ctx, "SELECT * FROM users WHERE username = 'admin'");
  expect(users.length).toBe(1);
  ctx.db.stop(ctx);
});

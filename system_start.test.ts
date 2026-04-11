import { test, expect } from "bun:test";
import db_start from "./db_start";
import db_stop from "./db_stop";
import db_query from "./db_query";
import db_exec from "./db_exec";
import db_migrate from "./db_migrate";
import server_start from "./server_start";
import system_start from "./system_start";

type Issue = { id: number; title: string; status: string };

function makeCtx() {
  const ctx = { db: null, fns: { db_start, db_stop, db_query, db_exec, db_migrate, server_start } } as any;
  system_start(ctx, { env: "test" });
  return ctx;
}

test("system_start: создает таблицы", () => {
  const ctx = makeCtx();

  const result = db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test issue"]);
  expect(result.lastInsertRowid).toBeGreaterThan(0);

  const issues = db_query<Issue>(ctx, "SELECT * FROM issues WHERE id = ?", [result.lastInsertRowid]);
  expect(issues.length).toBe(1);
  expect(issues[0].title).toBe("Test issue");
  expect(issues[0].status).toBe("open");

  db_stop(ctx);
});

test("system_start: создает таблицу comments", () => {
  const ctx = makeCtx();

  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Issue"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "Hello"]);

  const comments = db_query<{ id: number; body: string }>(ctx, "SELECT * FROM comments WHERE issue_id = 1");
  expect(comments.length).toBe(1);
  expect(comments[0].body).toBe("Hello");

  db_stop(ctx);
});

test("system_start: seeds admin user", () => {
  const ctx = makeCtx();

  const users = db_query<{ id: number; username: string }>(ctx, "SELECT * FROM users WHERE username = 'admin'");
  expect(users.length).toBe(1);
  expect(users[0].username).toBe("admin");

  db_stop(ctx);
});

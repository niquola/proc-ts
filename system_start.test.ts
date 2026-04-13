import { test, expect } from "bun:test";
import db_start from "./db/start";
import db_stop from "./db/stop";
import db_query from "./db/query";
import db_exec from "./db/exec";
import db_migrate from "./db/migrate";
import server_start from "./server/start";
import system_start from "./system/start";

function makeCtx() {
  const ctx = { state: {}, routes: {},
    db: { start: db_start, stop: db_stop, query: db_query, exec: db_exec, migrate: db_migrate },
    server: { start: server_start },
  } as any;
  system_start(ctx, { env: "test" });
  return ctx;
}

test("system_start: creates tables", () => {
  const ctx = makeCtx();
  const result = db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test issue"]);
  expect(result.lastInsertRowid).toBeGreaterThan(0);

  const issues = db_query<{ id: number; title: string; status: string }>(ctx, "SELECT * FROM issues WHERE id = ?", [result.lastInsertRowid]);
  expect(issues.length).toBe(1);
  expect(issues[0].title).toBe("Test issue");
  expect(issues[0].status).toBe("open");
  db_stop(ctx);
});

test("system_start: creates comments table", () => {
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

import { test, expect } from "bun:test";
import db_start from "./db/start";
import db_stop from "./db/stop";
import db_query from "./db/query";
import db_exec from "./db/exec";
import db_migrate from "./db/migrate";
import server_start from "./server/start";
import system_start from "./system/start";

type Issue = { id: number; title: string; description: string; status: string; created_at: string };

function makeCtx() {
  const ctx = { state: {}, routes: {},
    db: { start: db_start, stop: db_stop, query: db_query, exec: db_exec, migrate: db_migrate },
    server: { start: server_start },
  } as any;
  system_start(ctx, { env: "test" });
  return ctx;
}

test("issues: create and read", () => {
  const ctx = makeCtx();
  const result = db_exec(ctx, "INSERT INTO issues (title, description) VALUES (?, ?)", ["Bug", "Everything crashes"]);
  expect(result.lastInsertRowid).toBeGreaterThan(0);

  const issues = db_query<Issue>(ctx, "SELECT * FROM issues WHERE id = ?", [result.lastInsertRowid]);
  expect(issues.length).toBe(1);
  expect(issues[0].title).toBe("Bug");
  expect(issues[0].status).toBe("open");
  db_stop(ctx);
});

test("issues: update status", () => {
  const ctx = makeCtx();
  const r = db_exec(ctx, "INSERT INTO issues (title, description) VALUES (?, ?)", ["Feature", "New endpoint"]);
  db_exec(ctx, "UPDATE issues SET status = ? WHERE id = ?", ["in_progress", r.lastInsertRowid]);

  const issues = db_query<Issue>(ctx, "SELECT * FROM issues WHERE id = ?", [r.lastInsertRowid]);
  expect(issues[0].status).toBe("in_progress");
  db_stop(ctx);
});

test("issues: list", () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["First"]);
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Second"]);

  const issues = db_query<Issue>(ctx, "SELECT * FROM issues ORDER BY id");
  expect(issues.length).toBe(2);
  expect(issues[0].title).toBe("First");
  db_stop(ctx);
});

test("issues: null title throws NOT NULL", () => {
  const ctx = makeCtx();
  try {
    db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", [null]);
    expect(true).toBe(false);
  } catch (e: any) {
    expect(e.message).toContain("NOT NULL");
  }
  db_stop(ctx);
});

test("issues: update nonexistent — 0 changes", () => {
  const ctx = makeCtx();
  const r = db_exec(ctx, "UPDATE issues SET status = ? WHERE id = ?", ["done", 999]);
  expect(r.changes).toBe(0);
  db_stop(ctx);
});

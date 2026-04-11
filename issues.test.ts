import { test, expect } from "bun:test";
import db_start from "./db_start";
import db_stop from "./db_stop";
import db_query from "./db_query";
import db_exec from "./db_exec";
import db_migrate from "./db_migrate";
import server_start from "./server_start";
import system_start from "./system_start";

type Issue = { id: number; title: string; description: string; status: string; created_at: string };

function makeCtx() {
  const ctx = { db: null, fns: { db_start, db_stop, db_query, db_exec, db_migrate, server_start } } as any;
  system_start(ctx, { env: "test" });
  return ctx;
}

test("issues: создание и чтение", () => {
  const ctx = makeCtx();
  const result = db_exec(ctx, "INSERT INTO issues (title, description) VALUES (?, ?)", ["Баг в API", "Все падает при запросе"]);

  expect(result.lastInsertRowid).toBeGreaterThan(0);

  const issues = db_query<Issue>(ctx, "SELECT * FROM issues WHERE id = ?", [result.lastInsertRowid]);
  expect(issues.length).toBe(1);
  expect(issues[0].title).toBe("Баг в API");
  expect(issues[0].status).toBe("open");
  db_stop(ctx);
});

test("issues: обновление статуса", () => {
  const ctx = makeCtx();
  const r = db_exec(ctx, "INSERT INTO issues (title, description) VALUES (?, ?)", ["Фича", "Нужен новый эндпоинт"]);

  db_exec(ctx, "UPDATE issues SET status = ? WHERE id = ?", ["in_progress", r.lastInsertRowid]);

  const issues = db_query<Issue>(ctx, "SELECT * FROM issues WHERE id = ?", [r.lastInsertRowid]);
  expect(issues.length).toBe(1);
  expect(issues[0].status).toBe("in_progress");
  db_stop(ctx);
});

test("issues: получение списка", () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["First"]);
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Second"]);

  const issues = db_query<Issue>(ctx, "SELECT * FROM issues ORDER BY id");
  expect(issues.length).toBe(2);
  expect(issues[0].title).toBe("First");
  db_stop(ctx);
});

test("issues: INSERT с null title — ошибка NOT NULL", () => {
  const ctx = makeCtx();
  try {
    db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", [null]);
    expect(true).toBe(false);
  } catch (e: any) {
    expect(e.message).toContain("NOT NULL");
  }
  db_stop(ctx);
});

test("issues: UPDATE несуществующего — 0 changes", () => {
  const ctx = makeCtx();
  const r = db_exec(ctx, "UPDATE issues SET status = ? WHERE id = ?", ["done", 999]);
  expect(r.changes).toBe(0);
  db_stop(ctx);
});

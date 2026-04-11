import { test, expect } from "bun:test";
import db_start from "./db_start";
import db_stop from "./db_stop";
import db_query from "./db_query";
import db_exec from "./db_exec";
import db_migrate from "./db_migrate";
import server_start from "./server_start";
import system_start from "./system_start";

type Comment = { id: number; issue_id: number; body: string; created_at: string };

function makeCtx() {
  const ctx = { db: null, fns: { db_start, db_stop, db_query, db_exec, db_migrate, server_start } } as any;
  system_start(ctx, { env: "test" });
  return ctx;
}

test("comments: создание комментария", async () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test issue"]);

  const mod = await import("./api_issues_$id_comments.ts");
  const formData = new FormData();
  formData.set("body", "Первый комментарий");

  const response = await mod.default(ctx, { user: null, token: null }, {
    method: "POST", formData: () => Promise.resolve(formData),
    params: { id: "1" }
  } as any) as Response;

  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("/ui/issues/1");

  const comments = db_query<Comment>(ctx, "SELECT * FROM comments WHERE issue_id = 1");
  expect(comments.length).toBe(1);
  expect(comments[0].body).toBe("Первый комментарий");
  db_stop(ctx);
});

test("comments: пустой комментарий не создаётся", async () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test issue"]);

  const mod = await import("./api_issues_$id_comments.ts");
  const formData = new FormData();
  formData.set("body", "   ");

  await mod.default(ctx, { user: null, token: null }, {
    method: "POST", formData: () => Promise.resolve(formData),
    params: { id: "1" }
  } as any);

  const comments = db_query<Comment>(ctx, "SELECT * FROM comments WHERE issue_id = 1");
  expect(comments.length).toBe(0);
  db_stop(ctx);
});

test("comments: несколько комментариев к одному issue", () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test issue"]);

  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "Первый"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "Второй"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "Третий"]);

  const comments = db_query<Comment>(ctx, "SELECT * FROM comments WHERE issue_id = 1 ORDER BY id");
  expect(comments.length).toBe(3);
  expect(comments[0].body).toBe("Первый");
  expect(comments[2].body).toBe("Третий");
  db_stop(ctx);
});

test("comments: комменты не смешиваются между issues", () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Issue 1"]);
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Issue 2"]);

  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "Comment on 1"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [2, "Comment on 2"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "Another on 1"]);

  const c1 = db_query<Comment>(ctx, "SELECT * FROM comments WHERE issue_id = 1");
  const c2 = db_query<Comment>(ctx, "SELECT * FROM comments WHERE issue_id = 2");
  expect(c1.length).toBe(2);
  expect(c2.length).toBe(1);
  db_stop(ctx);
});

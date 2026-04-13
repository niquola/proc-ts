import { test, expect } from "bun:test";
import db_start from "./db/start";
import db_stop from "./db/stop";
import db_query from "./db/query";
import db_exec from "./db/exec";
import db_migrate from "./db/migrate";
import server_start from "./server/start";
import system_start from "./system/start";

type Comment = { id: number; issue_id: number; body: string; created_at: string };

function makeCtx() {
  const ctx = { state: {}, routes: {},
    db: { start: db_start, stop: db_stop, query: db_query, exec: db_exec, migrate: db_migrate },
    server: { start: server_start },
  } as any;
  system_start(ctx, { env: "test" });
  return ctx;
}

test("comments: create via handler", async () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test"]);

  const mod = await import("./api/issues_$id_comments.ts");
  const formData = new FormData();
  formData.set("body", "First comment");

  const response = await mod.default(ctx, { user: null, token: null }, {
    method: "POST", formData: () => Promise.resolve(formData),
    params: { id: "1" }
  } as any) as Response;

  expect(response.status).toBe(302);
  const comments = db_query<Comment>(ctx, "SELECT * FROM comments WHERE issue_id = 1");
  expect(comments.length).toBe(1);
  expect(comments[0].body).toBe("First comment");
  db_stop(ctx);
});

test("comments: empty body not created", async () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test"]);

  const mod = await import("./api/issues_$id_comments.ts");
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

test("comments: multiple on one issue", () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "A"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "B"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "C"]);

  const comments = db_query<Comment>(ctx, "SELECT * FROM comments WHERE issue_id = 1 ORDER BY id");
  expect(comments.length).toBe(3);
  expect(comments[0].body).toBe("A");
  expect(comments[2].body).toBe("C");
  db_stop(ctx);
});

test("comments: isolated between issues", () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Issue 1"]);
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Issue 2"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "On 1"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [2, "On 2"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "Also on 1"]);

  expect(db_query<Comment>(ctx, "SELECT * FROM comments WHERE issue_id = 1").length).toBe(2);
  expect(db_query<Comment>(ctx, "SELECT * FROM comments WHERE issue_id = 2").length).toBe(1);
  db_stop(ctx);
});

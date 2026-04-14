import { test, expect } from "bun:test";
import test_ctx from "./test_ctx";

test("comments: create via handler", async () => {
  const ctx = test_ctx();
  ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test"]);

  const formData = new FormData();
  formData.set("body", "First comment");

  const response = await ctx.api.issues_$id_comments(ctx, { user: null, token: null }, {
    method: "POST", formData: () => Promise.resolve(formData), params: { id: "1" }
  } as any) as Response;

  expect(response.status).toBe(302);
  const comments = ctx.db.query(ctx, "SELECT * FROM comments WHERE issue_id = 1");
  expect(comments[0].body).toBe("First comment");
  ctx.db.stop(ctx);
});

test("comments: empty body not created", async () => {
  const ctx = test_ctx();
  ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test"]);

  const formData = new FormData();
  formData.set("body", "   ");

  await ctx.api.issues_$id_comments(ctx, { user: null, token: null }, {
    method: "POST", formData: () => Promise.resolve(formData), params: { id: "1" }
  } as any);

  expect(ctx.db.query(ctx, "SELECT * FROM comments WHERE issue_id = 1").length).toBe(0);
  ctx.db.stop(ctx);
});

test("comments: multiple on one issue", () => {
  const ctx = test_ctx();
  ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test"]);
  ctx.db.exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "A"]);
  ctx.db.exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "B"]);
  ctx.db.exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "C"]);

  const comments = ctx.db.query(ctx, "SELECT * FROM comments WHERE issue_id = 1 ORDER BY id");
  expect(comments.length).toBe(3);
  expect(comments[0].body).toBe("A");
  expect(comments[2].body).toBe("C");
  ctx.db.stop(ctx);
});

test("comments: isolated between issues", () => {
  const ctx = test_ctx();
  ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Issue 1"]);
  ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Issue 2"]);
  ctx.db.exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "On 1"]);
  ctx.db.exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [2, "On 2"]);

  expect(ctx.db.query(ctx, "SELECT * FROM comments WHERE issue_id = 1").length).toBe(1);
  expect(ctx.db.query(ctx, "SELECT * FROM comments WHERE issue_id = 2").length).toBe(1);
  ctx.db.stop(ctx);
});

import { test, expect } from "bun:test";
import test_ctx from "./test_ctx";

function makeReq(method: string, url: string, params: Record<string, string> = {}) {
  const req = new Request(url, { method }) as any;
  req.params = params;
  return req;
}

const session: Session = { user: { id: 1, username: "admin" }, token: "test" };

test("ui/issues: GET returns HTML", async () => {
  const ctx = test_ctx();
  ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test issue"]);

  const response = await ctx.ui.issues(ctx, session, makeReq("GET", "http://localhost/ui/issues")) as Response;
  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).toContain("Test issue");
  expect(body).toContain("Issues</h1>");
  ctx.db.stop(ctx);
});

test("ui/issues_$id: GET returns HTML with comments", async () => {
  const ctx = test_ctx();
  ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Detail"]);
  ctx.db.exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "Comment 1"]);
  ctx.db.exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "Comment 2"]);

  const response = await ctx.ui.issues_$id(ctx, session, makeReq("GET", "http://localhost/ui/issues/1", { id: "1" })) as Response;
  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).toContain("Detail");
  expect(body).toContain("Comment 1");
  expect(body).toContain("Comments (2)");
  ctx.db.stop(ctx);
});

test("ui/issues_$id_edit: GET returns HTML", async () => {
  const ctx = test_ctx();
  ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Edit me"]);

  const response = await ctx.ui.issues_$id_edit(ctx, session, makeReq("GET", "http://localhost/ui/issues/1/edit", { id: "1" })) as Response;
  expect(response.status).toBe(200);
  expect(await response.text()).toContain("Edit me");
  ctx.db.stop(ctx);
});

test("ui/issues_$id: 404 for nonexistent", async () => {
  const ctx = test_ctx();
  const response = await ctx.ui.issues_$id(ctx, session, makeReq("GET", "http://localhost/ui/issues/999", { id: "999" })) as Response;
  expect(response.status).toBe(404);
  ctx.db.stop(ctx);
});

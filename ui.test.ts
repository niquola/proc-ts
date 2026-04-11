import { test, expect } from "bun:test";
import db_start from "./db_start";
import db_stop from "./db_stop";
import db_query from "./db_query";
import db_exec from "./db_exec";
import db_migrate from "./db_migrate";
import escapeHtml from "./escapeHtml";
import layout from "./layout";
import server_start from "./server_start";
import system_start from "./system_start";

function makeCtx() {
  const ctx: any = { db: null, fns: { db_start, db_stop, db_query, db_exec, db_migrate, escapeHtml, layout, server_start } };
  system_start(ctx, { env: "test" });
  return ctx;
}

function makeReq(method: string, url: string, params: Record<string, string> = {}) {
  const req = new Request(url, { method }) as any;
  req.params = params;
  return req;
}

const session: Session = { user: { id: 1, username: "admin" }, token: "test" };

test("ui_issues: GET /ui/issues returns HTML with issues", async () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test issue"]);

  const mod = await import("./http_ui_issues.ts");
  const response = await mod.default(ctx, session, makeReq("GET", "http://localhost/ui/issues")) as Response;

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/html");
  const body = await response.text();
  expect(body).toContain("Test issue");
  expect(body).toContain("Issues</h1>");
  db_stop(ctx);
});

test("ui_issues_$id: GET /ui/issues/:id returns HTML with comments", async () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Detail issue"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "First comment"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "Second comment"]);

  const mod = await import("./http_ui_issues_$id.ts");
  const response = await mod.default(ctx, session, makeReq("GET", "http://localhost/ui/issues/1", { id: "1" })) as Response;

  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).toContain("Detail issue");
  expect(body).toContain("First comment");
  expect(body).toContain("Second comment");
  expect(body).toContain("Comments (2)");
  db_stop(ctx);
});

test("ui_issues_$id_edit: GET /ui/issues/:id/edit returns HTML", async () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Edit issue"]);

  const mod = await import("./http_ui_issues_$id_edit.ts");
  const response = await mod.default(ctx, session, makeReq("GET", "http://localhost/ui/issues/1/edit", { id: "1" })) as Response;

  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).toContain("Edit issue");
  db_stop(ctx);
});

test("ui_issues_$id: returns 404 for non-existent issue", async () => {
  const ctx = makeCtx();

  const mod = await import("./http_ui_issues_$id.ts");
  const response = await mod.default(ctx, session, makeReq("GET", "http://localhost/ui/issues/999", { id: "999" })) as Response;

  expect(response.status).toBe(404);
  db_stop(ctx);
});

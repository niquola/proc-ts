import { test, expect } from "bun:test";
import db_start from "./db/start";
import db_stop from "./db/stop";
import db_query from "./db/query";
import db_exec from "./db/exec";
import db_migrate from "./db/migrate";
import escapeHtml from "./ui/escapeHtml";
import layout from "./ui/layout";
import server_start from "./server/start";
import system_start from "./system/start";

function makeCtx() {
  const ctx: any = { state: {}, routes: {},
    db: { start: db_start, stop: db_stop, query: db_query, exec: db_exec, migrate: db_migrate },
    server: { start: server_start },
    ui: { layout, escapeHtml },
  };
  system_start(ctx, { env: "test" });
  return ctx;
}

function makeReq(method: string, url: string, params: Record<string, string> = {}) {
  const req = new Request(url, { method }) as any;
  req.params = params;
  return req;
}

const session: Session = { user: { id: 1, username: "admin" }, token: "test" };

test("ui/issues: GET returns HTML", async () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Test issue"]);

  const mod = await import("./ui/issues.ts");
  const response = await mod.default(ctx, session, makeReq("GET", "http://localhost/ui/issues")) as Response;

  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).toContain("Test issue");
  expect(body).toContain("Issues</h1>");
  db_stop(ctx);
});

test("ui/issues_$id: GET returns HTML with comments", async () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Detail"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "Comment 1"]);
  db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [1, "Comment 2"]);

  const mod = await import("./ui/issues_$id.ts");
  const response = await mod.default(ctx, session, makeReq("GET", "http://localhost/ui/issues/1", { id: "1" })) as Response;

  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).toContain("Detail");
  expect(body).toContain("Comment 1");
  expect(body).toContain("Comments (2)");
  db_stop(ctx);
});

test("ui/issues_$id_edit: GET returns HTML", async () => {
  const ctx = makeCtx();
  db_exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Edit me"]);

  const mod = await import("./ui/issues_$id_edit.ts");
  const response = await mod.default(ctx, session, makeReq("GET", "http://localhost/ui/issues/1/edit", { id: "1" })) as Response;

  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).toContain("Edit me");
  db_stop(ctx);
});

test("ui/issues_$id: 404 for nonexistent", async () => {
  const ctx = makeCtx();

  const mod = await import("./ui/issues_$id.ts");
  const response = await mod.default(ctx, session, makeReq("GET", "http://localhost/ui/issues/999", { id: "999" })) as Response;

  expect(response.status).toBe(404);
  db_stop(ctx);
});

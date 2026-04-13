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
import session_from_cookie from "./auth/session_from_cookie";
import login from "./ui/login";
import logout from "./ui/logout";

function makeCtx() {
  const ctx = { state: {}, routes: {},
    db: { start: db_start, stop: db_stop, query: db_query, exec: db_exec, migrate: db_migrate },
    server: { start: server_start },
    ui: { layout, escapeHtml },
    auth: { session_from_cookie },
  } as any;
  system_start(ctx, { env: "test" });
  return ctx;
}

function makeReq(method: string, url: string) {
  const req = new Request(url, { method }) as any;
  req.params = {};
  return req;
}

const noSession: Session = { user: null, token: null };

test("login: GET shows form", async () => {
  const ctx = makeCtx();
  const response = await login(ctx, noSession, makeReq("GET", "http://localhost/ui/login")) as Response;

  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).toContain("Login</h1>");
  expect(body).toContain('name="username"');
  db_stop(ctx);
});

test("login: redirects if already logged in", async () => {
  const ctx = makeCtx();
  const session: Session = { user: { id: 1, username: "test" }, token: "abc" };
  const response = await login(ctx, session, makeReq("GET", "http://localhost/ui/login")) as Response;

  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("/ui/issues");
  db_stop(ctx);
});

test("register + login: creates user and sets cookie", async () => {
  const ctx = makeCtx();
  const form = new FormData();
  form.set("username", "alice");
  form.set("password", "secret123");
  form.set("action", "register");

  const req = new Request("http://localhost/ui/login", { method: "POST", body: form }) as any;
  req.params = {};
  const response = await login(ctx, noSession, req) as Response;

  expect(response.status).toBe(302);
  expect(response.headers.get("set-cookie")).toContain("session=");

  const users = db_query<{ id: number }>(ctx, "SELECT * FROM users WHERE username = ?", ["alice"]);
  expect(users.length).toBe(1);
  db_stop(ctx);
});

test("login: wrong password", async () => {
  const ctx = makeCtx();
  const hash = await Bun.password.hash("correct");
  db_exec(ctx, "INSERT INTO users (username, password_hash) VALUES (?, ?)", ["bob", hash]);

  const form = new FormData();
  form.set("username", "bob");
  form.set("password", "wrong");
  form.set("action", "login");

  const req = new Request("http://localhost/ui/login", { method: "POST", body: form }) as any;
  req.params = {};
  const response = await login(ctx, noSession, req) as Response;

  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).toContain("Invalid credentials");
  db_stop(ctx);
});

test("session_from_cookie: resolves user", async () => {
  const ctx = makeCtx();
  const hash = await Bun.password.hash("pass");
  const r = db_exec(ctx, "INSERT INTO users (username, password_hash) VALUES (?, ?)", ["carol", hash]);
  db_exec(ctx, "INSERT INTO sessions (token, user_id) VALUES (?, ?)", ["tok123", r.lastInsertRowid]);

  const req = new Request("http://localhost/", { headers: { cookie: "session=tok123" } });
  const session = session_from_cookie(ctx, req);

  expect(session.user!.username).toBe("carol");
  expect(session.token).toBe("tok123");
  db_stop(ctx);
});

test("session_from_cookie: null for invalid token", () => {
  const ctx = makeCtx();
  const req = new Request("http://localhost/", { headers: { cookie: "session=invalid" } });
  expect(session_from_cookie(ctx, req).user).toBeNull();
  db_stop(ctx);
});

test("logout: clears session", async () => {
  const ctx = makeCtx();
  const hash = await Bun.password.hash("pass");
  const r = db_exec(ctx, "INSERT INTO users (username, password_hash) VALUES (?, ?)", ["dave", hash]);
  db_exec(ctx, "INSERT INTO sessions (token, user_id) VALUES (?, ?)", ["tok456", r.lastInsertRowid]);

  const session: Session = { user: { id: Number(r.lastInsertRowid), username: "dave" }, token: "tok456" };
  const response = logout(ctx, session, makeReq("GET", "http://localhost/ui/logout")) as Response;

  expect(response.status).toBe(302);
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  expect(db_query(ctx, "SELECT * FROM sessions WHERE token = ?", ["tok456"]).length).toBe(0);
  db_stop(ctx);
});

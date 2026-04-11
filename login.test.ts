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
import session_from_cookie from "./session_from_cookie";
import http_ui_login from "./http_ui_login";
import http_ui_logout from "./http_ui_logout";

function makeCtx() {
  const ctx = { db: null, fns: { db_start, db_stop, db_query, db_exec, db_migrate, escapeHtml, layout, server_start, session_from_cookie } } as any;
  system_start(ctx, { env: "test" });
  return ctx;
}

function makeReq(method: string, url: string, opts: any = {}) {
  const req = new Request(url, { method, ...opts }) as any;
  req.params = {};
  return req;
}

const noSession: Session = { user: null, token: null };

test("login page: GET shows form", async () => {
  const ctx = makeCtx();

  const response = await http_ui_login(ctx, noSession, makeReq("GET", "http://localhost/ui/login")) as Response;

  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).toContain("Login</h1>");
  expect(body).toContain('name="username"');
  expect(body).toContain('name="password"');
  db_stop(ctx);
});

test("login page: redirects if already logged in", async () => {
  const ctx = makeCtx();
  const session: Session = { user: { id: 1, username: "test" }, token: "abc" };

  const response = await http_ui_login(ctx, session, makeReq("GET", "http://localhost/ui/login")) as Response;

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

  const response = await http_ui_login(ctx, noSession, req) as Response;

  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("/ui/issues");
  const cookie = response.headers.get("set-cookie")!;
  expect(cookie).toContain("session=");

  const users = db_query<{ id: number; username: string }>(ctx, "SELECT * FROM users WHERE username = ?", ["alice"]);
  expect(users.length).toBe(1);

  const sessions = db_query<{ token: string }>(ctx, "SELECT * FROM sessions WHERE user_id = ?", [users[0].id]);
  expect(sessions.length).toBe(1);

  db_stop(ctx);
});

test("login: wrong password returns error", async () => {
  const ctx = makeCtx();

  const hash = await Bun.password.hash("correct");
  db_exec(ctx, "INSERT INTO users (username, password_hash) VALUES (?, ?)", ["bob", hash]);

  const form = new FormData();
  form.set("username", "bob");
  form.set("password", "wrong");
  form.set("action", "login");

  const req = new Request("http://localhost/ui/login", { method: "POST", body: form }) as any;
  req.params = {};

  const response = await http_ui_login(ctx, noSession, req) as Response;

  expect(response.status).toBe(200);
  const body = await response.text();
  expect(body).toContain("Invalid credentials");
  db_stop(ctx);
});

test("session_from_cookie: resolves user from token", async () => {
  const ctx = makeCtx();

  const hash = await Bun.password.hash("pass");
  const r = db_exec(ctx, "INSERT INTO users (username, password_hash) VALUES (?, ?)", ["carol", hash]);
  db_exec(ctx, "INSERT INTO sessions (token, user_id) VALUES (?, ?)", ["tok123", r.lastInsertRowid]);

  const req = new Request("http://localhost/", { headers: { cookie: "session=tok123" } });
  const session = session_from_cookie(ctx, req);

  expect(session.user).not.toBeNull();
  expect(session.user!.username).toBe("carol");
  expect(session.token).toBe("tok123");
  db_stop(ctx);
});

test("session_from_cookie: returns null for invalid token", () => {
  const ctx = makeCtx();

  const req = new Request("http://localhost/", { headers: { cookie: "session=invalid" } });
  const session = session_from_cookie(ctx, req);

  expect(session.user).toBeNull();
  db_stop(ctx);
});

test("logout: clears session", async () => {
  const ctx = makeCtx();

  const hash = await Bun.password.hash("pass");
  const r = db_exec(ctx, "INSERT INTO users (username, password_hash) VALUES (?, ?)", ["dave", hash]);
  db_exec(ctx, "INSERT INTO sessions (token, user_id) VALUES (?, ?)", ["tok456", r.lastInsertRowid]);

  const session: Session = { user: { id: Number(r.lastInsertRowid), username: "dave" }, token: "tok456" };
  const req = new Request("http://localhost/ui/logout") as any;
  req.params = {};

  const response = http_ui_logout(ctx, session, req) as Response;

  expect(response.status).toBe(302);
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");

  const sessions = db_query(ctx, "SELECT * FROM sessions WHERE token = ?", ["tok456"]);
  expect(sessions.length).toBe(0);
  db_stop(ctx);
});

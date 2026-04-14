import { test, expect } from "bun:test";
import test_ctx from "./test_ctx";

function makeReq(method: string, url: string) {
  const req = new Request(url, { method }) as any;
  req.params = {};
  return req;
}

const noSession: Session = { user: null, token: null };

test("login: GET shows form", async () => {
  const ctx = test_ctx();
  const response = await ctx.ui.login(ctx, noSession, makeReq("GET", "http://localhost/ui/login")) as Response;
  expect(response.status).toBe(200);
  expect(await response.text()).toContain("Login</h1>");
  ctx.db.stop(ctx);
});

test("login: redirects if already logged in", async () => {
  const ctx = test_ctx();
  const session: Session = { user: { id: 1, username: "test" }, token: "abc" };
  const response = await ctx.ui.login(ctx, session, makeReq("GET", "http://localhost/ui/login")) as Response;
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("/ui/issues");
  ctx.db.stop(ctx);
});

test("register + login: creates user and sets cookie", async () => {
  const ctx = test_ctx();
  const form = new FormData();
  form.set("username", "alice");
  form.set("password", "secret123");
  form.set("action", "register");

  const req = new Request("http://localhost/ui/login", { method: "POST", body: form }) as any;
  req.params = {};
  const response = await ctx.ui.login(ctx, noSession, req) as Response;
  expect(response.status).toBe(302);
  expect(response.headers.get("set-cookie")).toContain("session=");
  expect(ctx.db.query(ctx, "SELECT * FROM users WHERE username = ?", ["alice"]).length).toBe(1);
  ctx.db.stop(ctx);
});

test("login: wrong password", async () => {
  const ctx = test_ctx();
  const hash = await Bun.password.hash("correct");
  ctx.db.exec(ctx, "INSERT INTO users (username, password_hash) VALUES (?, ?)", ["bob", hash]);

  const form = new FormData();
  form.set("username", "bob");
  form.set("password", "wrong");
  form.set("action", "login");

  const req = new Request("http://localhost/ui/login", { method: "POST", body: form }) as any;
  req.params = {};
  const response = await ctx.ui.login(ctx, noSession, req) as Response;
  expect(response.status).toBe(200);
  expect(await response.text()).toContain("Invalid credentials");
  ctx.db.stop(ctx);
});

test("session_from_cookie: resolves user", async () => {
  const ctx = test_ctx();
  const hash = await Bun.password.hash("pass");
  const r = ctx.db.exec(ctx, "INSERT INTO users (username, password_hash) VALUES (?, ?)", ["carol", hash]);
  ctx.db.exec(ctx, "INSERT INTO sessions (token, user_id) VALUES (?, ?)", ["tok123", r.lastInsertRowid]);

  const req = new Request("http://localhost/", { headers: { cookie: "session=tok123" } });
  const session = ctx.auth.session_from_cookie(ctx, req);
  expect(session.user!.username).toBe("carol");
  ctx.db.stop(ctx);
});

test("session_from_cookie: null for invalid token", () => {
  const ctx = test_ctx();
  const req = new Request("http://localhost/", { headers: { cookie: "session=invalid" } });
  expect(ctx.auth.session_from_cookie(ctx, req).user).toBeNull();
  ctx.db.stop(ctx);
});

test("logout: clears session", async () => {
  const ctx = test_ctx();
  const hash = await Bun.password.hash("pass");
  const r = ctx.db.exec(ctx, "INSERT INTO users (username, password_hash) VALUES (?, ?)", ["dave", hash]);
  ctx.db.exec(ctx, "INSERT INTO sessions (token, user_id) VALUES (?, ?)", ["tok456", r.lastInsertRowid]);

  const session: Session = { user: { id: Number(r.lastInsertRowid), username: "dave" }, token: "tok456" };
  const response = ctx.ui.logout(ctx, session, makeReq("GET", "http://localhost/ui/logout")) as Response;
  expect(response.status).toBe(302);
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  expect(ctx.db.query(ctx, "SELECT * FROM sessions WHERE token = ?", ["tok456"]).length).toBe(0);
  ctx.db.stop(ctx);
});

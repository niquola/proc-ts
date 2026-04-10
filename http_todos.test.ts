import { test, expect, beforeEach, afterEach } from "bun:test";
import db_start from "./db_start";
import db_stop from "./db_stop";
import db_query from "./db_query";
import http_todos from "./http_todos";
import http_todos_$id from "./http_todos_$id";

let ctx: any;

beforeEach(() => {
  ctx = { fns: { db_query } };
  db_start(ctx, ":memory:");
  db_query(ctx, "CREATE TABLE todos (id INTEGER PRIMARY KEY, title TEXT, done INTEGER DEFAULT 0)");
});

afterEach(() => {
  db_stop(ctx);
});

test("GET /todos returns empty list", async () => {
  const res = await http_todos(ctx, {}, { req: { method: "GET" } });
  expect(await res.json()).toEqual([]);
});

test("POST /todos creates a todo", async () => {
  const req = { method: "POST", json: async () => ({ title: "buy milk" }) };
  const res = await http_todos(ctx, {}, { req });
  const body = await res.json();
  expect(res.status).toBe(201);
  expect(body).toEqual({ id: 1, title: "buy milk", done: 0 });
});

test("GET /todos/:id returns a todo", async () => {
  db_query(ctx, "INSERT INTO todos (title) VALUES (?)", ["test"]);
  const res = await http_todos_$id(ctx, {}, { req: { method: "GET" }, params: { id: "1" } });
  expect(await res.json()).toEqual({ id: 1, title: "test", done: 0 });
});

test("PATCH /todos/:id marks done", async () => {
  db_query(ctx, "INSERT INTO todos (title) VALUES (?)", ["test"]);
  const req = { method: "PATCH", json: async () => ({ done: true }) };
  const res = await http_todos_$id(ctx, {}, { req, params: { id: "1" } });
  expect(await res.json()).toEqual({ id: 1, title: "test", done: 1 });
});

test("DELETE /todos/:id removes todo", async () => {
  db_query(ctx, "INSERT INTO todos (title) VALUES (?)", ["test"]);
  const res = await http_todos_$id(ctx, {}, { req: { method: "DELETE" }, params: { id: "1" } });
  expect(await res.json()).toEqual({ ok: true });
  const rows = db_query(ctx, "SELECT * FROM todos");
  expect(rows).toEqual([]);
});

test("GET /todos/:id returns 404 for missing", async () => {
  const res = await http_todos_$id(ctx, {}, { req: { method: "GET" }, params: { id: "999" } });
  expect(res.status).toBe(404);
});

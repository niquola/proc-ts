import { test, expect, beforeEach, afterEach } from "bun:test";
import db_start from "./db_start";
import db_stop from "./db_stop";
import db_query from "./db_query";
import db_exec from "./db_exec";

let ctx: any;

beforeEach(() => {
  ctx = {};
  db_start(ctx, ":memory:");
});

afterEach(() => {
  db_stop(ctx);
});

test("start opens database", () => {
  expect(ctx.db).toBeDefined();
});

test("create table and insert", () => {
  db_exec(ctx, "CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)");
  const res = db_exec(ctx, "INSERT INTO items (name) VALUES (?)", ["test"]);
  expect(res.changes).toBe(1);
  expect(res.lastInsertRowid).toBe(1);
});

test("select returns typed rows", () => {
  db_exec(ctx, "CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)");
  db_exec(ctx, "INSERT INTO items (name) VALUES (?)", ["alice"]);
  db_exec(ctx, "INSERT INTO items (name) VALUES (?)", ["bob"]);
  const rows = db_query<{ id: number; name: string }>(ctx, "SELECT * FROM items");
  expect(rows).toEqual([
    { id: 1, name: "alice" },
    { id: 2, name: "bob" },
  ]);
});

test("stop closes database", () => {
  const result = db_stop(ctx);
  expect(result).toBe("db closed");
  expect(ctx.db).toBeNull();
});

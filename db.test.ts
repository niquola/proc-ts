import { test, expect, beforeEach, afterEach } from "bun:test";
import start from "./db/start";
import stop from "./db/stop";
import query from "./db/query";
import exec from "./db/exec";

let ctx: any;

beforeEach(() => {
  ctx = { state: {} };
  start(ctx, ":memory:");
});

afterEach(() => {
  stop(ctx);
});

test("start opens database", () => {
  // verify db works by running a query
  const rows = query(ctx, "SELECT 1 as x");
  expect(rows).toEqual([{ x: 1 }]);
});

test("create table and insert", () => {
  exec(ctx, "CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)");
  const res = exec(ctx, "INSERT INTO items (name) VALUES (?)", ["test"]);
  expect(res.changes).toBe(1);
  expect(res.lastInsertRowid).toBe(1);
});

test("select returns typed rows", () => {
  exec(ctx, "CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)");
  exec(ctx, "INSERT INTO items (name) VALUES (?)", ["alice"]);
  exec(ctx, "INSERT INTO items (name) VALUES (?)", ["bob"]);
  const rows = query<{ id: number; name: string }>(ctx, "SELECT * FROM items");
  expect(rows).toEqual([
    { id: 1, name: "alice" },
    { id: 2, name: "bob" },
  ]);
});

test("stop closes database", () => {
  const result = stop(ctx);
  expect(result).toBe("db closed");
  // verify db is closed — query should throw
  expect(() => query(ctx, "SELECT 1")).toThrow();
});

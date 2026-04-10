---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

# proc-ts

## The Approach

Inspired by Clojure's philosophy: data > objects, REPL-driven development, functions over methods, explicit state over hidden mutation.

Clojure showed that you don't need classes to build systems. You need functions, immutable data, and a live REPL. But Clojure requires JVM, parentheses, and a mental shift most teams won't make.

We take the core ideas and bring them to TypeScript:

**One function = one file.** No classes, no closures, no hidden state. A function receives `ctx` (the system state) and parameters. Everything is explicit — like passing the world as an argument.

**REPL server instead of restart.** The process stays alive. You edit a file, `reload_all` — new code is picked up. State (DB connections, server, data) persists. Like Clojure's nREPL, but over HTTP.

**Normal imports work.** Functions import each other with standard `import`. On reload, the REPL rewrites imports with cache busting — the entire dependency chain refreshes.

**Testing is free.** `ctx` is explicit → construct an empty `ctx`, call the function, assert the result. No mocks, no DI, no test containers. Like testing pure functions in Clojure.

**REPL as debugger.** Write `ctx.t.res = someFunc(ctx)` — inspect the result. Step through logic like a notebook, no breakpoints needed. Like `(def res (some-fn ctx))` at the REPL.

The result: TypeScript + files + REST + instant feedback loop. Minimum abstraction, maximum control.

## Why This Is Great for AI Agents

This architecture is designed to be fully observable, modifiable, and verifiable by an AI agent in a single cycle:

- **Total visibility.** `ls *.ts` — every function in the system. `eval 'Object.keys(ctx)'` — all state. No hidden magic in class hierarchies, middleware chains, or decorators. The agent doesn't guess — it sees a flat list.
- **Atomic units of work.** One function = one file = one task. The agent writes a function, drops it in a file, reloads, verifies. Never touching a 500-line file with 20 entangled methods.
- **Self-verifying workflow.** Write → `reload_all` → `eval 'fn(ctx, ...)'` → see result → fix. The agent closes the feedback loop without restarting, waiting for builds, or context-switching.
- **Transparent state.** No hidden singletons, no "what's in `this`". The agent does `eval 'ctx.db'` and knows whether a connection exists. All state is inspectable at any moment.
- **Trivial test generation.** Since everything goes through `ctx`, the agent generates tests mechanically: construct ctx, call function, assert. No environment setup, no mocking frameworks.
- **REPL as debugger.** When something breaks, the agent steps through: `ctx.t.step1 = f(ctx)`, `ctx.t.step2 = g(ctx.t.step1)` — isolates the failure without breakpoints or log diving.

In short: an architecture an agent can **fully understand, modify, and verify** in one pass.

## Rules

1. No classes and objects at all
2. Only functions with everything passed as parameters
3. One global state in `ctx` object — no closures, no local state
4. System procedures: `function(ctx, session, ...params)`. No ctx = must be pure
5. One file per function — filename = function name
6. Normal imports between functions

## Quick Start

```bash
bun install

# Start the REPL server (port 3001)
tmux new-session -d -s proc-ts 'bun run repl-proc-start.ts'

# Reload all functions and boot the system
bun repl_send.ts reload_all
bun repl_send.ts eval 'system_start(ctx)'

# Test
curl localhost:3002/todos
```

## Development Workflow

```
1. Write a function     →  vim http_todos.ts
2. Reload               →  bun repl_send.ts reload_all
3. Test                 →  curl localhost:3002/todos
4. Inspect              →  bun repl_send.ts eval 'db_query(ctx, "SELECT * FROM todos")'
5. Repeat              →  no restarts, state preserved
```

## CLI Commands

```bash
bun repl_send.ts reload_all            # reload ALL files (fresh imports)
bun repl_send.ts reload <fn_name>      # reload one file (+ its imports)
bun repl_send.ts eval '<code>'         # eval with access to ctx and all fns
```

### When to use which reload

- **`reload_all`** — after editing a shared function (e.g. `db_query`) that others import
- **`reload <name>`** — after editing a leaf function that nobody else imports

## System Lifecycle

```bash
bun repl_send.ts eval 'system_start(ctx)'       # db + migrations + server
bun repl_send.ts eval 'system_stop(ctx)'        # server + db shutdown
```

`system_start(ctx, port?)` does everything in order:
1. Opens SQLite database (WAL mode)
2. Runs migrations (`CREATE TABLE IF NOT EXISTS ...`)
3. Starts HTTP server on port (default 3002)

`system_stop(ctx)` tears down in reverse: server → db.

## HTTP Server

### Route Convention

Files named `http_*.ts` auto-register as routes on reload:

| File | Route |
|------|-------|
| `http_health.ts` | `/health` |
| `http_todos.ts` | `/todos` |
| `http_todos_$id.ts` | `/todos/:id` |
| `http_user_$id.ts` | `/user/:id` |
| `http_org_$org_members.ts` | `/org/:org/members` |

Handler with normal imports:

```ts
import db_query from "./db_query";

export default async function http_todos(ctx: any, session: any, request: any) {
  if (request.req.method === "GET") {
    const todos = db_query(ctx, "SELECT * FROM todos");
    return Response.json(todos);
  }
  if (request.req.method === "POST") {
    const body = await request.req.json();
    const result = db_query(ctx, "INSERT INTO todos (title) VALUES (?)", [body.title]);
    return Response.json({ id: result.lastInsertRowid, title: body.title, done: 0 }, { status: 201 });
  }
}
```

## SQLite Database

```bash
bun repl_send.ts eval 'db_start(ctx)'
bun repl_send.ts eval 'db_query(ctx, "CREATE TABLE todos (id INTEGER PRIMARY KEY, title TEXT, done INTEGER DEFAULT 0)")'
bun repl_send.ts eval 'db_query(ctx, "SELECT * FROM todos")'
bun repl_send.ts eval 'db_stop(ctx)'
```

- `db_start(ctx, path?)` — opens SQLite (WAL mode), default `data.db`
- `db_query(ctx, sql, params?)` — SELECT → rows, mutations → `{ changes, lastInsertRowid }`
- `db_stop(ctx)` — closes connection

## Testing

```bash
bun test                    # run all
bun test db.test.ts         # run one file
```

- **Unit tests**: `<fn_name>.test.ts` — one function, fresh `ctx`
- **Functional tests**: `<module>.test.ts` — multiple functions together

No mocks — just construct a `ctx` and call the function. Use `:memory:` for db tests.

### Debugging via REPL

Step through logic interactively, store intermediate results:

```bash
bun repl_send.ts eval 'ctx.t = {}'
bun repl_send.ts eval 'db_start(ctx.t, ":memory:")'
bun repl_send.ts eval 'ctx.t.res = db_query(ctx.t, "SELECT 1+1 as x")'
bun repl_send.ts eval 'ctx.t.res'              # inspect
bun repl_send.ts eval 'delete ctx.t'           # cleanup
```

## How It Works

1. `repl-proc-start.ts` runs a Bun HTTP server on port 3001
2. On `reload`, it reads the source file and rewrites relative imports to absolute paths with `?t=timestamp` — busting Bun's module cache
3. The rewritten file is imported from a temp file (cleaned up immediately)
4. `reload_all` does this for every `.ts` file — so all import chains are fresh
5. Files prefixed `http_` also register in `ctx.routes`
6. `eval` creates an async function with all loaded fns as parameters, executes it
7. The app server (`server_start`) matches incoming requests against `ctx.routes` at runtime

## Architecture

```
ctx.ts                  — global state object
repl-proc-start.ts      — REPL server (port 3001): eval + reload + reload_all
repl_send.ts            — CLI client for REPL

server_start.ts         — HTTP server with dynamic routing
server_stop.ts          — stop HTTP server

db_start.ts             — open SQLite database
db_stop.ts              — close database
db_query.ts             — execute SQL

http_todos.ts           — GET/POST /todos
http_todos_$id.ts       — GET/PATCH/DELETE /todos/:id
http_health.ts          — GET /health
http_user_$id.ts        — GET /user/:id

counter_proc_increment.ts — example: increment counter
counter_proc_read.ts      — example: read counter
```

## Claude Workflow (IMPORTANT)

When working on this project:

1. **Ensure REPL is running** — check tmux session `proc-ts`. If not running:
   ```bash
   tmux new-session -d -s proc-ts -c /Users/niquola/proc-ts 'bun run repl-proc-start.ts'
   ```

2. **Write a function** — create a `.ts` file, filename = function name, export default. Use normal imports.

3. **Reload** — `reload_all` after editing shared functions, `reload <name>` for leaf changes:
   ```bash
   bun repl_send.ts reload_all
   ```

4. **Test** — eval or curl:
   ```bash
   bun repl_send.ts eval 'fn_name(ctx, ...args)'
   curl localhost:3002/route
   ```

5. **Debug** — use `ctx.t` as scratch:
   ```bash
   bun repl_send.ts eval 'ctx.t = {}'
   bun repl_send.ts eval 'ctx.t.res = someFunc(ctx)'
   bun repl_send.ts eval 'ctx.t.res'
   bun repl_send.ts eval 'delete ctx.t'
   ```

### Key principles:
- Prefer `reload_all` over restarting — state (db, server) persists
- If things are messy (broken state, port conflicts, weird errors) — restart the REPL:
  ```bash
  lsof -ti:3001 | xargs kill; lsof -ti:3002 | xargs kill
  tmux kill-session -t proc-ts 2>/dev/null
  tmux new-session -d -s proc-ts -c /Users/niquola/proc-ts 'bun run repl-proc-start.ts'
  bun repl_send.ts reload_all
  bun repl_send.ts eval 'system_start(ctx)'
  ```
- Functions CAN import other project functions normally
- ALWAYS test via `bun repl_send.ts` after editing
- Eval supports `await`

## Known Limitations

### `reload_all` and Bun's import cache

Bun caches modules by path. A normal `import("./db_query.ts")` returns the cached version even if the file changed. To work around this, `reload` rewrites imports with `?t=timestamp` (cache busting) and loads from a temp file.

The consequence: **`reload <name>` only refreshes that file and its direct imports.** If you change `db_query.ts`, files that already imported the old `db_query` still hold the stale reference. That's why `reload_all` exists — it reloads every file with fresh imports, guaranteeing consistency.

Trade-offs:
- `reload_all` is O(n) — reads, rewrites, and imports every `.ts` file. Fine for dozens of files, may slow down at hundreds.
- Each reload creates a new module instance in Bun's memory (old ones get GC'd eventually but aren't explicitly freed).
- Temp files are created and deleted on each reload — fast, but adds filesystem churn.

Possible future improvements:
- Build a dependency graph and only reload affected files on change
- Use Bun's `--hot` mode if it adds programmatic cache invalidation
- File watcher with debounced `reload_all` (removed for now — explicit is better than implicit)

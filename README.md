# proc-ts

> Clone this repo, point your coding agent at it, and try building something in this paradigm. We'd love your feedback — [open an issue](https://github.com/niquola/proc-ts/issues)!

> `CLAUDE.md` is a symlink to this file — AI agents read the same doc as humans.

Clojure-style procedural TypeScript. Functions, data, REPL — no classes, no frameworks.

## Why

We wanted the simplest possible environment for an AI coding agent — no abstractions, no magic, predictable results.

Most TypeScript projects end up with layers: classes, DI containers, decorators, middleware chains. Each layer hides state and makes it harder for an agent to understand what's happening, verify changes, and move fast.

The foundation is **data and functions**. That's it. An agent reads a 30-line function, changes it, reloads via REPL, calls it, sees the result — all in one cycle, no restarts. Add some **types for guardrails** so the compiler catches typos before runtime. And **always tests** — so changes are verifiable, not just "looks right."

Inspired by Clojure: functions over methods, data over objects, REPL over restart. But in TypeScript, with Bun, zero dependencies.

## Core Principles

### One function = one file, folder = namespace

Every function lives in its own file inside a namespace folder. `db/query.ts` → `ctx.db.query`. No classes, no closures, no hidden state.

```
db/
  start.ts          → ctx.db.start(ctx, path)
  stop.ts           → ctx.db.stop(ctx)
  query.ts          → ctx.db.query<T>(ctx, sql, params)
  exec.ts           → ctx.db.exec(ctx, sql, params)
  migrate.ts        → ctx.db.migrate(ctx)

ui/
  layout.ts         → ctx.ui.layout(ctx, session, req, body)
  login.ts          → ctx.ui.login(ctx, session, req)
  issues.ts         → ctx.ui.issues(ctx, session, req)

system/
  start.ts          → ctx.system.start(ctx, opts)
  stop.ts           → ctx.system.stop(ctx)
```

**Why:** `ls db/` shows the entire database module. Each file is a self-contained unit. An AI agent can understand a 30-line file instantly. Namespaces give structure without import boilerplate.

### Everything through `ctx`

`ctx` is the single global object. Namespaces hold functions, `state` holds data, `routes` holds the route table.

```ts
type Ctx = CtxNs & {                    // namespaces: db, ui, api, server, system, auth...
  routes: Record<string, Function>;      // registered HTTP routes
  state: {                               // runtime data — typed per namespace
    db: Database | null;                 // from db/state.ts
    server: Server | null;               // from server/state.ts
    [key: string]: any;                  // untyped for the rest
  };
  t: any;                                // REPL scratch space
}
```

**Why:** No hidden singletons, no "what's in `this`?". You can inspect all state via `eval 'ctx.state'` and all functions via `eval 'Object.keys(ctx.db)'`. Tests construct their own `ctx` — no global setup, no mocking.

### Namespaces instead of imports

Functions don't import each other. They access dependencies through `ctx` namespaces:

```ts
// NOT this:
import db_query from "../db/query";

// This:
export default function start(ctx: Ctx, opts = {}) {
  ctx.db.start(ctx, opts.env === "test" ? ":memory:" : "data.db");
  ctx.db.migrate(ctx);
  if (opts.env !== "test") ctx.server.start(ctx, opts.port || 3002);
}
```

**Why:** Traditional imports create frozen references. If you change `db/query.ts`, every file that imported the old version still holds a stale reference. With `ctx.db.query`, functions resolve at call time — like Clojure vars. Reload one file, every caller immediately sees the new version.

### State separate from functions

Functions live in namespaces (`ctx.db`, `ctx.ui`). Data lives in `ctx.state`:

```ts
ctx.db.start(ctx)       // function — opens connection
ctx.state.db             // data — the Database connection itself

ctx.server.start(ctx)    // function — starts server
ctx.state.server         // data — the Server instance
```

**Why:** Clean separation. Inspect all runtime state: `eval 'ctx.state'`. Functions are pure dispatch — they read/write `ctx.state` but don't live there.

**Rule: modules must not access other modules' state directly.** `ctx.state.db` is private to `db/`. Other modules call `ctx.db.query(ctx, ...)` — never `ctx.state.db.prepare(...)`. This is encapsulation: each module owns its state, exposes functions as the public API.

```ts
// WRONG — ui/issues.ts reaching into db's state:
const rows = ctx.state.db.prepare("SELECT ...").all();

// RIGHT — ui/issues.ts calling db's function:
const rows = ctx.db.query(ctx, "SELECT ...");
```

### Typed state by convention

A `state.ts` file in a namespace folder defines the type for that namespace's state:

```ts
// db/state.ts
import type { Database } from "bun:sqlite";
export type State = Database | null;

// server/state.ts
import type { Server } from "bun";
export type State = Server<any> | null;
```

`load_all` picks these up and generates typed `ctx.state`:

```ts
ctx.state.db          // Database | null  — typed!
ctx.state.db.prepare  // autocomplete works
ctx.state.server      // Server | null — typed!
ctx.state.counter     // any — no state.ts, still works
```

**Why:** `ctx.state` was `Record<string, any>` — the last big type hole. Now each namespace can opt in to typed state with one file. No state.ts = still `any`, no friction.

### Global types: `Ctx`, `Req`, `Session`

Types declared globally via `declare global`. No imports needed:

```ts
type Req = Request & {                                    // Bun's native Request
  params: Record<string, string>;                         // + route params from router
}

type Session = {
  user: { id: number; username: string } | null;          // resolved from cookie
  token: string | null;
}
```

**Why:** These types appear in every handler. Global declaration removes boilerplate while keeping full type safety. Typo in `request.methood` → compile error.

### Strict `CtxNs` — typo = compile error

`load_all` generates `ctx_ns.d.ts` with nested namespace types:

```ts
// Auto-generated by load_all — do not edit
export default interface CtxNs {
  db: {
    query: typeof import("./db/query").default;
    exec: typeof import("./db/exec").default;
    // ...
  };
  ui: {
    layout: typeof import("./ui/layout").default;
    // ...
  };
}
```

`ctx.db.queryyy` → compile error. Full autocomplete per namespace.

### `db.query<T>` and `db.exec` — typed database

```ts
type Issue = { id: number; title: string; status: string };

const issues = ctx.db.query<Issue>(ctx, "SELECT * FROM issues");
issues[0].title    // string ✓
issues[0].typo     // compile error ✓

const r = ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Bug"]);
r.lastInsertRowid  // number ✓
```

### Migrations in `db/migrate`

All schema in one function. Called by `system.start`, or independently:

```bash
bun repl_send.ts eval 'db.migrate(ctx)'
```

### Auth guard in the router

`server/start` resolves session from cookie and checks auth before calling handlers:

```ts
const session = ctx.auth.session_from_cookie(ctx, req);
if (!session.user && !publicPaths.includes(pattern)) {
  return redirect("/ui/login");
}
return await handler(ctx, session, req);
```

Handlers receive a guaranteed typed `Session`. Auth logic in one place.

## Quick Start

```bash
bun install
tmux new-session -d -s proc-ts 'bun run repl-proc-start.ts'
bun repl_send.ts load_all
bun repl_send.ts eval 'system.start(ctx)'
# Login: admin / admin
open http://localhost:3002/ui/issues
```

## REPL Workflow

The REPL server runs on `:3001`. Process stays alive — state persists across reloads.

### Loading functions

```bash
bun repl_send.ts load_all         # startup: load all, generate types
bun repl_send.ts reload db/query  # after edit: reload one file
```

`load_all` once at startup. After that, `reload <path>` is enough — no stale references.

### Evaluating code

```bash
bun repl_send.ts eval 'db.query(ctx, "SELECT * FROM issues")'
bun repl_send.ts eval 'system.stop(ctx)'
bun repl_send.ts eval 'Object.keys(ctx.db)'
```

All namespaces and functions available by name. `await` works.

### Debugging with scratch space

```bash
bun repl_send.ts eval 'ctx.t = {}'
bun repl_send.ts eval 'ctx.t.issues = db.query(ctx, "SELECT * FROM issues")'
bun repl_send.ts eval 'ctx.t.issues'
bun repl_send.ts eval 'ctx.t = null'
```

### Recovery

```bash
lsof -ti:3001 | xargs kill; lsof -ti:3002 | xargs kill
tmux kill-session -t proc-ts 2>/dev/null
tmux new-session -d -s proc-ts 'bun run repl-proc-start.ts'
bun repl_send.ts load_all
bun repl_send.ts eval 'system.start(ctx)'
```

## Testing

Tests import functions directly and wire namespaces into ctx:

```ts
import db_start from "./db/start";
import db_query from "./db/query";
import db_exec from "./db/exec";
import db_migrate from "./db/migrate";
import system_start from "./system/start";

const ctx = { state: {}, routes: {},
  db: { start: db_start, stop: db_stop, query: db_query, exec: db_exec, migrate: db_migrate },
  server: { start: server_start },
} as any;
system_start(ctx, { env: "test" });

// typed query
type Issue = { id: number; title: string; status: string };
const issues = db_query<Issue>(ctx, "SELECT * FROM issues");
```

```bash
bun test                    # all tests
bun test login.test.ts      # one file
```

## Route Convention

Folders map to route prefixes:

| Folder / file | Route |
|--------------|-------|
| `ui/issues.ts` | `/ui/issues` |
| `ui/issues_$id.ts` | `/ui/issues/:id` |
| `api/issues.ts` | `/api/issues` |
| `api/issues_$id.ts` | `/api/issues/:id` |
| `issues/http.ts` | `/issues` |

`$` in filename → `:param` in route. `_` → `/`.

## Auth

- Default user: `admin` / `admin` (created by `db/migrate`)
- Login page: `/ui/login` (form prefilled)
- All routes except `/ui/login` and `/health` require auth
- Session cookie resolved by `auth/session_from_cookie` before handler runs

## Architecture

```
ctx.ts / ctx_ns.d.ts           — types + auto-generated namespace signatures
repl-proc-start.ts             — REPL server (:3001)
repl_send.ts                   — CLI client

db/
  start / stop                 — SQLite connection (WAL mode)
  query<T> / exec              — typed SELECT → T[], mutations → {changes, lastInsertRowid}
  migrate                      — schema + seed data

server/
  start / stop                 — HTTP server with routing + auth guard

system/
  start / stop                 — boot/shutdown orchestration

auth/
  session_from_cookie          — resolve session from request cookie

ui/
  layout / escapeHtml          — shared helpers (Tailwind CDN)
  login / logout               — auth pages
  issues / issues_$id / issues_$id_edit — issue tracker UI

api/
  issues / issues_$id / issues_$id_comments / issues_$id_delete / issues_$id_status

issues/
  http / http_$id              — JSON API
```

## Claude Workflow

1. **Ensure REPL is running:**
   ```bash
   tmux new-session -d -s proc-ts 'bun run repl-proc-start.ts'
   ```

2. **Write a function** — `export default` in a namespace folder. Use `ctx.ns.fn` for deps. No imports from other project files.

3. **Load/Reload:**
   ```bash
   bun repl_send.ts load_all          # new files
   bun repl_send.ts reload db/query   # changed files
   ```

4. **Test:**
   ```bash
   bun repl_send.ts eval 'db.query(ctx, "SELECT 1")'
   curl localhost:3002/route
   bun test
   ```

5. **If broken** — restart:
   ```bash
   lsof -ti:3001 | xargs kill; lsof -ti:3002 | xargs kill
   tmux kill-session -t proc-ts 2>/dev/null
   tmux new-session -d -s proc-ts 'bun run repl-proc-start.ts'
   bun repl_send.ts load_all
   bun repl_send.ts eval 'system.start(ctx)'
   ```

---

> *Coherent architecture for a small, REPL-driven, procedural Bun application. Not a generally superior TypeScript architecture — a deliberately biased one. Core strength: operational simplicity. Core weakness: typed-but-global service locator via `ctx` and `ctx.fns`.*
>
> — OpenAI Codex (GPT-5.4), architectural review

> *Legitimate experiment in minimalist architecture that delivers on its core promise: fast feedback loops with maximum transparency, at small scale. The strongest genuine use case: an AI agent rapidly prototyping a CRUD app with instant verification via REPL eval. For that specific workflow, this is better than spinning up a Next.js project.*
>
> — Claude Opus 4.6, independent architectural review

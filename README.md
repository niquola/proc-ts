# proc-ts

> Clone this repo, point your coding agent at it, and try building something in this paradigm. We'd love your feedback — [open an issue](https://github.com/niquola/proc-ts/issues)!

> `CLAUDE.md` is a symlink to this file — AI agents read the same doc as humans.

Clojure-style procedural TypeScript. Functions, data, REPL — no classes, no frameworks.

## Why

We wanted the simplest possible environment for an AI coding agent — no abstractions, no magic, predictable results.

Most TypeScript projects end up with layers: classes, DI containers, decorators, middleware chains. Each layer hides state and makes it harder for an agent to understand what's happening, verify changes, and move fast.

The foundation is **data and functions**. That's it. An agent reads a 30-line function, changes it — file watcher auto-reloads — calls it via REPL, sees the result. No restarts, no build steps. Add **types for guardrails** so the compiler catches typos before runtime. And **always tests** — so changes are verifiable, not just "looks right."

Inspired by Clojure: functions over methods, data over objects, REPL over restart. But in TypeScript, with Bun, zero dependencies.

## Core Principles

### 1. One function = one file, folder = namespace

Every function lives in its own file inside a namespace folder. `db/query.ts` → `ctx.db.query`.

```
db/
  start.ts          → ctx.db.start(ctx, path)
  stop.ts           → ctx.db.stop(ctx)
  query.ts          → ctx.db.query<T>(ctx, sql, params)
  exec.ts           → ctx.db.exec(ctx, sql, params)
  migrate.ts        → ctx.db.migrate(ctx)
  state.ts          → type for ctx.state.db (compile-time only)

ui/
  layout.ts         → ctx.ui.layout(ctx, session, req, body)
  login.ts          → ctx.ui.login(ctx, session, req)
  issues.ts         → ctx.ui.issues(ctx, session, req)
  _helper.ts        → ctx.ui._helper (internal, NOT a route)

system/
  start.ts          → ctx.system.start(ctx, opts)
  stop.ts           → ctx.system.stop(ctx)
```

**Why:** `ls db/` shows the entire module. Each file is self-contained. An AI agent understands a 30-line file instantly.

### 2. Namespaces instead of imports

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

**Why:** Traditional imports create frozen references. Change `db/query.ts` → every importer holds a stale version. With `ctx.db.query`, functions resolve at call time — like Clojure vars. Reload one file, every caller sees the new version instantly.

### 3. State separate from functions, encapsulated per module

Functions live in namespaces (`ctx.db`, `ctx.ui`). Data lives in `ctx.state`. Each module owns its state — others must not access it directly:

```ts
// db/start.ts writes ctx.state.db (private to db/)
// db/query.ts reads ctx.state.db (private to db/)

// WRONG — ui/issues.ts reaching into db's state:
const rows = ctx.state.db.prepare("SELECT ...").all();

// RIGHT — ui/issues.ts calling db's public API:
const rows = ctx.db.query(ctx, "SELECT ...");
```

**Why:** Encapsulation without classes. Module owns its state, exposes functions. Inspect all state: `eval 'ctx.state'`.

### 4. Everything through `ctx`

```ts
type Ctx = CtxNs & {                    // namespaces: db, ui, api, server, system, auth...
  routes: Record<string, Function>;      // registered HTTP routes
  env: Record<string, string>;           // environment variables
  state: {                               // runtime data — typed per namespace
    db: Database | null;                 // from db/state.ts
    server: Server | null;               // from server/state.ts
    [key: string]: any;                  // untyped for the rest
  };
  t: any;                                // REPL scratch space
}
```

### 5. Typed state by convention

A `state.ts` in a namespace defines the type for `ctx.state.<ns>`:

```ts
// db/state.ts — compile-time only, not loaded as a function
import type { Database } from "bun:sqlite";
export type State = Database | null;
```

Result: `ctx.state.db` is `Database | null`, not `any`. Autocomplete works.

### 6. Global types: `Ctx`, `Req`, `Session`

Declared globally via `declare global` in `ctx.ts`. No imports needed anywhere:

```ts
type Req = Request & { params: Record<string, string> }  // Bun Request + route params
type Session = { user: { id: number; username: string } | null; token: string | null }
```

### 7. Strict `CtxNs` — typo = compile error

`load_all` auto-generates `ctx_ns.d.ts` with nested namespace types. `ctx.db.queryyy` → compile error. Full autocomplete per namespace.

### 8. `_type` convention — global domain types

`ns/Thing_type.ts` → `types.ns.Thing` available globally without imports:

```ts
// fhir/Patient_type.ts
export type Patient = { id: string; name: string; birthDate: string };

// Anywhere in the project — no import needed:
const p: types.fhir.Patient = ...
```

Generated as `declare global { namespace types { ... } }` in `ctx_ns.d.ts`.

### 9. `db.query<T>` and `db.exec` — typed database

```ts
type Issue = { id: number; title: string; status: string };
const issues = ctx.db.query<Issue>(ctx, "SELECT * FROM issues");
issues[0].title    // string ✓
issues[0].typo     // compile error ✓

const r = ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Bug"]);
r.lastInsertRowid  // number ✓
```

### 10. Migrations in `db/migrate`

All schema in one function. Called by `system.start`, or independently via REPL:

```bash
bun repl_send.ts eval 'db.migrate(ctx)'
```

Seeds admin user on first run. Tests call `system.start(ctx, {env: "test"})` which runs migrations on `:memory:` DB.

### 11. Auth guard in the router

`server/start` resolves session from cookie and checks auth before calling handlers. Handlers receive a guaranteed typed `Session`. Public paths (`/ui/login`, `/health`) explicitly listed. Auth logic in one place.

### 12. Internal files — `_` prefix

Files starting with `_` (e.g. `ui/_helper.ts`) or ending with `_layout`/`_middleware` are loaded into the namespace but NOT registered as routes. Use for shared helpers, middleware, layouts.

### 13. `ctx.env` — environment variables

`ctx.env` wraps `process.env`. Accessible everywhere, overridable in tests:

```ts
ctx.env.DATABASE_URL    // read env var
// In tests: ctx.env.DATABASE_URL = "test-value"
```

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

The REPL server runs on `:3001` (configurable via `REPL_PORT`). Process stays alive — state persists across reloads.

### Live reload

Save a file → file watcher auto-reloads it → WebSocket clients notified. No manual `reload` needed during development.

For manual reload:
```bash
bun repl_send.ts reload db/query   # reload one file
bun repl_send.ts load_all          # reload all + regenerate types
```

### Evaluating code

```bash
bun repl_send.ts eval 'db.query(ctx, "SELECT * FROM issues")'
bun repl_send.ts eval 'system.stop(ctx)'
bun repl_send.ts eval 'Object.keys(ctx.db)'
```

All namespaces and functions available by name. `await` works.

### Dev / test environments

```bash
bun repl_send.ts eval '...'         # dev (port 3001)
bun repl_send.ts test eval '...'    # test (port 3003)
```

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

`load_all` auto-generates `test_ctx.ts` — zero boilerplate:

```ts
import test_ctx from "./test_ctx";

test("issues: create", () => {
  const ctx = test_ctx();  // :memory: DB, migrations, all namespaces wired
  ctx.db.exec(ctx, "INSERT INTO issues (title) VALUES (?)", ["Bug"]);
  const issues = ctx.db.query(ctx, "SELECT * FROM issues");
  expect(issues[0].title).toBe("Bug");
  ctx.db.stop(ctx);
});
```

Add a function → `load_all` regenerates `test_ctx.ts` → tests pick it up.

```bash
bun test                    # all tests
bun test login.test.ts      # one file
```

## Type Checking

```bash
bunx tsc --noEmit
```

What the compiler catches:
- `ctx.db.queryyy` — Property does not exist on type
- `ctx.blabla` — no such namespace
- `request.methood` — Property does not exist on Request
- `ctx.state.db.prepare(...)` — only in db/ (typed via state.ts)

What it doesn't catch (by design):
- `ctx.state.counter` — no state.ts, remains `any`
- `ctx.t` — REPL scratch, intentionally `any`
- `db.query` without `<T>` — returns `any[]`

## Route Convention

Folders map to route prefixes. `$` → `:param`. `_` → `/`.

| Folder / file | Route |
|--------------|-------|
| `ui/issues.ts` | `/ui/issues` |
| `ui/issues_$id.ts` | `/ui/issues/:id` |
| `api/issues.ts` | `/api/issues` |
| `api/issues_$id.ts` | `/api/issues/:id` |

Files with `_` prefix, `_layout` or `_middleware` suffix → NOT routes (internal helpers).

## Auto-generated files

`load_all` generates two files — don't edit them:

| File | Purpose |
|------|---------|
| `ctx_ns.d.ts` | Strict namespace types + global `types.*` declarations |
| `test_ctx.ts` | Test helper with all imports and namespace wiring |

## Auth

- Default user: `admin` / `admin` (seeded by `db/migrate`)
- Login page: `/ui/login` (form prefilled)
- All routes except `/ui/login` and `/health` require auth
- Session cookie resolved by `auth/session_from_cookie` before handler runs

## Architecture

```
ctx.ts / ctx_ns.d.ts           — types + auto-generated namespace signatures
repl-proc-start.ts             — REPL server + file watcher + livereload
repl_send.ts                   — CLI client (dev/test environments)
test_ctx.ts                    — auto-generated test helper

db/
  start / stop                 — SQLite connection (WAL mode)
  query<T> / exec              — typed SELECT → T[], mutations → {changes, lastInsertRowid}
  migrate                      — schema + seed data
  state.ts                     — typed state: Database | null

server/
  start / stop                 — HTTP server with routing + auth guard
  state.ts                     — typed state: Server | null

system/
  start / stop                 — boot/shutdown orchestration

auth/
  session_from_cookie          — resolve session from request cookie

ui/
  layout / escapeHtml          — shared helpers (Tailwind CDN)
  login / logout               — auth pages
  issues / issues_$id / ...    — issue tracker UI

api/
  issues / issues_$id / ...    — form action handlers (POST → redirect)

issues/
  http / http_$id              — JSON API
```

## Claude Workflow

1. **Ensure REPL is running:**
   ```bash
   tmux new-session -d -s proc-ts 'bun run repl-proc-start.ts'
   ```

2. **Write a function** — `export default` in a namespace folder. Use `ctx.ns.fn` for deps. No imports from other project files.

3. **Save** — file watcher auto-reloads. Or manually:
   ```bash
   bun repl_send.ts load_all          # new files
   bun repl_send.ts reload db/query   # specific file
   ```

4. **Test:**
   ```bash
   bun repl_send.ts eval 'db.query(ctx, "SELECT 1")'
   curl localhost:3002/route
   bun test
   bunx tsc --noEmit
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

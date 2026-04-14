import { resolve, dirname, basename } from "path";
import { Glob } from "bun";
import ctx from "./ctx";

const session: any = {};
const projectDir = resolve(".");

// Load a single file: inject __ns/__name, import, register in ctx[ns][name]
async function loadFile(filePath: string) {
  const abs = resolve(projectDir, filePath);
  const source = await Bun.file(abs).text();

  // Determine namespace and function name from path
  const parts = filePath.replace(/\.ts$/, "").split("/");
  let ns: string, name: string;
  if (parts.length >= 2) {
    ns = parts[0];
    name = parts.slice(1).join("_");
  } else {
    ns = "";
    name = parts[0];
  }

  // Inject __ns and __name constants
  const injected = `const __ns = "${ns}";\nconst __name = "${name}";\n${source}`;
  const tmpPath = `${abs}.tmp.ts`;
  await Bun.write(tmpPath, injected);
  const mod = await import(`${tmpPath}?t=${Date.now()}`);
  await Bun.$`rm -f ${tmpPath}`.quiet();

  if (!mod.default) return null;

  // Register in ctx[ns][name]
  if (ns) {
    if (!(ctx as any)[ns]) (ctx as any)[ns] = {};
    (ctx as any)[ns][name] = mod.default;
  }

  // Register routes
  if (!ctx.routes) ctx.routes = {};
  const fullName = ns ? `${ns}_${name}` : name;

  if (ns === "ui" || ns === "issues" || ns === "misc") {
    // ui/issues.ts → /ui/issues, ui/issues_$id.ts → /ui/issues/$id
    // issues/http.ts → /issues, issues/http_$id.ts → /issues/$id
    // misc/http_.ts → /, misc/http_health.ts → /health
    let routeName: string;
    if (ns === "issues") {
      routeName = name.startsWith("http") ? name.replace(/^http_?/, "") : null as any;
      if (routeName !== null) {
        const pattern = routeName ? "/" + ns + "/" + routeName.replace(/_/g, "/") : "/" + ns;
        ctx.routes[pattern] = mod.default;
      }
    } else if (ns === "ui") {
      if (name === "index") {
        ctx.routes["/ui"] = mod.default;
      } else if (name !== "layout" && name !== "escapeHtml") {
        const pattern = "/ui/" + name.replace(/_/g, "/");
        ctx.routes[pattern] = mod.default;
      }
    } else if (ns === "misc") {
      if (name === "http_") {
        ctx.routes["/"] = mod.default;
      } else if (name.startsWith("http_")) {
        const pattern = "/" + name.slice(5).replace(/_/g, "/");
        ctx.routes[pattern] = mod.default;
      }
    }
  }

  if (ns === "api") {
    // api/issues.ts → /api/issues, api/issues_$id.ts → /api/issues/$id
    const pattern = "/api/" + name.replace(/_/g, "/");
    ctx.routes[pattern] = mod.default;
  }

  return { ns, name, fullName, path: abs };
}

async function handleReload(path: string) {
  const file = path.endsWith(".ts") ? path : path + ".ts";
  const result = await loadFile(file);
  if (!result) return { error: "no default export" };
  return { ok: true, ...result };
}

async function handleEval(code: string) {
  // Flatten all namespace functions + ctx into scope
  const names: string[] = [];
  const values: any[] = [];

  for (const [ns, fns] of Object.entries(ctx as any)) {
    if (typeof fns !== "object" || fns === null || ns === "state" || ns === "routes" || ns === "t") continue;
    // Namespace object itself: db, ui, api, system, etc.
    if (!names.includes(ns)) { names.push(ns); values.push(fns); }
    for (const [name, fn] of Object.entries(fns as any)) {
      if (typeof fn !== "function") continue;
      // Available as both ns_name and just name (for convenience)
      const fullName = `${ns}_${name}`;
      if (!names.includes(fullName)) { names.push(fullName); values.push(fn); }
      if (!names.includes(name)) { names.push(name); values.push(fn); }
    }
  }

  const fn = new Function(...names, "ctx", "session", `return (async () => (${code}))()`);
  const result = await fn(...values, ctx, session);
  return { result };
}

async function handleLoadAll() {
  const glob = new Glob("**/*.ts");
  const loaded: string[] = [];
  const skip = new Set(["ctx.ts", "repl-proc-start.ts", "repl_send.ts"]);

  for await (const file of glob.scan(projectDir)) {
    if (file.endsWith(".test.ts") || file.endsWith(".tmp.ts") || file.endsWith(".d.ts")) continue;
    if (skip.has(file)) continue;
    if (file.startsWith("node_modules/")) continue;
    if (!file.includes("/")) continue;
    // state.ts is type-only, skip loading
    if (file.endsWith("/state.ts")) continue;

    try {
      const result = await loadFile(file);
      if (result) loaded.push(`${result.ns}.${result.name}`);
    } catch (e: any) {
      console.error(`Failed to load ${file}: ${e.message}`);
    }
  }

  await genTypes();
  return { loaded, count: loaded.length };
}

async function genTypes() {
  const glob = new Glob("**/*.ts");
  const skip = new Set(["ctx.ts", "repl-proc-start.ts", "repl_send.ts"]);
  const namespaces: Record<string, string[]> = {};
  const stateTypes: string[] = [];

  for await (const file of glob.scan(projectDir)) {
    if (file.endsWith(".test.ts") || file.endsWith(".tmp.ts") || file.endsWith(".d.ts")) continue;
    if (skip.has(file)) continue;
    if (file.startsWith("node_modules/")) continue;
    if (!file.includes("/")) continue;

    const parts = file.replace(/\.ts$/, "").split("/");
    const ns = parts[0];
    const name = parts.slice(1).join("_");

    // state.ts defines typed state for namespace — skip from functions
    if (name === "state") {
      stateTypes.push(`    ${ns}: import("./${ns}/state").State;`);
      continue;
    }

    if (!namespaces[ns]) namespaces[ns] = [];
    namespaces[ns].push(`    ${name}: typeof import("./${file.replace(/\.ts$/, "")}").default;`);
  }

  const lines: string[] = [];
  for (const [ns, members] of Object.entries(namespaces).sort()) {
    members.sort();
    lines.push(`  ${ns}: {`);
    lines.push(...members);
    lines.push(`  };`);
  }

  // Typed state
  stateTypes.sort();
  lines.push(`  state: {`);
  lines.push(...stateTypes);
  lines.push(`    [key: string]: any;`);
  lines.push(`  };`);

  const content = `// Auto-generated by load_all — do not edit\nexport default interface CtxNs {\n${lines.join("\n")}\n}\n`;
  await Bun.write(resolve(projectDir, "ctx_ns.d.ts"), content);

  // Generate test_ctx.ts
  const imports: string[] = [];
  const nsBuilders: Record<string, string[]> = {};

  for (const [ns, members] of Object.entries(namespaces).sort()) {
    nsBuilders[ns] = [];
    for (const member of members) {
      // extract name from "    name: typeof import(...)"
      const match = member.match(/^\s+([\w$]+):/);
      if (!match) continue;
      const name = match[1];
      const varName = `_${ns}_${name}`;
      imports.push(`import ${varName} from "./${ns}/${name}";`);
      nsBuilders[ns].push(`      ${name}: ${varName},`);
    }
  }

  const ctxLines: string[] = [];
  for (const [ns, members] of Object.entries(nsBuilders).sort()) {
    ctxLines.push(`    ${ns}: {`);
    ctxLines.push(...members);
    ctxLines.push(`    },`);
  }

  const testCtx = [
    `// Auto-generated by load_all — do not edit`,
    ...imports,
    ``,
    `export default function test_ctx() {`,
    `  const ctx = {`,
    `    state: {},`,
    `    routes: {},`,
    ...ctxLines,
    `  } as any;`,
    `  _system_start(ctx, { env: "test" });`,
    `  return ctx;`,
    `}`,
    ``,
  ].join("\n");

  await Bun.write(resolve(projectDir, "test_ctx.ts"), testCtx);
}

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    if (req.method !== "POST") {
      return new Response("POST /repl", { status: 405 });
    }

    try {
      const body: any = await req.json();

      if (body.op === "load_all") {
        const res = await handleLoadAll();
        return Response.json(res);
      }

      if (body.op === "reload") {
        const res = await handleReload(body.path);
        return Response.json(res);
      }

      if (body.op === "eval") {
        const res = await handleEval(body.code);
        return Response.json(res);
      }

      return Response.json({ error: "unknown op" }, { status: 400 });
    } catch (e: any) {
      return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
  },
});

console.log(`repl server on http://localhost:${server.port}`);

import { resolve } from "path";
import { Glob } from "bun";
import { watch } from "fs";
import ctx from "./ctx";

const session: any = {};
const projectDir = resolve(".");

// Load a single file: inject __ns/__name, import, register in ctx[ns][name]
async function loadFile(filePath: string) {
  const abs = resolve(projectDir, filePath);
  const source = await Bun.file(abs).text();

  const parts = filePath.replace(/^\.\//, "").replace(/\.ts$/, "").split("/");
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

  // _type files are compile-time only — no runtime registration
  if (name.endsWith("_type")) return { ns, name, fullName: `${ns}_${name}`, path: abs };

  // Register in ctx[ns][name]
  if (ns) {
    if (!(ctx as any)[ns]) (ctx as any)[ns] = {};
    (ctx as any)[ns][name] = mod.default;
  }

  // Register routes
  if (!ctx.routes) ctx.routes = {};

  // Skip internal files (prefixed with _) from route registration
  if (name.startsWith("_") || name.endsWith("_middleware") || name.endsWith("_layout")) {
    return { ns, name, fullName: `${ns}_${name}`, path: abs };
  }

  if (ns === "ui") {
    if (name === "index") {
      ctx.routes["/ui"] = mod.default;
    } else if (name !== "layout" && name !== "escapeHtml") {
      ctx.routes["/ui/" + name.replace(/_/g, "/")] = mod.default;
    }
  } else if (ns === "api") {
    ctx.routes["/api/" + name.replace(/_/g, "/")] = mod.default;
  } else if (ns === "issues") {
    const routeName = name.startsWith("http") ? name.replace(/^http_?/, "") : null;
    if (routeName !== null) {
      const pattern = routeName ? "/" + ns + "/" + routeName.replace(/_/g, "/") : "/" + ns;
      ctx.routes[pattern] = mod.default;
    }
  } else if (ns === "misc") {
    if (name === "http_") {
      ctx.routes["/"] = mod.default;
    } else if (name.startsWith("http_")) {
      ctx.routes["/" + name.slice(5).replace(/_/g, "/")] = mod.default;
    }
  }

  return { ns, name, fullName: `${ns}_${name}`, path: abs };
}

async function handleReload(path: string) {
  const file = path.endsWith(".ts") ? path : path + ".ts";
  const result = await loadFile(file);
  if (!result) return { error: "no default export" };
  return { ok: true, ...result };
}

async function handleEval(code: string) {
  const names: string[] = [];
  const values: any[] = [];

  for (const [ns, fns] of Object.entries(ctx as any)) {
    if (typeof fns !== "object" || fns === null || ns === "state" || ns === "routes" || ns === "t" || ns === "env") continue;
    if (!names.includes(ns)) { names.push(ns); values.push(fns); }
    for (const [name, fn] of Object.entries(fns as any)) {
      if (typeof fn !== "function") continue;
      const fullName = `${ns}_${name}`;
      if (!names.includes(fullName)) { names.push(fullName); values.push(fn); }
      if (!names.includes(name)) { names.push(name); values.push(fn); }
    }
  }

  const fn = new Function(...names, "ctx", "session", `return (async () => (${code}))()`);
  const result = await fn(...values, ctx, session);
  return { result };
}

const skipDirs = new Set(["node_modules", "scripts", ".git"]);
const skipFiles = new Set(["ctx.ts", "repl-proc-start.ts", "repl_send.ts"]);

function shouldSkip(file: string) {
  if (file.endsWith(".test.ts") || file.endsWith(".tmp.ts") || file.endsWith(".d.ts")) return true;
  if (skipFiles.has(file)) return true;
  for (const dir of skipDirs) { if (file.startsWith(dir + "/")) return true; }
  if (!file.includes("/")) return true;
  if (file.endsWith("/state.ts")) return true;
  return false;
}

async function handleLoadAll() {
  const glob = new Glob("**/*.ts");
  const loaded: string[] = [];

  for await (const file of glob.scan(projectDir)) {
    if (shouldSkip(file)) continue;
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
  const namespaces: Record<string, string[]> = {};
  const typeNamespaces: Record<string, string[]> = {};
  const stateTypes: string[] = [];

  for await (const file of glob.scan(projectDir)) {
    if (shouldSkip(file) && !file.endsWith("/state.ts")) continue;
    if (!file.includes("/")) continue;
    for (const dir of skipDirs) { if (file.startsWith(dir + "/")) continue; }

    const parts = file.replace(/\.ts$/, "").split("/");
    const ns = parts[0];
    const name = parts.slice(1).join("_");

    if (name === "state") {
      stateTypes.push(`    ${ns}: import("./${ns}/state").State;`);
      continue;
    }

    // _type suffix → global type declaration
    if (name.endsWith("_type")) {
      const typeName = name.replace(/_type$/, "");
      if (!typeNamespaces[ns]) typeNamespaces[ns] = [];
      typeNamespaces[ns].push(`      ${typeName}: typeof import("./${file.replace(/\.ts$/, "")}").default;`);
      continue;
    }

    if (!namespaces[ns]) namespaces[ns] = [];
    namespaces[ns].push(`    ${name}: typeof import("./${file.replace(/\.ts$/, "")}").default;`);
  }

  // --- ctx_ns.d.ts ---
  const lines: string[] = [];
  for (const [ns, members] of Object.entries(namespaces).sort()) {
    members.sort();
    lines.push(`  ${ns}: {`);
    lines.push(...members);
    lines.push(`  };`);
  }

  // Types namespace
  if (Object.keys(typeNamespaces).length > 0) {
    lines.push(`  types: {`);
    for (const [ns, members] of Object.entries(typeNamespaces).sort()) {
      members.sort();
      lines.push(`    ${ns}: {`);
      lines.push(...members);
      lines.push(`    };`);
    }
    lines.push(`  };`);
  }

  stateTypes.sort();
  lines.push(`  state: {`);
  lines.push(...stateTypes);
  lines.push(`    [key: string]: any;`);
  lines.push(`  };`);

  let content = `// Auto-generated by load_all — do not edit\nexport default interface CtxNs {\n${lines.join("\n")}\n}\n`;

  // Global type declarations from _type files
  if (Object.keys(typeNamespaces).length > 0) {
    const globalLines: string[] = ["", "declare global {", "  namespace types {"];
    for (const [ns, members] of Object.entries(typeNamespaces).sort()) {
      globalLines.push(`    namespace ${ns} {`);
      for (const member of members) {
        const match = member.match(/^\s+(\w+):/);
        if (match) {
          globalLines.push(`      type ${match[1]} = import("./${ns}/${match[1]}_type").${match[1]};`);
        }
      }
      globalLines.push("    }");
    }
    globalLines.push("  }", "}");
    content += globalLines.join("\n") + "\n";
  }

  await Bun.write(resolve(projectDir, "ctx_ns.d.ts"), content);

  // --- test_ctx.ts ---
  const imports: string[] = [];
  const nsBuilders: Record<string, string[]> = {};

  for (const [ns, members] of Object.entries(namespaces).sort()) {
    nsBuilders[ns] = [];
    for (const member of members) {
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
    `    env: { ...process.env },`,
    ...ctxLines,
    `  } as any;`,
    `  _system_start(ctx, { env: "test" });`,
    `  return ctx;`,
    `}`,
    ``,
  ].join("\n");

  await Bun.write(resolve(projectDir, "test_ctx.ts"), testCtx);
}

// --- Live reload via file watcher ---
function notifyClients() {
  if (!ctx.state.ws_clients) return;
  const msg = JSON.stringify({ type: "reload" });
  for (const ws of ctx.state.ws_clients) {
    try { ws.send(msg); } catch { ctx.state.ws_clients.delete(ws); }
  }
}

let watchDebounce: any = null;
watch(projectDir, { recursive: true }, (event, relativePath) => {
  if (!relativePath || !relativePath.endsWith(".ts")) return;
  if (relativePath.endsWith(".test.ts") || relativePath.endsWith(".tmp.ts") || relativePath.endsWith(".d.ts")) return;
  for (const dir of skipDirs) { if (relativePath.startsWith(dir + "/")) return; }
  if (!relativePath.includes("/")) return;
  if (watchDebounce) clearTimeout(watchDebounce);
  watchDebounce = setTimeout(async () => {
    try {
      const result = await loadFile(relativePath);
      if (result) {
        console.log(`[livereload] ${result.ns}.${result.name}`);
        notifyClients();
      }
    } catch (e: any) {
      console.error(`[livereload] ${relativePath}: ${e.message}`);
    }
  }, 200);
});

// --- REPL server ---
const server = Bun.serve({
  port: Number(process.env.REPL_PORT) || 3001,
  async fetch(req) {
    if (req.method !== "POST") {
      return new Response("POST /repl", { status: 405 });
    }

    try {
      const body: any = await req.json();

      if (body.op === "load_all") {
        const res = await handleLoadAll();
        notifyClients();
        return Response.json(res);
      }

      if (body.op === "reload") {
        const res = await handleReload(body.path);
        notifyClients();
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

import { resolve, dirname } from "path";
import { Glob } from "bun";
import ctx from "./ctx";

const session: any = {};
const projectDir = resolve(".");
const skip = new Set(["ctx.ts", "repl-proc-start.ts", "repl_send.ts", "reload_all.ts"]);

function extractName(path: string): string {
  const file = path.split("/").pop() || "";
  return file.replace(/\.ts$/, "");
}

async function bustImports(filePath: string): Promise<string> {
  const t = Date.now();
  const source = await Bun.file(filePath).text();
  const dir = dirname(filePath);
  // rewrite relative imports: import X from "./Y" → import X from "/abs/Y.ts?t=..."
  const rewritten = source.replace(
    /from\s+["'](\.[^"']+)["']/g,
    (match, rel) => {
      const dep = resolve(dir, rel.endsWith(".ts") ? rel : rel + ".ts");
      return `from "${dep}?t=${t}"`;
    }
  );
  // write to temp file and import that
  const tmpPath = `${filePath}.tmp.ts`;
  await Bun.write(tmpPath, rewritten);
  return tmpPath;
}

async function handleReload(path: string) {
  const abs = resolve(path.endsWith(".ts") ? path : path + ".ts");
  const tmpPath = await bustImports(abs);
  const mod = await import(`${tmpPath}?t=${Date.now()}`);
  await Bun.file(tmpPath).exists() && (await Bun.$`rm ${tmpPath}`.quiet());
  const name = extractName(path);
  ctx.fns[name] = mod.default;

  // auto-register http_ files as routes
  if (name.startsWith("http_")) {
    if (!ctx.routes) ctx.routes = {};
    const pattern = name.slice(4).replace(/_/g, "/"); // http_user_$id → /user/$id
    ctx.routes[pattern] = mod.default;
    return { ok: true, name, route: pattern, path: abs };
  }

  return { ok: true, name, path: abs };
}

async function handleEval(code: string) {
  const names = Object.keys(ctx.fns);
  const values = Object.values(ctx.fns);
  const fn = new Function(...names, "ctx", "session", `return (async () => (${code}))()`);
  const result = await fn(...values, ctx, session);
  return { result };
}

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    if (req.method !== "POST") {
      return new Response("POST /repl", { status: 405 });
    }

    try {
      const body = await req.json();

      if (body.op === "reload_all") {
        const res = await handleReloadAll();
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

// reload all .ts files with fresh imports
async function handleReloadAll() {
  const glob = new Glob("*.ts");
  const loaded: string[] = [];
  for await (const file of glob.scan(projectDir)) {
    if (file.endsWith(".test.ts") || file.endsWith(".tmp.ts") || skip.has(file)) continue;
    try {
      const abs = resolve(projectDir, file);
      const tmpPath = await bustImports(abs);
      const mod = await import(`${tmpPath}?t=${Date.now()}`);
      await Bun.$`rm -f ${tmpPath}`.quiet();
      if (!mod.default) continue;
      const name = file.replace(/\.ts$/, "");
      ctx.fns[name] = mod.default;
      if (name.startsWith("http_")) {
        if (!ctx.routes) ctx.routes = {};
        ctx.routes[name.slice(4).replace(/_/g, "/")] = mod.default;
      }
      loaded.push(name);
    } catch {}
  }
  return { loaded, count: loaded.length };
}

console.log(`repl server on http://localhost:${server.port}`);

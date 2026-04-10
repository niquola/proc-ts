import { resolve } from "path";
import { Glob } from "bun";

export default async function reload_all(ctx: any) {
  const glob = new Glob("*.ts");
  const skip = ["ctx.ts", "repl-proc-start.ts", "repl_send.ts", "reload_all.ts"];
  const loaded: string[] = [];

  for await (const file of glob.scan(".")) {
    if (file.endsWith(".test.ts")) continue;
    if (skip.includes(file)) continue;
    const abs = resolve(file);
    const mod = await import(`${abs}?t=${Date.now()}`);
    if (!mod.default) continue;
    const name = file.replace(/\.ts$/, "");
    ctx.fns[name] = mod.default;
    if (name.startsWith("http_")) {
      if (!ctx.routes) ctx.routes = {};
      const pattern = name.slice(4).replace(/_/g, "/");
      ctx.routes[pattern] = mod.default;
    }
    loaded.push(name);
  }

  return { loaded, count: loaded.length };
}

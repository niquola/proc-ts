export default function start(ctx: Ctx, opts: { port?: number; env?: string } = {}) {
  const env = opts.env || "dev";
  const port = opts.port || 3002;

  ctx.db.start(ctx, env === "test" ? ":memory:" : "data.db");
  ctx.db.migrate(ctx);

  if (env !== "test") {
    ctx.server.start(ctx, port);
  }

  return "system started";
}

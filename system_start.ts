export default function system_start(ctx: Ctx, opts: { port?: number; env?: string } = {}) {
  const { db_start, db_migrate, server_start } = ctx.fns;
  const env = opts.env || "dev";
  const port = opts.port || 3002;

  db_start(ctx, env === "test" ? ":memory:" : "data.db");
  db_migrate(ctx);

  if (env !== "test") {
    server_start(ctx, port);
  }

  return "system started";
}

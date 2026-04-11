export default function system_stop(ctx: Ctx) {
  const { server_stop, db_stop } = ctx.fns;
  server_stop(ctx);
  db_stop(ctx);
  return "system stopped";
}

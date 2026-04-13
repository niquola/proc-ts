export default function stop(ctx: Ctx) {
  ctx.server.stop(ctx);
  ctx.db.stop(ctx);
  return "system stopped";
}

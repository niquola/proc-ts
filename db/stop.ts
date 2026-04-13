export default function stop(ctx: Ctx) {
  if (!ctx.state.db) return "no db open";
  ctx.state.db.close();
  ctx.state.db = null;
  return "db closed";
}

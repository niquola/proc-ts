export default function db_stop(ctx: any) {
  if (!ctx.db) return "no db open";
  ctx.db.close();
  ctx.db = null;
  return "db closed";
}

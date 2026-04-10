export default function db_query(ctx: any, sql: string, params: any[] = []) {
  ctx.lastQuery = sql;
  const stmt = ctx.db.prepare(sql);
  if (sql.trim().toUpperCase().startsWith("SELECT")) {
    return stmt.all(...params);
  }
  return stmt.run(...params);
}

export default function db_query<T = any>(ctx: Ctx, sql: string, params: any[] = []): T[] {
  const stmt = ctx.db!.prepare(sql);
  return stmt.all(...params) as T[];
}

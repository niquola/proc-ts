export default function query<T = any>(ctx: Ctx, sql: string, params: any[] = []): T[] {
  return ctx.state.db!.prepare(sql).all(...params) as T[];
}

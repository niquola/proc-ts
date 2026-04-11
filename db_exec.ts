export type ExecResult = { changes: number; lastInsertRowid: number };

export default function db_exec(ctx: Ctx, sql: string, params: any[] = []): ExecResult {
  const stmt = ctx.db!.prepare(sql);
  return stmt.run(...params) as ExecResult;
}

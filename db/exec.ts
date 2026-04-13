export type ExecResult = { changes: number; lastInsertRowid: number };

export default function exec(ctx: Ctx, sql: string, params: any[] = []): ExecResult {
  return ctx.state[__ns].prepare(sql).run(...params) as ExecResult;
}

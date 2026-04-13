import { Database } from "bun:sqlite";

export default function start(ctx: Ctx, path: string = "data.db") {
  ctx.state.db = new Database(path);
  ctx.state.db.exec("PRAGMA journal_mode = WAL");
  return `db opened: ${path}`;
}

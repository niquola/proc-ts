import { Database } from "bun:sqlite";
export default function db_start(ctx: Ctx, path: string = "data.db") {
  ctx.db = new Database(path);
  ctx.db.exec("PRAGMA journal_mode = WAL");
  return `db opened: ${path}`;
}

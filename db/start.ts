import { Database } from "bun:sqlite";

export default function start(ctx: Ctx, path: string = "data.db") {
  ctx.state[__ns] = new Database(path);
  ctx.state[__ns].exec("PRAGMA journal_mode = WAL");
  return `db opened: ${path}`;
}

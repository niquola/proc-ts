import db_start from "./db_start";
import db_query from "./db_query";
import server_start from "./server_start";

export default function system_start(ctx: any, port: number = 3002) {
  db_start(ctx);
  db_query(ctx, `CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0
  )`);
  server_start(ctx, port);
  return "system started";
}

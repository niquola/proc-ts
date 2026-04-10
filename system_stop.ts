import server_stop from "./server_stop";
import db_stop from "./db_stop";

export default function system_stop(ctx: any) {
  server_stop(ctx);
  db_stop(ctx);
  return "system stopped";
}

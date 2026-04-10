import type { Database } from "bun:sqlite";
import type { Server } from "bun";

export type Ctx = {
  fns: Record<string, Function>;
  routes: Record<string, Function>;
  db: Database | null;
  server: Server | null;
  [key: string]: any;
}

const ctx: Ctx = { fns: {}, routes: {}, db: null, server: null };
export default ctx;

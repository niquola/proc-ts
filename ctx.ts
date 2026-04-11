import type { Database } from "bun:sqlite";
import type { Server } from "bun";

export type CtxFns = import("./ctx_fns").default;

export type Ctx = {
  fns: CtxFns;
  routes: Record<string, Function>;
  db: Database | null;
  server: Server<any> | null;
  state: Record<string, any>;
  t: any;
}

export type Req = Request & {
  params: Record<string, string>;
}


export type Session = {
  user: { id: number; username: string } | null;
  token: string | null;
}

declare global {
  type Ctx = import("./ctx").Ctx;
  type Req = import("./ctx").Req;
  type Session = import("./ctx").Session;
}

const ctx: Ctx = { fns: {} as CtxFns, routes: {}, db: null, server: null, state: {}, t: null };
export default ctx;

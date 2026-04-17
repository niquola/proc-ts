import type { Server } from "bun";
export type CtxNs = import("./ctx_ns").default;

export type Ctx = CtxNs & {
  routes: Record<string, Function>;
  env: Record<string, string | undefined>;
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
  var __ns: string;
  var __name: string;
}

const ctx: Ctx = { routes: {}, state: {}, env: process.env, t: null } as Ctx;
export default ctx;

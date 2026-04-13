import type { Database } from "bun:sqlite";
import type { Server } from "bun";

export type CtxNs = import("./ctx_ns").default;

export type Ctx = CtxNs & {
  routes: Record<string, Function>;
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
  const __ns: string;
  const __name: string;
}

const ctx: Ctx = { routes: {}, state: {}, t: null } as Ctx;
export default ctx;

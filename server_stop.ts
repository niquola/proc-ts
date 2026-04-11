export default function server_stop(ctx: Ctx) {
  if (!ctx.server) return "no server running";
  ctx.server.stop();
  ctx.server = null;
  return "server stopped";
}

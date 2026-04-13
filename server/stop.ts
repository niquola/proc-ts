export default function stop(ctx: Ctx) {
  if (!ctx.state.server) return "no server running";
  ctx.state.server.stop();
  ctx.state.server = null;
  return "server stopped";
}

export default function stop(ctx: Ctx) {
  if (!ctx.state[__ns]) return "no server running";
  ctx.state[__ns].stop();
  ctx.state[__ns] = null;
  return "server stopped";
}

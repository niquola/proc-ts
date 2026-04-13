export default function stop(ctx: Ctx) {
  if (!ctx.state[__ns]) return "no db open";
  ctx.state[__ns].close();
  ctx.state[__ns] = null;
  return "db closed";
}

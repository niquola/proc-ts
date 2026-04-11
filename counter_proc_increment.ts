export default function counter_proc_increment(ctx: Ctx) {
  ctx.state.counter = (ctx.state.counter || 0) + 1;
  return ctx.state.counter;
}

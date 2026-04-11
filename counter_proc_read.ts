export default function counter_proc_read(ctx: Ctx) {
  return ctx.state.counter || 0;
}

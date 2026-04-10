export default function counter_proc_increment(ctx: any) {
  ctx.counter = (ctx.counter || 0) + 1;
  return ctx.counter;
}

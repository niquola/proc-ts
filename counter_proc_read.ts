export default function counter_proc_read(ctx: any) {
  return ctx.counter || 0;
}

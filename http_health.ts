export default function http_health(ctx: any, session: any, request: any) {
  return Response.json({ status: "ok", counter: ctx.counter || 0 });
}

export default function http_health(ctx: Ctx, session: Session, request: Req) {
  return Response.json({ status: "ok", counter: ctx.state.counter || 0 });
}

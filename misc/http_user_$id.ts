export default function http_user_$id(ctx: Ctx, session: Session, request: Req) {
  const { id } = request.params;
  return Response.json({ user: id });
}

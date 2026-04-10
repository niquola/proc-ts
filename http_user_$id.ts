export default function http_user_$id(ctx: any, session: any, request: any) {
  const { id } = request.params;
  return Response.json({ user: id });
}

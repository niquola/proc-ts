export default async function ui(ctx: Ctx, session: Session, request: Req) {
  return new Response(null, {
    status: 302,
    headers: { "Location": "/ui/issues" }
  });
}

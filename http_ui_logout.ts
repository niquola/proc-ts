export default function http_ui_logout(ctx: Ctx, session: Session, request: Req) {
  const { db_exec } = ctx.fns;

  if (session.token) {
    db_exec(ctx, "DELETE FROM sessions WHERE token = ?", [session.token]);
  }

  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/ui/login",
      "Set-Cookie": "session=; Path=/; HttpOnly; Max-Age=0"
    }
  });
}

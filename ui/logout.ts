export default function logout(ctx: Ctx, session: Session, request: Req) {
  if (session.token) {
    ctx.db.exec(ctx, "DELETE FROM sessions WHERE token = ?", [session.token]);
  }

  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/ui/login",
      "Set-Cookie": "session=; Path=/; HttpOnly; Max-Age=0"
    }
  });
}

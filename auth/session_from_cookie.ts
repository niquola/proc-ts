export default function session_from_cookie(ctx: Ctx, req: Request): Session {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/session=([^;]+)/);
  const token = match ? match[1] : null;

  if (!token) return { user: null, token: null };

  const rows = ctx.db.query(ctx, `
    SELECT u.id, u.username FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `, [token]);

  if (rows.length === 0) return { user: null, token: null };

  return { user: { id: rows[0].id, username: rows[0].username }, token };
}

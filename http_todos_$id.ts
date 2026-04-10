import db_query from "./db_query";

export default async function http_todos_$id(ctx: any, session: any, request: any) {
  const { id } = request.params;
  if (request.req.method === "GET") {
    const rows = db_query(ctx, "SELECT * FROM todos WHERE id = ?", [id]);
    if (rows.length === 0) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(rows[0]);
  }
  if (request.req.method === "PATCH") {
    const body = await request.req.json();
    if (body.title !== undefined) db_query(ctx, "UPDATE todos SET title = ? WHERE id = ?", [body.title, id]);
    if (body.done !== undefined) db_query(ctx, "UPDATE todos SET done = ? WHERE id = ?", [body.done ? 1 : 0, id]);
    const rows = db_query(ctx, "SELECT * FROM todos WHERE id = ?", [id]);
    if (rows.length === 0) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(rows[0]);
  }
  if (request.req.method === "DELETE") {
    db_query(ctx, "DELETE FROM todos WHERE id = ?", [id]);
    return Response.json({ ok: true });
  }
  return new Response("method not allowed", { status: 405 });
}

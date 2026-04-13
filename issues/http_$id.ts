export default async function http_issues_$id(ctx: Ctx, session: Session, request: Req) {
  const { query, exec } = ctx.db;
  const id = parseInt(request.params.id);

  if (request.method === "GET") {
    const issues = query(ctx, "SELECT * FROM issues WHERE id = ?", [id]);
    if (issues.length === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json(issues[0]);
  }

  if (request.method === "PATCH") {
    const body: any = await request.json();

    const existing = query(ctx, "SELECT * FROM issues WHERE id = ?", [id]);
    if (existing.length === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (body.title !== undefined) {
      updates.push("title = ?");
      params.push(body.title);
    }
    if (body.description !== undefined) {
      updates.push("description = ?");
      params.push(body.description);
    }
    if (body.status !== undefined) {
      updates.push("status = ?");
      params.push(body.status);
    }

    if (updates.length > 0) {
      params.push(id);
      exec(ctx, `UPDATE issues SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    const issues = query(ctx, "SELECT * FROM issues WHERE id = ?", [id]);
    return Response.json(issues[0]);
  }

  if (request.method === "DELETE") {
    const result = exec(ctx, "DELETE FROM issues WHERE id = ?", [id]);
    if (result.changes === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ message: "Deleted" });
  }
}

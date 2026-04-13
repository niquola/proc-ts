export default async function http_issues(ctx: Ctx, session: Session, request: Req) {
  const { query, exec } = ctx.db;
  if (request.method === "GET") {
    const issues = query(ctx, "SELECT * FROM issues ORDER BY id DESC");
    return Response.json(issues);
  }

  if (request.method === "POST") {
    const body: any = await request.json();

    if (!body.title || typeof body.title !== "string" || body.title.trim() === "") {
      return Response.json({ error: "title is required" }, { status: 400 });
    }

    const result = exec(ctx, "INSERT INTO issues (title, description, status) VALUES (?, ?, ?)", [
      body.title.trim(),
      body.description || "",
      body.status || "open"
    ]);

    return Response.json({ id: result.lastInsertRowid, title: body.title.trim(), description: body.description || "", status: body.status || "open" }, { status: 201 });
  }
}

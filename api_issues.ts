export default async function api_issues(ctx: Ctx, session: Session, request: Req) {
  const { db_query, db_exec } = ctx.fns;
  if (request.method === "POST") {
    const formData = await request.formData();
    const title = formData.get("title");
    const description = formData.get("description") || "";
    const status = formData.get("status") || "open";

    if (!title || (typeof title === "string" && title.trim() === "")) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }

    const result = db_exec(ctx, "INSERT INTO issues (title, description, status) VALUES (?, ?, ?)", [
      typeof title === "string" ? title.trim() : title,
      description,
      status
    ]);

    return new Response(null, {
      status: 302,
      headers: { "Location": `/ui/issues/${result.lastInsertRowid}` }
    });
  }
}

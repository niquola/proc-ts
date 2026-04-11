export default async function api_issues_$id_comments(ctx: Ctx, session: Session, request: Req) {
  const { db_exec } = ctx.fns;
  const id = parseInt(request.params.id);

  if (request.method === "POST") {
    const formData = await request.formData();
    const body = formData.get("body");

    if (body && typeof body === "string" && body.trim() !== "") {
      db_exec(ctx, "INSERT INTO comments (issue_id, body) VALUES (?, ?)", [id, body.trim()]);
    }

    return new Response(null, {
      status: 302,
      headers: { "Location": `/ui/issues/${id}` }
    });
  }
}

export default async function api_issues_$id(ctx: Ctx, session: Session, request: Req) {
  const { db_exec } = ctx.fns;
  const id = parseInt(request.params.id);

  if (request.method === "POST") {
    const formData = await request.formData();

    const updates: string[] = [];
    const params: any[] = [];

    if (formData.has("title")) {
      updates.push("title = ?");
      params.push(formData.get("title"));
    }
    if (formData.has("description")) {
      updates.push("description = ?");
      params.push(formData.get("description"));
    }

    if (updates.length > 0) {
      params.push(id);
      db_exec(ctx, `UPDATE issues SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    return new Response(null, {
      status: 302,
      headers: { "Location": `/ui/issues/${id}` }
    });
  }
}

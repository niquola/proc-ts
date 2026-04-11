export default async function api_issues_$id_status(ctx: Ctx, session: Session, request: Req) {
  const { db_exec } = ctx.fns;
  const id = parseInt(request.params.id);

  if (request.method === "POST") {
    const formData = await request.formData();
    const status = formData.get("status");

    if (status) {
      db_exec(ctx, "UPDATE issues SET status = ? WHERE id = ?", [status, id]);
    }

    return new Response(null, {
      status: 302,
      headers: { "Location": `/ui/issues/${id}` }
    });
  }
}

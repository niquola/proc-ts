export default async function api_issues_$id_delete(ctx: Ctx, session: Session, request: Req) {
  const { exec } = ctx.db;
  const id = parseInt(request.params.id);

  if (request.method === "POST") {
    exec(ctx, "DELETE FROM issues WHERE id = ?", [id]);

    return new Response(null, {
      status: 302,
      headers: { "Location": "/ui/issues" }
    });
  }
}

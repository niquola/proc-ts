export default async function issues_$id_edit(ctx: Ctx, session: Session, request: Req) {
  const { query } = ctx.db;
  const { layout, escapeHtml } = ctx.ui;
  const id = parseInt(request.params.id);

  if (request.method === "GET") {
    const issues = query(ctx, "SELECT * FROM issues WHERE id = ?", [id]);
    if (issues.length === 0) {
      return new Response("Not found", { status: 404 });
    }

    const issue = issues[0];

    const body = `
    <a href="/ui/issues/${issue.id}" class="text-sm text-blue-600 hover:underline">&larr; Back</a>

    <h1 class="text-xl font-bold mt-4 mb-4">Edit Issue</h1>

    <form method="POST" action="/api/issues/${issue.id}" class="bg-white rounded-lg border p-4">
      <div class="mb-3">
        <label class="block text-sm font-medium mb-1">Title</label>
        <input type="text" name="title" value="${escapeHtml(issue.title)}" required
          class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
      </div>
      <div class="mb-3">
        <label class="block text-sm font-medium mb-1">Description</label>
        <textarea name="description" rows="4"
          class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">${escapeHtml(issue.description || "")}</textarea>
      </div>
      <div class="flex gap-3">
        <button type="submit"
          class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Save</button>
        <a href="/ui/issues/${issue.id}"
          class="px-4 py-2 border rounded-md text-sm hover:bg-gray-50">Cancel</a>
      </div>
    </form>`;

    const fullHtml = await layout(ctx, session, request, body);
    return new Response(fullHtml, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

export default async function issues_$id(ctx: Ctx, session: Session, request: Req) {
  const { query } = ctx.db;
  const { layout, escapeHtml } = ctx.ui;
  const id = parseInt(request.params.id);

  if (request.method === "GET") {
    const issues = query(ctx, "SELECT * FROM issues WHERE id = ?", [id]);
    if (issues.length === 0) {
      return new Response("Not found", { status: 404 });
    }

    const issue = issues[0];
    const comments = query(ctx, "SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC", [id]);

    const statusClass = (s: string) =>
      s === 'open' ? 'bg-green-100 text-green-800' :
      s === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
      'bg-gray-100 text-gray-600';

    const body = `
    <a href="/ui/issues" class="text-sm text-blue-600 hover:underline">&larr; All issues</a>

    <div class="mt-4 bg-white rounded-lg border p-6">
      <div class="flex items-start justify-between">
        <h1 class="text-xl font-bold">${escapeHtml(issue.title)}</h1>
        <span class="text-xs text-gray-400">#${issue.id}</span>
      </div>

      ${issue.description ? `<p class="mt-2 text-gray-600">${escapeHtml(issue.description)}</p>` : ''}

      <div class="mt-4 flex items-center gap-4 text-sm">
        <span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(issue.status)}">${escapeHtml(issue.status)}</span>
        <span class="text-gray-400">${issue.created_at}</span>
      </div>

      <div class="mt-4 pt-4 border-t flex items-center gap-3">
        <form method="POST" action="/api/issues/${issue.id}/status" class="flex items-center gap-2">
          <select name="status" class="text-sm border rounded-md px-2 py-1">
            <option value="open" ${issue.status === 'open' ? 'selected' : ''}>Open</option>
            <option value="in_progress" ${issue.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="done" ${issue.status === 'done' ? 'selected' : ''}>Done</option>
          </select>
          <button type="submit" class="text-sm text-blue-600 hover:underline">Update</button>
        </form>
        <a href="/ui/issues/${issue.id}/edit" class="text-sm text-blue-600 hover:underline">Edit</a>
        <form method="POST" action="/api/issues/${issue.id}/delete"
          onsubmit="return confirm('Delete this issue?')">
          <button type="submit" class="text-sm text-red-600 hover:underline">Delete</button>
        </form>
      </div>
    </div>

    <div class="mt-6">
      <h2 class="text-lg font-semibold mb-3">Comments (${comments.length})</h2>

      ${comments.length > 0 ? comments.map((c: any) => `
        <div class="bg-white rounded-lg border p-4 mb-2">
          <p class="text-sm">${escapeHtml(c.body)}</p>
          <span class="text-xs text-gray-400 mt-1 block">${c.created_at}</span>
        </div>
      `).join("") : '<p class="text-sm text-gray-400 mb-4">No comments yet</p>'}

      <form method="POST" action="/api/issues/${issue.id}/comments" class="mt-3">
        <textarea name="body" rows="2" required placeholder="Add a comment..."
          class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
        <button type="submit"
          class="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Comment</button>
      </form>
    </div>`;

    const fullHtml = await layout(ctx, session, request, body);
    return new Response(fullHtml, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

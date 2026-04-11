export default async function http_ui_issues(ctx: Ctx, session: Session, request: Req) {
  const { db_query, layout, escapeHtml } = ctx.fns;

  const issues = db_query(ctx, "SELECT * FROM issues ORDER BY id DESC");

  const body = `
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Issues</h1>
    </div>

    <form method="POST" action="/api/issues" class="bg-white rounded-lg border p-4 mb-6">
      <div class="mb-3">
        <label class="block text-sm font-medium mb-1">Title</label>
        <input type="text" name="title" required
          class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
      </div>
      <div class="mb-3">
        <label class="block text-sm font-medium mb-1">Description</label>
        <textarea name="description" rows="2"
          class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
      </div>
      <button type="submit"
        class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Create Issue</button>
    </form>

    <div class="space-y-2">
      ${issues.map((issue: any) => `
        <a href="/ui/issues/${issue.id}" class="block bg-white rounded-lg border p-4 hover:border-blue-400 transition-colors">
          <div class="flex items-center gap-3">
            <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium
              ${issue.status === 'open' ? 'bg-green-100 text-green-800' : ''}
              ${issue.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : ''}
              ${issue.status === 'done' ? 'bg-gray-100 text-gray-600' : ''}
            ">${escapeHtml(issue.status)}</span>
            <span class="font-medium">${escapeHtml(issue.title)}</span>
            <span class="ml-auto text-xs text-gray-400">#${issue.id}</span>
          </div>
          ${issue.description ? `<p class="mt-1 text-sm text-gray-500 truncate">${escapeHtml(issue.description)}</p>` : ''}
        </a>
      `).join("")}
      ${issues.length === 0 ? '<p class="text-gray-400 text-center py-8">No issues yet</p>' : ''}
    </div>`;

  const html = await layout(ctx, session, request, body);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

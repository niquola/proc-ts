export default async function layout(ctx: Ctx, session: Session, request: Req, body: string) {
  const { escapeHtml } = ctx.ui;
  const userNav = session.user
    ? `<span class="text-sm text-gray-600">${escapeHtml(session.user.username)}</span>
       <a href="/ui/logout" class="text-sm text-red-600 hover:underline">Logout</a>`
    : `<a href="/ui/login" class="text-sm text-blue-600 hover:underline">Login</a>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Issue Tracker</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-900">
  <div class="max-w-3xl mx-auto px-4 py-8">
    <nav class="flex items-center justify-between mb-6 pb-4 border-b">
      <a href="/ui/issues" class="font-semibold text-gray-800">Issues</a>
      <div class="flex items-center gap-4">${userNav}</div>
    </nav>
    ${body}
  </div>
</body>
</html>`;
}

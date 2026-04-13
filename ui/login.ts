export default async function login(ctx: Ctx, session: Session, request: Req) {
  const { query, exec } = ctx.db;
  const { layout } = ctx.ui;

  if (request.method === "POST") {
    const formData = await request.formData();
    const username = (formData.get("username") as string || "").trim();
    const password = formData.get("password") as string || "";
    const action = formData.get("action") as string;

    if (!username || !password) {
      return renderForm(ctx, session, request, "Username and password required");
    }

    if (action === "register") {
      const existing = query(ctx, "SELECT id FROM users WHERE username = ?", [username]);
      if (existing.length > 0) {
        return renderForm(ctx, session, request, "Username already taken");
      }
      const hash = await Bun.password.hash(password);
      exec(ctx, "INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, hash]);
    }

    const users = query(ctx, "SELECT * FROM users WHERE username = ?", [username]);
    if (users.length === 0) {
      return renderForm(ctx, session, request, "Invalid credentials");
    }

    const valid = await Bun.password.verify(password, users[0].password_hash);
    if (!valid) {
      return renderForm(ctx, session, request, "Invalid credentials");
    }

    const token = crypto.randomUUID();
    exec(ctx, "INSERT INTO sessions (token, user_id) VALUES (?, ?)", [token, users[0].id]);

    return new Response(null, {
      status: 302,
      headers: {
        "Location": "/ui/issues",
        "Set-Cookie": `session=${token}; Path=/; HttpOnly`
      }
    });
  }

  if (session.user) {
    return new Response(null, { status: 302, headers: { "Location": "/ui/issues" } });
  }

  return renderForm(ctx, session, request, null);
}

async function renderForm(ctx: Ctx, session: Session, request: Req, error: string | null) {
  const { layout } = ctx.ui;

  const body = `
    <h1 class="text-2xl font-bold mb-6">Login</h1>

    ${error ? `<div class="bg-red-50 text-red-700 px-4 py-2 rounded-md mb-4">${error}</div>` : ''}

    <form method="POST" class="bg-white rounded-lg border p-6 space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Username</label>
        <input type="text" name="username" value="admin" required autofocus
          class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Password</label>
        <input type="password" name="password" value="admin" required
          class="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
      </div>
      <div class="flex gap-3">
        <button type="submit" name="action" value="login"
          class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Login</button>
        <button type="submit" name="action" value="register"
          class="border px-4 py-2 rounded-md text-sm hover:bg-gray-50">Register</button>
      </div>
    </form>`;

  const html = await layout(ctx, session, request, body);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

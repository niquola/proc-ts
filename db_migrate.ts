export default function db_migrate(ctx: Ctx) {
  const { db_query, db_exec } = ctx.fns;

  db_exec(ctx, `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  )`);
  db_exec(ctx, `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  db_exec(ctx, `CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db_exec(ctx, `CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
  )`);

  // Seed admin user
  const existing = db_query(ctx, "SELECT id FROM users WHERE username = 'admin'");
  if (existing.length === 0) {
    const hash = Bun.password.hashSync("admin");
    db_exec(ctx, "INSERT INTO users (username, password_hash) VALUES (?, ?)", ["admin", hash]);
  }

  return "migrations done";
}

import db_query from "./db_query";

export default async function http_todos(ctx: any, session: any, request: any) {
  if (request.req.method === "GET") {
    const todos = db_query(ctx, "SELECT * FROM todos");
    return Response.json(todos);
  }
  if (request.req.method === "POST") {
    const body = await request.req.json();
    const result = db_query(ctx, "INSERT INTO todos (title) VALUES (?)", [body.title]);
    return Response.json({ id: result.lastInsertRowid, title: body.title, done: 0 }, { status: 201 });
  }
  return new Response("method not allowed", { status: 405 });
}

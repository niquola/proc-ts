export default function server_start(ctx: any, port: number = 3000) {
  if (!ctx.routes) ctx.routes = {};

  ctx.server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const parts = url.pathname.split("/").filter(Boolean);

      // match routes: try from most specific to least
      // e.g. /user/123 tries "user_$id", then "user"
      for (const [pattern, handler] of Object.entries(ctx.routes) as any) {
        const patternParts = pattern.split("/").filter(Boolean);
        if (patternParts.length !== parts.length) continue;

        const params: Record<string, string> = {};
        let match = true;
        for (let i = 0; i < patternParts.length; i++) {
          if (patternParts[i].startsWith("$")) {
            params[patternParts[i].slice(1)] = parts[i];
          } else if (patternParts[i] !== parts[i]) {
            match = false;
            break;
          }
        }

        if (match) {
          const session = {};
          return await handler(ctx, session, { req, params, url });
        }
      }

      return new Response("not found", { status: 404 });
    },
  });

  return `server started on port ${ctx.server.port}`;
}

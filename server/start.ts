export default function start(ctx: Ctx, port: number = 3000) {
  if (!ctx.routes) ctx.routes = {};

  const publicPaths = ["/ui/login", "/health"];

  ctx.state[__ns] = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const parts = url.pathname.split("/").filter(Boolean);

      for (const [pattern, handler] of Object.entries(ctx.routes) as any) {
        const patternParts = pattern.split("/").filter(Boolean);
        if (patternParts.length !== parts.length) continue;

        const params: Record<string, string> = {};
        let match = true;
        for (let i = 0; i < patternParts.length; i++) {
          if (patternParts[i]!.startsWith("$")) {
            params[patternParts[i]!.slice(1)] = parts[i]!;
          } else if (patternParts[i] !== parts[i]) {
            match = false;
            break;
          }
        }

        if (match) {
          (req as any).params = params;
          const session = ctx.auth.session_from_cookie(ctx, req);

          if (!session.user && !publicPaths.includes(pattern)) {
            return new Response(null, { status: 302, headers: { "Location": "/ui/login" } });
          }

          return await handler(ctx, session, req);
        }
      }

      return new Response("not found", { status: 404 });
    },
  });

  return `server started on port ${ctx.state[__ns].port}`;
}

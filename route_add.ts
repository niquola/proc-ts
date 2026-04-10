export default function route_add(ctx: any, pattern: string, handler: Function) {
  if (!ctx.routes) ctx.routes = {};
  ctx.routes[pattern] = handler;
  return `route added: ${pattern}`;
}

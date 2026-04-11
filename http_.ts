export default async function http_(ctx: Ctx, session: Session, request: Req) {
  const source = await Bun.file("README.md").text();
  // strip frontmatter
  const md = source.replace(/^---[\s\S]*?---\n/, "");
  const body = Bun.markdown.html(md);
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>proc-ts</title>
<style>body{max-width:800px;margin:0 auto;padding:2rem;font-family:system-ui;line-height:1.6}
pre{background:#f4f4f4;padding:1rem;overflow-x:auto;border-radius:4px}
code{background:#f4f4f4;padding:0.2em 0.4em;border-radius:3px}
pre code{background:none;padding:0}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ddd;padding:0.5rem;text-align:left}
th{background:#f4f4f4}</style>
</head><body>${body}</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

const args = process.argv.slice(2);

// First arg can be env name: dev (default) or test
let env = "dev";
if (args[0] === "dev" || args[0] === "test") {
  env = args.shift()!;
}

const [op, arg] = args;

if (!op) {
  console.log("Usage: bun repl_send.ts [dev|test] load_all | reload <path> | eval '<code>'");
  process.exit(1);
}

let body: any;
if (op === "load_all") {
  body = { op: "load_all" };
} else if (op === "reload") {
  if (!arg) { console.log("reload requires path"); process.exit(1); }
  body = { op: "reload", path: arg.endsWith(".ts") ? arg : `${arg}.ts` };
} else if (op === "eval") {
  if (!arg) { console.log("eval requires code"); process.exit(1); }
  body = { op: "eval", code: arg };
} else {
  console.log("Unknown op:", op);
  process.exit(1);
}

const ports: Record<string, string> = {
  dev: process.env.REPL_PORT || "3001",
  test: process.env.TEST_REPL_PORT || "3003",
};
const replPort = ports[env];

const res = await fetch(`http://localhost:${replPort}/repl`, {
  method: "POST",
  body: JSON.stringify(body),
});

const data = await res.json();
console.log(JSON.stringify(data, null, 2));

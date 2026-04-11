const [op, arg] = process.argv.slice(2);

if (!op) {
  console.log("Usage: bun repl_send.ts load_all | reload <fn_name> | eval '<code>'");
  process.exit(1);
}

let body: any;
if (op === "load_all") {
  body = { op: "load_all" };
} else if (op === "reload") {
  if (!arg) { console.log("reload requires fn_name"); process.exit(1); }
  body = { op: "reload", path: `./${arg}.ts` };
} else if (op === "eval") {
  if (!arg) { console.log("eval requires code"); process.exit(1); }
  body = { op: "eval", code: arg };
} else {
  console.log("Unknown op:", op);
  process.exit(1);
}

const res = await fetch("http://localhost:3001/repl", {
  method: "POST",
  body: JSON.stringify(body),
});

const data = await res.json();
console.log(JSON.stringify(data, null, 2));

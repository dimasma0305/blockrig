// Tiny static server for the demo and screenshots: node scripts/serve.mjs [port]
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(".");
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".mesh": "application/octet-stream" };

export function serve(port = 8787) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://x");
      let p = normalize(join(root, decodeURIComponent(url.pathname)));
      if (!p.startsWith(root)) { res.writeHead(403).end(); return; }
      if (p.endsWith("\\") || p.endsWith("/")) p = join(p, "index.html");
      const body = await readFile(p);
      res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream", "cache-control": "no-store" }).end(body);
    } catch { res.writeHead(404).end("not found"); }
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok(server)));
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("serve.mjs")) {
  const port = +(process.argv[2] || 8787);
  await serve(port);
  console.log(`blockrig demo: http://127.0.0.1:${port}/examples/`);
}

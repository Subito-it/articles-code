import http from "http";
import httpProxy from "http-proxy";
import config from "./config.js";
import { resolve } from "./utils/routing.js";

const proxy = httpProxy.createProxyServer({ xfwd: true });

proxy.on("error", (err, req, res) => {
  console.error(`[ERROR] ${req.method} ${req.url} → ${err.message}`);
  res.writeHead(502, { "Content-Type": "text/plain" });
  res.end(`502 Bad Gateway — is the app running?\n\n${err.message}`);
});

const server = http.createServer((req, res) => {
  const result = resolve(req);

  if (!result) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`404 — no matching route for ${req.url}`);
    return;
  }

  console.log(`[PROXY] ${req.method} ${req.url} → ${result.app} (${result.target})`);
  proxy.web(req, res, { target: result.target, changeOrigin: true });
});

// WebSocket support (needed for Next.js HMR)
server.on("upgrade", (req, socket, head) => {
  const result = resolve(req);
  if (!result) { socket.destroy(); return; }
  proxy.ws(req, socket, head, { target: result.target });
});

server.listen(config.proxyPort, "127.0.0.1", () => {
  console.log(`\nProxy listening on http://localhost:${config.proxyPort}\n`);
  for (const [app, port] of Object.entries(config.apps)) {
    console.log(`  ${app.padEnd(15)} → http://127.0.0.1:${port}`);
  }
  console.log();
});

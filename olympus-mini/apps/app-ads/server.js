import http from "http";

const PORT = 3002;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
    <h1>app-ads</h1>
    <p>Running on port ${PORT} served via proxy at /ads/*</p>
    <p>You reached: ${req.url}</p>
    <a href="/">Back to app-search</a>
  `);
}).listen(PORT, () => console.log(`app-ads on http://127.0.0.1:${PORT}`));

import http from "http";

const PORT = 3001;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
    <h1>app-search</h1>
    <p>Running on port ${PORT} served via proxy at /</p>
    <ul>
      <li><a href="/ads/123">Go to app-ads /ads/123</a></li>
      <li><a href="/profile/me">Go to app-profile /profile/me</a></li>
    </ul>
  `);
}).listen(PORT, () => console.log(`app-search on http://127.0.0.1:${PORT}`));

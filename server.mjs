import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const name = decodeURIComponent(url.pathname) === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1);
    if (!['index.html', 'app.js', 'core.js', 'ai-core.js', 'styles.css', 'favicon.svg', 'previous-version.html'].includes(name)) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(name)], 'Cache-Control': 'no-store' });
    res.end(await readFile(path.join(root, name)));
  } catch { res.writeHead(500); res.end('Cannot read local page'); }
});
const requestedPort = Number(process.argv[2]);
const port = Number.isInteger(requestedPort) && requestedPort >= 1024 && requestedPort <= 65535 ? requestedPort : 4173;
server.listen(port, '127.0.0.1', () => console.log(`有数本地预览：http://127.0.0.1:${port}/`));

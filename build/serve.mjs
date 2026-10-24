// Servidor estático mínimo para revisar dist/ en local (solo built-ins). No usar en producción.
// Uso: node build/serve.mjs [puerto]   -> http://localhost:4173
// Comprime con gzip los textos (como GitHub Pages) para que Lighthouse en local mida lo mismo.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { DIST_DIR } from './config.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};
const port = Number(process.argv[2]) || 4173;

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.normalize(path.join(DIST_DIR, urlPath));
  if (!file.startsWith(DIST_DIR)) { res.writeHead(400).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!urlPath.endsWith('/')) { res.writeHead(301, { Location: `${urlPath}/` }).end(); return; }
    file = path.join(file, 'index.html');
  }
  let status = 200;
  if (!fs.existsSync(file)) { status = 404; file = path.join(DIST_DIR, '404.html'); }
  const type = TYPES[path.extname(file)] || 'application/octet-stream';
  const gzip = /^(text|application\/(json|xml|javascript))|svg/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  const headers = { 'Content-Type': type, 'Cache-Control': 'max-age=600' };
  if (gzip) { headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'; }
  res.writeHead(status, headers);
  const stream = fs.createReadStream(file);
  (gzip ? stream.pipe(zlib.createGzip()) : stream).pipe(res);
}).listen(port, () => console.log(`[serve] dist/ en http://localhost:${port}`));

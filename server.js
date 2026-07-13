// Minimal static file server for the built dist/ folder.
// Zero dependencies — used as the container start command so hosting
// platforms have nothing to misconfigure.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.txt':  'text/plain',
};

const handler = async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    // Prevent path traversal; strip leading slashes after normalize
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    if (path === '' || path === '.') path = 'index.html';

    let file, ext;
    try {
      file = await readFile(join(DIST, path));
      ext  = extname(path);
    } catch {
      // SPA fallback: serve index.html for unknown paths
      file = await readFile(join(DIST, 'index.html'));
      ext  = '.html';
    }

    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(file);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal server error');
  }
};

// The hosting platform doesn't tell us which port its proxy targets, so
// listen on every common candidate. Ports that can't bind are skipped.
const CANDIDATES = [...new Set([PORT, 80, 3000, 4173, 5000, 8000, 8080])];
for (const port of CANDIDATES) {
  const server = createServer(handler);
  server.on('error', err => console.log(`Port ${port} unavailable (${err.code})`));
  server.listen(port, '0.0.0.0', () => console.log(`Serving dist/ on 0.0.0.0:${port}`));
}

#!/usr/bin/env node
/**
 * Static file server for Playwright remote-catalog e2e (ADR-0010 layout).
 * Serves tests/fixtures/remote-catalog at http://127.0.0.1:5199/
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, 'remote-catalog');
const port = Number(process.env.E2E_REMOTE_CATALOG_PORT || 5199);
const host = process.env.E2E_REMOTE_CATALOG_HOST || '127.0.0.1';

const MIME = {
  '.json': 'application/json; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
};

/** In-memory latest pointer so e2e can publish a revision without touching files Vite watches. */
let latestOverride = null;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = decodeURIComponent((req.url || '/').split('?')[0] || '/');
  if (urlPath === '/__e2e/latest') {
    if (req.method === 'POST') {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8').trim();
        latestOverride = body.length > 0 ? body : null;
        res.writeHead(204);
        res.end();
      });
      return;
    }
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  if (latestOverride && urlPath === '/latest/manifest.json') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(latestOverride);
    return;
  }
  const relative = urlPath.replace(/^\/+/, '');
  const filePath = path.normalize(path.join(root, relative));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`missing: ${relative}`);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`remote-catalog fixture listening on http://${host}:${port}/`);
});

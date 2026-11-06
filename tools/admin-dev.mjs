#!/usr/bin/env node
/** Serve apps/admin-web on :8090 and proxy /v2 to a local Nakama (same origin, like Caddy on the server). */
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
const ROOT = new URL('../apps/admin-web/', import.meta.url).pathname;
const BANK = new URL('../apps/admin/bank.json', import.meta.url).pathname;
const NAKAMA = process.env.NAKAMA ?? 'http://127.0.0.1:7350';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
http.createServer(async (req, res) => {
  if (req.url.startsWith('/v2/')) {
    const body = await new Promise((r) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => r(Buffer.concat(c))); });
    const up = await fetch(NAKAMA + req.url, { method: req.method, headers: { 'content-type': 'application/json', authorization: req.headers.authorization ?? '' }, body: req.method === 'GET' ? undefined : body });
    res.writeHead(up.status, { 'content-type': 'application/json' }); res.end(Buffer.from(await up.arrayBuffer())); return;
  }
  const p = req.url.split('?')[0];
  const f = p === '/bank.json' ? BANK : join(ROOT, p === '/' ? 'index.html' : p);
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f));
}).listen(Number(process.env.PORT ?? 8090), () => console.log('admin dev on http://localhost:' + (process.env.PORT ?? 8090)));

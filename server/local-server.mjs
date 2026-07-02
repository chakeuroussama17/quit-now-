/**
 * Local dev proxy: `node server/local-server.mjs` (reads OPENAI_API_KEY from
 * the repo's gitignored .env). Point the app at it with
 * EXPO_PUBLIC_AI_PROXY_URL=http://<your-LAN-IP>:3001
 * (Android emulator can use http://10.0.2.2:3001).
 */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { completeChat } from './lib/complete.mjs';

// Minimal .env loader — no dependencies.
if (!process.env.OPENAI_API_KEY) {
  try {
    const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    // no .env — completeChat will report the missing key
  }
}

const PORT = Number(process.env.PORT || 3001);

createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }
  if (req.method !== 'POST' || !req.url?.startsWith('/api/chat')) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
    return;
  }
  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', async () => {
    try {
      const body = JSON.parse(raw || '{}');
      const { status, payload } = await completeChat(body, process.env.OPENAI_API_KEY);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    } catch (err) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'server_error', detail: String(err).slice(0, 200) }));
    }
  });
}).listen(PORT, () => {
  console.log(`Exhale AI proxy listening on http://localhost:${PORT}/api/chat`);
  console.log(`Key loaded: ${process.env.OPENAI_API_KEY ? 'yes' : 'NO — set it in .env'}`);
});

/**
 * Dev-only: cross-origin-isolation proxy for the Expo web dev server.
 *
 * expo-sqlite runs on web through wa-sqlite, whose worker needs
 * SharedArrayBuffer — which browsers only expose on a "cross-origin isolated"
 * page (COOP: same-origin + COEP: require-corp). Expo's dev server does not
 * send those headers, and it ignores Metro's `server.enhanceMiddleware`.
 *
 * This tiny proxy sits in front of it and adds them, so the browser gets a
 * working SQLite. Hot reload keeps working (WebSocket upgrades are proxied).
 *
 *   Terminal 1:  npx expo start --web --port 8081
 *   Terminal 2:  node scripts/web-coi-proxy.js
 *   Browser:     http://localhost:8090
 *
 * Native builds are completely unaffected by this file.
 */
const http = require('node:http');

const TARGET_PORT = Number(process.env.TARGET_PORT ?? 8081);
const LISTEN_PORT = Number(process.env.PORT ?? 8090);
const TARGET_HOST = 'localhost';

const ISOLATION_HEADERS = {
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-embedder-policy': 'require-corp',
  // Everything we serve is same-origin, but be explicit for the worker/wasm.
  'cross-origin-resource-policy': 'cross-origin',
};

const server = http.createServer((req, res) => {
  // A browser tab closing mid-response resets the socket. Swallow it — an
  // unhandled 'error' event would take the whole proxy down.
  req.on('error', () => {});
  res.on('error', () => {});

  const proxied = http.request(
    {
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${TARGET_HOST}:${TARGET_PORT}` },
    },
    (upstream) => {
      upstream.on('error', () => {});
      res.writeHead(upstream.statusCode ?? 502, {
        ...upstream.headers,
        ...ISOLATION_HEADERS,
      });
      upstream.pipe(res);
    },
  );

  proxied.on('error', (err) => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`Dev server not reachable on :${TARGET_PORT}\n${err.message}`);
  });

  req.pipe(proxied);
});

// Malformed/aborted requests must never crash the process.
server.on('clientError', (_err, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

// Metro's HMR / dev-client channels ride on WebSockets — pass upgrades through.
server.on('upgrade', (req, socket, head) => {
  socket.on('error', () => {});

  const proxied = http.request({
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${TARGET_HOST}:${TARGET_PORT}` },
  });

  proxied.on('upgrade', (upstreamRes, upstreamSocket, upstreamHead) => {
    upstreamSocket.on('error', () => {});
    const lines = Object.entries(upstreamRes.headers).map(([k, v]) => `${k}: ${v}`);
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${lines.join('\r\n')}\r\n\r\n`);
    if (upstreamHead?.length) socket.unshift(upstreamHead);
    upstreamSocket.pipe(socket).on('error', () => {});
    socket.pipe(upstreamSocket).on('error', () => {});
  });

  proxied.on('error', () => socket.destroy());
  if (head?.length) proxied.write(head);
  proxied.end();
});

// Last line of defence: a dev proxy should log and keep serving, never die.
process.on('uncaughtException', (err) => {
  console.warn('[web-coi-proxy] ignored:', err.message);
});

server.listen(LISTEN_PORT, () => {
  console.log(`Cross-origin-isolated proxy: http://localhost:${LISTEN_PORT}`);
  console.log(`  → forwarding to Expo web on :${TARGET_PORT}`);
});

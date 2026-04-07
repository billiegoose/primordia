// scripts/reverse-proxy.ts
// Lightweight HTTP reverse proxy for zero-downtime blue/green deploys.
//
// Listens on REVERSE_PROXY_PORT (default 3000) and forwards all traffic to
// the upstream port defined in proxy-upstream.json in the primordia-worktrees
// directory. The upstream port is updated atomically during accepts, so traffic
// switches to the new production server with no dropped connections.

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const LISTEN_PORT = parseInt(process.env.REVERSE_PROXY_PORT ?? '3000', 10);
const WORKTREES_DIR =
  process.env.PRIMORDIA_WORKTREES_DIR ?? '/home/exedev/primordia-worktrees';
const CONFIG_PATH = path.join(WORKTREES_DIR, 'proxy-upstream.json');

let upstreamPort = 3001;

function readConfig(): void {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as { port: number };
    if (typeof parsed.port === 'number' && parsed.port > 0 && parsed.port !== upstreamPort) {
      console.log(`[proxy] upstream port: ${upstreamPort} → ${parsed.port}`);
      upstreamPort = parsed.port;
    }
  } catch {
    // Config not yet written — keep current value
  }
}

readConfig();

// Watch config file for changes; retry until the file exists
function watchConfig(): void {
  try {
    fs.watch(CONFIG_PATH, () => setTimeout(readConfig, 50));
  } catch {
    setTimeout(watchConfig, 1000);
  }
}
watchConfig();

// Safety-net poll every 5 s in case fs.watch misses an event
setInterval(readConfig, 5000);

const server = http.createServer((clientReq, clientRes) => {
  const options: http.RequestOptions = {
    hostname: '127.0.0.1',
    port: upstreamPort,
    path: clientReq.url,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      'x-forwarded-for': clientReq.socket.remoteAddress ?? '',
      'x-forwarded-proto': 'http',
    },
  };

  const upstreamReq = http.request(options, (upstreamRes) => {
    clientRes.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
    upstreamRes.pipe(clientRes);
  });

  upstreamReq.on('error', (err) => {
    console.error(`[proxy] upstream error on port ${upstreamPort}:`, err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'content-type': 'text/plain' });
      clientRes.end('Bad Gateway — upstream server unavailable\n');
    }
  });

  clientReq.pipe(upstreamReq);
});

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(
    `[proxy] listening on :${LISTEN_PORT} → upstream :${upstreamPort} (config: ${CONFIG_PATH})`,
  );
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

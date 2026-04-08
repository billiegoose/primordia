// server.ts
// Custom Next.js dev server.
//
// Next.js route handlers are HTTP-only — they cannot upgrade connections to
// WebSocket. Preview dev servers run with NEXT_BASE_PATH=/preview/{sessionId}
// and their HMR client tries to open a WebSocket at:
//
//   ws://{host}/preview/{sessionId}/_next/webpack-hmr
//
// Without WebSocket proxying, that connection silently fails, which prevents
// React from hydrating client components — so buttons and other interactive
// elements stop working.
//
// This server intercepts WebSocket upgrade requests and pipes those matching
// /preview/{sessionId}/... to the correct preview dev server port. All other
// upgrade requests (e.g. the main app's own HMR) are forwarded to Next.js's
// built-in upgrade handler.
//
// In production, `next start` is used instead — this file is dev-only.

import { createServer } from 'http';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import next from 'next';
import { parse } from 'url';
import net from 'net';

const hostname = process.env.HOSTNAME ?? 'localhost';
const port = parseInt(process.env.PORT ?? '3000', 10);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const app = next({ dev: true, hostname, port, turbopack: true } as any);
const handle = app.getRequestHandler();

void app.prepare().then(() => {
  const upgradeHandler = app.getUpgradeHandler();

  const server = createServer(async (req, res) => {
    try {
      await handle(req, res, parse(req.url!, true));
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    void handleUpgrade(req, socket, head, upgradeHandler);
  });

  server.listen(port, hostname, () => {
    console.log(`\x1b[32m✓\x1b[0m Starting on http://${hostname}:${port}`);
  });
});

async function handleUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  nextUpgradeHandler: (req: IncomingMessage, socket: Duplex, head: Buffer) => void,
): Promise<void> {
  const url = req.url ?? '';

  // The main server's basePath is always empty — only preview dev servers have
  // NEXT_BASE_PATH set. Preview WebSocket paths look like:
  //   /preview/{sessionId}/_next/webpack-hmr
  const mainBasePath = process.env.NEXT_BASE_PATH ?? '';
  const previewPrefix = `${mainBasePath}/preview/`;

  if (url.startsWith(previewPrefix)) {
    const rest = url.slice(previewPrefix.length);
    const slashIdx = rest.indexOf('/');
    const sessionId = slashIdx !== -1 ? rest.slice(0, slashIdx) : rest;

    if (sessionId) {
      try {
        const { getDb } = await import('./lib/db');
        const db = await getDb();
        const session = await db.getEvolveSession(sessionId);

        if (session?.port != null) {
          proxyWebSocket(req, socket, head, session.port);
          return;
        }
      } catch {
        // DB error or session not found — fall through to destroy
      }
    }

    // No session or no port yet — close the WebSocket handshake gracefully.
    socket.destroy();
    return;
  }

  // Not a preview path — hand off to Next.js's built-in upgrade handler,
  // which takes care of the main app's own HMR WebSocket.
  nextUpgradeHandler(req, socket, head);
}

/**
 * Pipes a WebSocket upgrade connection through to a local preview dev server.
 *
 * We open a raw TCP connection to the target port and replay the original
 * HTTP upgrade request headers, then pipe both sockets bidirectionally.
 * This is a transparent TCP tunnel — no WebSocket framing is parsed here.
 */
function proxyWebSocket(
  req: IncomingMessage,
  clientSocket: Duplex,
  head: Buffer,
  targetPort: number,
): void {
  const targetSocket = net.connect(targetPort, '127.0.0.1');

  targetSocket.on('connect', () => {
    // Re-send the upgrade request to the target with a corrected Host header.
    const headerLines: string[] = [
      `${req.method ?? 'GET'} ${req.url} HTTP/1.1`,
      `Host: 127.0.0.1:${targetPort}`,
    ];
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() === 'host') continue;
      const v = Array.isArray(value) ? value.join(', ') : (value ?? '');
      headerLines.push(`${key}: ${v}`);
    }
    targetSocket.write(headerLines.join('\r\n') + '\r\n\r\n');
    if (head.length > 0) targetSocket.write(head);
  });

  targetSocket.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => targetSocket.destroy());
  targetSocket.on('close', () => clientSocket.destroy());
  clientSocket.on('close', () => targetSocket.destroy());

  targetSocket.pipe(clientSocket);
  clientSocket.pipe(targetSocket);
}

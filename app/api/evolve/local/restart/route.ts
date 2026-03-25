// app/api/evolve/local/restart/route.ts
// Runs `bun install` then asks Next.js to restart the dev server.
//
// Called by the parent tab's AcceptRejectBar after it receives a
// "primordia:preview-accepted" postMessage from the closing preview window.
// Only available in development (NODE_ENV=development).

import { spawn } from 'child_process';

function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const outChunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    const proc = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stdout?.on('data', (d: Buffer) => outChunks.push(d));
    proc.stderr?.on('data', (d: Buffer) => errChunks.push(d));
    proc.on('close', (code) => {
      resolve({
        code: code ?? 0,
        stdout: Buffer.concat(outChunks).toString(),
        stderr: Buffer.concat(errChunks).toString(),
      });
    });
  });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return Response.json(
      { error: 'Only available in development mode' },
      { status: 403 },
    );
  }

  // Determine the server origin from the incoming request URL so we can call
  // /__nextjs_restart_dev on the same host:port after bun install finishes.
  const { origin } = new URL(request.url);

  // Schedule the work after sending the response. This ensures the browser
  // gets its 200 OK before the dev server potentially restarts mid-flight.
  setTimeout(async () => {
    // Install any new/updated packages introduced by the merged changes.
    await runCommand('bun', ['install'], process.cwd());

    // Ask Next.js to restart the dev server. The response may never arrive if
    // the server restarts quickly enough — that's expected, so errors are swallowed.
    try {
      await fetch(`${origin}/__nextjs_restart_dev`, { method: 'POST' });
    } catch {
      // Server restarted before responding — normal behaviour.
    }
  }, 200);

  return Response.json({ ok: true });
}

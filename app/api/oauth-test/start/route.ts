// app/api/oauth-test/start/route.ts
// POST { command?: string[] } — kills any running session and spawns a new one.

import { startSession } from "@/lib/oauth-test-session";

export async function POST(request: Request) {
  let command: string[] = ["claude"];
  try {
    const body = await request.json();
    if (Array.isArray(body.command) && body.command.length > 0) {
      command = body.command;
    }
  } catch {
    // no body or invalid JSON → use default
  }

  startSession(command);
  return Response.json({ ok: true });
}

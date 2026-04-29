// app/api/oauth-test/credentials/route.ts
// GET — reads $USER_CLAUDE_DIR/.credentials.json (or ~/.claude/.credentials.json)
// and returns its contents.

import { readCredentials } from "@/lib/oauth-test-session";

export async function GET() {
  const raw = readCredentials();
  if (!raw) {
    return Response.json({ credentials: null });
  }
  try {
    const parsed = JSON.parse(raw);
    return Response.json({ credentials: parsed });
  } catch {
    return Response.json({ credentials: raw });
  }
}

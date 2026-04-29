// app/api/oauth-test/submit/route.ts
// POST { code: string } — writes the verification code to the process stdin.

import { submitCode } from "@/lib/oauth-test-session";

export async function POST(request: Request) {
  let code: string;
  try {
    const body = await request.json();
    code = body.code;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!code || typeof code !== "string") {
    return Response.json({ error: "code is required" }, { status: 400 });
  }

  try {
    submitCode(code);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}

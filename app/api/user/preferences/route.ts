// app/api/user/preferences/route.ts
// Per-user key-value preferences stored in the database.
//
// GET  ?keys=key1,key2   → { prefs: Record<string, string> }
// PATCH                  → body: { prefs: Record<string, string> } → 204

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { getDb } from "../../../../lib/db/index";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keysParam = req.nextUrl.searchParams.get("keys") ?? "";
  const keys = keysParam
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const db = await getDb();
  const prefs = await db.getUserPreferences(user.id, keys);
  return NextResponse.json({ prefs });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).prefs !== "object" ||
    (body as Record<string, unknown>).prefs === null
  ) {
    return NextResponse.json({ error: "Body must be { prefs: Record<string,string> }" }, { status: 400 });
  }

  const rawPrefs = (body as { prefs: Record<string, unknown> }).prefs;
  const prefs: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawPrefs)) {
    if (typeof v === "string") prefs[k] = v;
  }

  if (Object.keys(prefs).length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  const db = await getDb();
  await db.setUserPreferences(user.id, prefs);
  return new NextResponse(null, { status: 204 });
}

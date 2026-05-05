// app/api/events/route.ts — single write endpoint for user events
// POST: append one event (browser, server, agent workers)
// GET:  query events (admin only, for the event log viewer)

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

// ── POST /api/events ──────────────────────────────────────────────────────────

export interface AppendEventBody {
  /** Versioned event name, e.g. "file-attachment-removed/v1" */
  event: string;
  /** Optional structured props (must be JSON-serialisable) */
  props?: Record<string, unknown> | null;
  /**
   * Optional user_id override.
   * When called from the browser the server reads the session automatically.
   * When called from a worker (no session cookie), pass the user_id explicitly.
   */
  userId?: string | null;
}

export async function POST(req: NextRequest) {
  let body: AppendEventBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.event || typeof body.event !== "string") {
    return NextResponse.json({ error: "event required" }, { status: 400 });
  }

  // Resolve user_id: prefer session cookie, then explicit body field.
  const sessionUser = await getSessionUser();
  const userId = sessionUser?.id ?? body.userId ?? null;

  const db = await getDb();
  const id = await db.appendEvent({
    userId,
    event: body.event,
    props: body.props ?? null,
  });

  return NextResponse.json({ id }, { status: 201 });
}

// ── GET /api/events ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const limit  = Math.min(Number(searchParams.get("limit")  ?? 100), 500);
  const offset = Number(searchParams.get("offset") ?? 0);
  const event  = searchParams.get("event")  ?? undefined;
  const userId = searchParams.get("userId") ?? undefined;

  const db = await getDb();
  const [rows, total] = await Promise.all([
    db.queryEvents({ limit, offset, event, userId }),
    db.countEvents({ event, userId }),
  ]);

  return NextResponse.json({ rows, total, limit, offset });
}

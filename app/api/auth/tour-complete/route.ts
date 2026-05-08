// app/api/auth/tour-complete/route.ts — Mark the onboarding tour as completed or skipped.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { trackEvent } from "@/lib/events-client";

const PREF_TOUR_COMPLETED = "tour:completed";

/**
 * Mark tour complete
 * @description Records that the current user has completed or skipped the onboarding tour.
 * @tag Auth
 */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as { skipped?: boolean; atStep?: number };
    const db = await getDb();
    await db.setUserPreferences(user.id, { [PREF_TOUR_COMPLETED]: "true" });
    if (body.skipped) {
      await trackEvent("tour/skipped/v1", { userId: user.id, atStep: body.atStep ?? 0 });
    } else {
      await trackEvent("tour/completed/v1", { userId: user.id });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

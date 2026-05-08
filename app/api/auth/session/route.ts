// app/api/auth/session/route.ts — Returns the currently logged-in user (or null).
import { NextResponse } from "next/server";
import { getSessionUser, isAdmin, hasEvolvePermission } from "@/lib/auth";
import { getDb } from "@/lib/db";

const PREF_TOUR_COMPLETED = "tour:completed";

/**
 * Get current session
 * @description Returns the currently authenticated user, or null if no session exists.
 * @tag Auth
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ user: null });
    const db = await getDb();
    const [adminCheck, evolveCheck, prefs] = await Promise.all([
      isAdmin(user.id),
      hasEvolvePermission(user.id),
      db.getUserPreferences(user.id, [PREF_TOUR_COMPLETED]),
    ]);
    const tourCompleted = prefs[PREF_TOUR_COMPLETED] === "true";
    return NextResponse.json({ user: { id: user.id, username: user.username, isAdmin: adminCheck, canEvolve: evolveCheck, tourCompleted } });
  } catch {
    return NextResponse.json({ user: null });
  }
}

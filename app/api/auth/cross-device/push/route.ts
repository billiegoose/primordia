// app/api/auth/cross-device/push/route.ts
// Creates a pre-approved cross-device token for the "push" sign-in flow.
//
// Unlike the pull flow (where the new device creates a pending token and waits
// for the logged-in device to approve), the push flow is initiated by the
// already-authenticated device from the hamburger menu. The token is created in
// "approved" state with the caller's userId.
//
// AES key transfer no longer goes through the server. The client embeds the
// keys in the URL fragment when generating the QR code client-side. Fragments
// are never sent to the server, so the keys stay off-server entirely.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/index";
import { generateId, getSessionUser } from "@/lib/auth";

// Same TTL as pull tokens — 10 minutes to scan the QR code.
const CROSS_DEVICE_TOKEN_TTL_MS = 10 * 60 * 1000;

/**
 * Start a "push" cross-device sign-in from the already-authenticated device.
 * @description Creates a pre-approved token. The scanning device uses
 *   GET /api/auth/cross-device/poll to receive the session cookie.
 *   Requires an active session.
 * @tag Auth
 */
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = await getDb();
    const tokenId = generateId();

    await db.createCrossDeviceToken({
      id: tokenId,
      // Pre-approved: the scanning device gets a session immediately on first poll.
      status: "approved",
      userId: user.id,
      expiresAt: Date.now() + CROSS_DEVICE_TOKEN_TTL_MS,
      encryptedCredentials: null,
    });

    // Clean up old tokens opportunistically.
    await db.deleteExpiredCrossDeviceTokens();

    return NextResponse.json({ tokenId });
  } catch (err) {
    console.error("[cross-device/push]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

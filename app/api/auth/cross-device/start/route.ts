// app/api/auth/cross-device/start/route.ts
// Creates a new cross-device auth token.
// Called by the "requester" device (e.g. laptop) that wants to sign in.
// Returns a tokenId which the requester uses to display a QR code and poll.

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/index";
import { generateId } from "@/lib/auth";

// Tokens expire after 10 minutes — long enough to find your phone and scan.
const CROSS_DEVICE_TOKEN_TTL_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const tokenId = generateId();

    // Optional: requester's ephemeral ECDH public key for API-key encryption-key transfer.
    let requesterEcdhPublicKey: string | null = null;
    try {
      const body = (await request.json()) as { requesterEcdhPublicKey?: unknown };
      if (typeof body.requesterEcdhPublicKey === "string") {
        requesterEcdhPublicKey = body.requesterEcdhPublicKey;
      }
    } catch {
      // Empty or non-JSON body — no ECDH key provided, that's fine.
    }

    await db.createCrossDeviceToken({
      id: tokenId,
      status: "pending",
      userId: null,
      expiresAt: Date.now() + CROSS_DEVICE_TOKEN_TTL_MS,
      requesterEcdhPublicKey,
      approverEcdhPublicKey: null,
      wrappedAesKey: null,
    });

    // Clean up old tokens opportunistically.
    await db.deleteExpiredCrossDeviceTokens();

    return NextResponse.json({ tokenId });
  } catch (err) {
    console.error("[cross-device/start]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

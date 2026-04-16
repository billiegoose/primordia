// app/api/auth/cross-device/token-info/route.ts
// Returns public metadata about a pending cross-device token.
// Used by the approver device to retrieve the requester's ECDH public key
// so it can encrypt the AES storage key for transfer.
// Requires an active session (approver must be signed in).

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/index";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tokenId = request.nextUrl.searchParams.get("tokenId");
    if (!tokenId) {
      return NextResponse.json({ error: "Missing tokenId" }, { status: 400 });
    }

    const db = await getDb();
    const token = await db.getCrossDeviceToken(tokenId);

    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
    if (token.expiresAt < Date.now()) {
      return NextResponse.json({ error: "Token has expired" }, { status: 410 });
    }
    if (token.status !== "pending") {
      return NextResponse.json({ error: "Token already used" }, { status: 409 });
    }

    return NextResponse.json({
      requesterEcdhPublicKey: token.requesterEcdhPublicKey,
    });
  } catch (err) {
    console.error("[cross-device/token-info]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

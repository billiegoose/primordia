// app/api/instance/config/route.ts
// GET  — returns instance config (uuid7, name, description). Admin only.
// PATCH — updates name and/or description. Admin only.

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await getDb();
  const config = await db.getInstanceConfig();
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const { name, description } = body as Record<string, unknown>;
  const fields: { name?: string; description?: string } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
    }
    fields.name = name.trim();
  }
  if (description !== undefined) {
    if (typeof description !== "string") {
      return NextResponse.json({ error: "description must be a string" }, { status: 400 });
    }
    fields.description = description.trim();
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const db = await getDb();
  await db.setInstanceConfig(fields);
  const updated = await db.getInstanceConfig();
  return NextResponse.json(updated);
}

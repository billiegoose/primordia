// app/api/settings/presets/route.ts
// CRUD-ish storage for user-defined evolve presets.

import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import {
  BUILT_IN_PRESETS,
  PREF_CUSTOM_PRESETS,
  parseCustomPresets,
  serializeCustomPresets,
  normalizeAuthSource,
  type EvolvePreset,
} from '@/lib/presets';

function cleanPreset(input: unknown): EvolvePreset | null {
  if (!input || typeof input !== 'object') return null;
  const rec = input as Record<string, unknown>;
  const name = typeof rec.name === 'string' ? rec.name.trim() : '';
  const harness = typeof rec.harness === 'string' ? rec.harness.trim() : '';
  const model = typeof rec.model === 'string' ? rec.model.trim() : '';
  const authSource = typeof rec.authSource === 'string' ? normalizeAuthSource(rec.authSource) : null;
  const id = typeof rec.id === 'string' && rec.id.startsWith('custom:') ? rec.id : `custom:${crypto.randomUUID()}`;
  if (!name || !harness || !model || !authSource) return null;
  return { id, name, harness, model, authSource };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

  const db = await getDb();
  const prefs = await db.getUserPreferences(user.id, [PREF_CUSTOM_PRESETS]);
  return Response.json({ builtInPresets: BUILT_IN_PRESETS, customPresets: parseCustomPresets(prefs[PREF_CUSTOM_PRESETS]) });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const raw = (body && typeof body === 'object' && Array.isArray((body as Record<string, unknown>).customPresets))
    ? (body as { customPresets: unknown[] }).customPresets
    : null;
  if (!raw) return Response.json({ error: 'customPresets array required' }, { status: 400 });

  const customPresets = raw.map(cleanPreset);
  if (customPresets.some((p) => !p)) return Response.json({ error: 'Each preset needs name, authSource, harness, and model' }, { status: 400 });

  const db = await getDb();
  await db.setUserPreferences(user.id, { [PREF_CUSTOM_PRESETS]: serializeCustomPresets(customPresets as EvolvePreset[]) });
  return Response.json({ customPresets });
}

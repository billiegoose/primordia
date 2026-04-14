// lib/user-prefs.ts
// Server-side helpers for reading per-user preferences from the database.
// Intended to be called inside server components and API route handlers.

import { getDb } from "./db";
import {
  DEFAULT_HARNESS,
  DEFAULT_MODEL,
  HARNESS_OPTIONS,
  MODEL_OPTIONS_BY_HARNESS,
} from "./agent-config";

export const PREF_HARNESS = "evolve:preferred-harness";
export const PREF_MODEL = "evolve:preferred-model";

export interface EvolvePrefs {
  initialHarness: string;
  initialModel: string;
}

/**
 * Read the user's preferred evolve harness and model from the database.
 * Falls back to compile-time defaults if the preference is missing or
 * references an option that no longer exists.
 *
 * Safe to call in server components and route handlers — never throws.
 */
export async function getEvolvePrefs(userId: string): Promise<EvolvePrefs> {
  try {
    const db = await getDb();
    const prefs = await db.getUserPreferences(userId, [PREF_HARNESS, PREF_MODEL]);

    const harness = prefs[PREF_HARNESS];
    const model = prefs[PREF_MODEL];

    const validHarness =
      harness && HARNESS_OPTIONS.find((h) => h.id === harness) ? harness : DEFAULT_HARNESS;
    const validModel =
      model && MODEL_OPTIONS_BY_HARNESS[validHarness]?.find((m) => m.id === model)
        ? model
        : MODEL_OPTIONS_BY_HARNESS[validHarness]?.[0]?.id ?? DEFAULT_MODEL;

    return { initialHarness: validHarness, initialModel: validModel };
  } catch {
    return { initialHarness: DEFAULT_HARNESS, initialModel: DEFAULT_MODEL };
  }
}

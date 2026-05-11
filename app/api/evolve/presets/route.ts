// app/api/evolve/presets/route.ts
// Returns available evolve presets for current user.

import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import {
  BUILT_IN_PRESETS,
  PREF_CUSTOM_PRESETS,
  PREF_PRESET,
  parseCustomPresets,
  type EvolvePreset,
  type PresetAuthSource,
} from '@/lib/presets';

const SECRET_PREF_BY_AUTH_SOURCE: Partial<Record<PresetAuthSource, string>> = {
  'claude-subscription': 'encrypted_credentials',
  'chatgpt-subscription': 'encrypted_chatgpt_subscription_oauth',
  'openrouter-api-key': 'encrypted_openrouter_api_key',
  'anthropic-api-key': 'encrypted_api_key',
  'openai-api-key': 'encrypted_openai_api_key',
};

function isExeDevGatewayAvailable(): boolean {
  // Gateway needs no user secret. In exe.dev prod it exists; local dev may still
  // proxy it. Allow opt-out for installs that know gateway is unavailable.
  return process.env.EXE_DEV_GATEWAY_DISABLED !== '1';
}

function isPresetAvailable(preset: EvolvePreset, prefs: Record<string, string>): boolean {
  if (preset.authSource === 'exe-dev-gateway') return isExeDevGatewayAvailable();
  const prefKey = SECRET_PREF_BY_AUTH_SOURCE[preset.authSource];
  return !!(prefKey && prefs[prefKey]);
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

  const db = await getDb();
  const keys = [
    PREF_CUSTOM_PRESETS,
    PREF_PRESET,
    'encrypted_credentials',
    'encrypted_chatgpt_subscription_oauth',
    'encrypted_openrouter_api_key',
    'encrypted_api_key',
    'encrypted_openai_api_key',
  ];
  const prefs = await db.getUserPreferences(user.id, keys);
  const presets = [...BUILT_IN_PRESETS, ...parseCustomPresets(prefs[PREF_CUSTOM_PRESETS])];
  const availablePresets = presets.filter((preset) => isPresetAvailable(preset, prefs));
  const preferredPresetId = prefs[PREF_PRESET] || null;
  const selected = availablePresets.find((p) => p.id === preferredPresetId) ?? availablePresets[0] ?? null;

  return Response.json({ presets: availablePresets, selectedPresetId: selected?.id ?? null });
}

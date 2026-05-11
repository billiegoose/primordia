"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { withBasePath } from "@/lib/base-path";
import { HARNESS_OPTIONS } from "@/lib/agent-config";
import { PRESET_AUTH_SOURCE_LABELS, type EvolvePreset, type PresetAuthSource } from "@/lib/presets";
import { trackEvent } from "@/lib/events-client";

const AUTH_SOURCES = Object.keys(PRESET_AUTH_SOURCE_LABELS) as PresetAuthSource[];

function emptyPreset(): EvolvePreset {
  return {
    id: `custom:${crypto.randomUUID()}`,
    name: "New preset",
    authSource: "exe-dev-gateway",
    harness: "pi",
    model: "claude-sonnet-4-6",
  };
}

export default function PresetsSettingsClient() {
  const [builtIn, setBuiltIn] = useState<EvolvePreset[]>([]);
  const [custom, setCustom] = useState<EvolvePreset[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(withBasePath('/api/settings/presets'))
      .then((r) => r.json())
      .then((data: { builtInPresets?: EvolvePreset[]; customPresets?: EvolvePreset[] }) => {
        setBuiltIn(data.builtInPresets ?? []);
        setCustom(data.customPresets ?? []);
      })
      .catch(() => setMessage('Could not load presets.'));
  }, []);

  function updatePreset(id: string, patch: Partial<EvolvePreset>) {
    setCustom((prev) => prev.map((p) => p.id === id ? { ...p, ...patch } : p));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(withBasePath('/api/settings/presets'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customPresets: custom }),
      });
      const data = await res.json() as { customPresets?: EvolvePreset[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Save failed: ${res.status}`);
      setCustom(data.customPresets ?? custom);
      setMessage('Saved.');
      trackEvent('settings/presets-saved/v1', { count: custom.length });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-100">Presets</h1>
        <p className="text-sm text-gray-400 mt-1">Pick billing source + harness + model once, then switch by name in Evolve.</p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <h2 className="text-sm font-semibold text-gray-200 mb-3">Built-in presets</h2>
        <div className="grid gap-2">
          {builtIn.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2">
              <div className="text-sm text-gray-100">{p.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{PRESET_AUTH_SOURCE_LABELS[p.authSource]} · {p.harness} · {p.model}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-200">Custom presets</h2>
          <button type="button" onClick={() => setCustom((prev) => [...prev, emptyPreset()])} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-800">
            <Plus size={14} /> Add preset
          </button>
        </div>

        {custom.length === 0 ? (
          <p className="text-sm text-gray-500 border border-dashed border-gray-800 rounded-lg p-4">No custom presets yet.</p>
        ) : custom.map((p) => (
          <div key={p.id} className="grid gap-3 rounded-lg border border-gray-800 bg-gray-950/40 p-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Display name
              <input value={p.name} onChange={(e) => updatePreset(p.id, { name: e.target.value })} className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-amber-500" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Billing source
              <select value={p.authSource} onChange={(e) => updatePreset(p.id, { authSource: e.target.value as PresetAuthSource })} className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-amber-500">
                {AUTH_SOURCES.map((source) => <option key={source} value={source}>{PRESET_AUTH_SOURCE_LABELS[source]}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Harness
              <select value={p.harness} onChange={(e) => updatePreset(p.id, { harness: e.target.value })} className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-amber-500">
                {HARNESS_OPTIONS.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Model
              <input value={p.model} onChange={(e) => updatePreset(p.id, { model: e.target.value })} className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-amber-500" />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button type="button" onClick={() => setCustom((prev) => prev.filter((x) => x.id !== p.id))} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-950/30">
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50">{saving ? 'Saving…' : 'Save presets'}</button>
          {message && <span className="text-sm text-gray-400">{message}</span>}
        </div>
      </div>
    </section>
  );
}

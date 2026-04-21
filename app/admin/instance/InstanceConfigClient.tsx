"use client";
// app/admin/instance/InstanceConfigClient.tsx
// Client component: edit instance name + description; view graph nodes/edges.

import { useState } from "react";
import { withBasePath } from "@/lib/base-path";
import type { InstanceConfig, GraphNode, GraphEdge } from "@/lib/db/types";

interface Props {
  config: InstanceConfig;
  nodes: GraphNode[];
  edges: GraphEdge[];
  canonicalUrl: string;
}

export default function InstanceConfigClient({ config: initial, nodes, edges, canonicalUrl }: Props) {
  const [config, setConfig] = useState(initial);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(withBasePath("/api/instance/config"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMsg(`Error: ${data.error ?? res.statusText}`);
      } else {
        setConfig(data as InstanceConfig);
        setSaveMsg("Saved.");
      }
    } catch (e) {
      setSaveMsg(`Error: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  const jsonUrl = `${canonicalUrl}/.well-known/primordia.json`;

  return (
    <div className="space-y-8">
      {/* Identity */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Instance Identity</h2>
        <div className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">UUID v7 (read-only)</label>
            <div className="font-mono text-sm text-gray-300 bg-gray-900 border border-gray-700 rounded px-3 py-2 select-all">
              {config.uuid7}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {saveMsg && (
              <span className={`text-sm ${saveMsg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
                {saveMsg}
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Well-known URL</label>
            <a
              href={jsonUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-400 hover:underline break-all"
            >
              {jsonUrl}
            </a>
          </div>
        </div>
      </section>

      {/* Graph nodes */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Known Instances ({nodes.length})</h2>
        {nodes.length === 0 ? (
          <p className="text-sm text-gray-500">No peer instances have registered yet.</p>
        ) : (
          <div className="space-y-2">
            {nodes.map((n) => (
              <div key={n.uuid7} className="bg-gray-900 border border-gray-800 rounded p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium text-white">{n.name}</span>
                    {n.description && (
                      <span className="text-gray-400 ml-2">— {n.description}</span>
                    )}
                  </div>
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline shrink-0"
                  >
                    {n.url}
                  </a>
                </div>
                <div className="font-mono text-xs text-gray-600 mt-1">{n.uuid7}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Graph edges */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Graph Edges ({edges.length})</h2>
        {edges.length === 0 ? (
          <p className="text-sm text-gray-500">No edges yet.</p>
        ) : (
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="pb-2 pr-4">From</th>
                <th className="pb-2 pr-4">To</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {edges.map((e) => (
                <tr key={e.id} className="border-b border-gray-900 font-mono text-xs">
                  <td className="py-1 pr-4 text-gray-300">{e.from.slice(0, 8)}…</td>
                  <td className="py-1 pr-4 text-gray-300">{e.to.slice(0, 8)}…</td>
                  <td className="py-1 pr-4 text-gray-400">{e.type}</td>
                  <td className="py-1 text-gray-400">{e.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Registration instructions */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-2">Register a Child Instance</h2>
        <p className="text-sm text-gray-400 mb-2">
          POST to <code className="text-blue-400">{canonicalUrl}/api/instance/register</code> with:
        </p>
        <pre className="bg-gray-900 border border-gray-800 rounded p-3 text-xs text-gray-300 overflow-auto">
{JSON.stringify({ uuid7: "<child-uuid7>", url: "<child-url>", name: "<child-name>", description: "(optional)" }, null, 2)}
        </pre>
      </section>
    </div>
  );
}

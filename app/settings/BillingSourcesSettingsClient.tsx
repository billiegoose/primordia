"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AuthSourceIcon } from "@/components/AgentIdentity";
import { withBasePath } from "@/lib/base-path";
import ApiKeySettingsClient from "./ApiKeySettingsClient";
import CredentialsSettingsClient from "./subscriptions/CredentialsSettingsClient";
import ChatGptSubscriptionSettingsClient from "./subscriptions/ChatGptSubscriptionSettingsClient";

function StatusPill({ active }: { active: boolean }) {
  return active ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 border border-green-800/50">
      Active
    </span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">
      Not connected
    </span>
  );
}

function BillingSourceItem({
  title,
  description,
  icon,
  active,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  active: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900/30 transition-colors">
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left bg-gray-800/50 hover:bg-gray-800 transition-colors"
      >
        <span className="mt-0.5 shrink-0 text-gray-400">
          {open ? <ChevronDown size={16} strokeWidth={2} /> : <ChevronRight size={16} strokeWidth={2} />}
        </span>
        <span className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-100">{title}</span>
            <StatusPill active={active} />
          </span>
          <span className="block text-xs text-gray-500 mt-1">{description}</span>
        </span>
      </button>
      {open && (
        <div className="border-t border-gray-700/50 bg-gray-950/30 p-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function BillingSourcesSettingsClient() {
  const [types, setTypes] = useState<string[]>([]);

  useEffect(() => {
    async function loadSecretStatus() {
      try {
        const res = await fetch(withBasePath("/api/secrets"));
        if (!res.ok) return;
        const data = (await res.json()) as { types?: string[] };
        setTypes(data.types ?? []);
      } catch {}
    }
    void loadSecretStatus();
  }, []);

  const apiKeysActive = types.includes("ANTHROPIC_API_KEY") || types.includes("OPENROUTER_API_KEY");
  const claudeActive = types.includes("CLAUDE_CODE_CREDENTIALS_JSON");
  const chatGptActive = types.includes("CHATGPT_SUBSCRIPTION_OAUTH");

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-100">Billing sources</h1>
        <p className="text-sm text-gray-400 mt-1">
          Connect API keys and subscription accounts, then choose them from Evolve presets.
        </p>
      </div>

      <div className="grid gap-2">
        <BillingSourceItem
          title="API keys"
          description="Anthropic, OpenRouter, and future direct provider keys."
          icon={<AuthSourceIcon source="anthropic-api-key" size={20} />}
          active={apiKeysActive}
          defaultOpen={!apiKeysActive}
        >
          <ApiKeySettingsClient hideHeader />
        </BillingSourceItem>

        <BillingSourceItem
          title="Claude.ai subscription"
          description="Use Claude Code with your Claude.ai account credentials."
          icon={<AuthSourceIcon source="claude-subscription" size={20} />}
          active={claudeActive}
        >
          <CredentialsSettingsClient hideHeader />
        </BillingSourceItem>

        <BillingSourceItem
          title="ChatGPT subscription"
          description="Use Codex models through Pi with ChatGPT OAuth credentials."
          icon={<AuthSourceIcon source="chatgpt-subscription" size={20} />}
          active={chatGptActive}
        >
          <ChatGptSubscriptionSettingsClient />
        </BillingSourceItem>
      </div>
    </section>
  );
}

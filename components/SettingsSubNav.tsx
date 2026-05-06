// components/SettingsSubNav.tsx
// Settings section navigation.
// Large screens: vertical sidebar.
// Mobile: <select> dropdown that navigates on change.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type TabId = "api-key" | "claude-ai";

const tabs: { id: TabId; label: string; href: string }[] = [
  { id: "api-key", label: "API Key", href: "/settings" },
  { id: "claude-ai", label: "Claude.ai Subscription", href: "/settings/claude-ai" },
];

export default function SettingsSubNav({ currentTab }: { currentTab: TabId }) {
  const router = useRouter();
  const currentHref = tabs.find((t) => t.id === currentTab)?.href ?? "/settings";

  return (
    <>
      {/* Mobile: select dropdown */}
      <div className="lg:hidden w-full mb-2">
        <select
          value={currentHref}
          onChange={(e) => router.push(e.target.value)}
          className="w-full bg-gray-800 text-gray-200 text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-gray-500 cursor-pointer"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.href}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: vertical sidebar */}
      <nav
        className="hidden lg:flex flex-col gap-0.5 w-44 shrink-0 sticky top-6"
        aria-label="Settings navigation"
      >
        {tabs.map((tab) => {
          const active = tab.id === currentTab;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              data-id={`settings-nav/${tab.id}`}
              className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                active
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

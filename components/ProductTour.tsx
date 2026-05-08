"use client";

import { createContext, useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Onborda, OnbordaProvider, useOnborda } from "onborda";
import type { Tour } from "onborda";
import { TourCard } from "./TourCard";
import { withBasePath } from "@/lib/base-path";
import type { SessionUser } from "@/lib/hooks";

// ─── Callback context (consumed by TourCard) ─────────────────────────────────

export const TourCallbackContext = createContext<{
  onComplete: () => void;
  onSkip: (atStep: number) => void;
}>({ onComplete: () => {}, onSkip: () => {} });

// ─── Tour steps ───────────────────────────────────────────────────────────────

const sharedSteps: Tour["steps"] = [
  {
    // Step 0 — Welcome
    icon: "👋",
    title: "Welcome to Primordia",
    content: (
      <span>
        You have access to the <strong className="text-white">Evolve</strong> feature — propose changes to
        this app in plain English and an AI agent builds and previews them for you.
        <br /><br />
        This quick tour covers credentials setup, proposing a change, and (for admins) the admin tools.
        Takes about 2 minutes.
      </span>
    ),
    selector: "onborda-hero",
    side: "bottom",
    showControls: true,
    pointerPadding: 12,
    pointerRadius: 8,
  },
  {
    // Step 1 — Home page orientation
    icon: "🏠",
    title: "The home page",
    content: (
      <span>
        This is a live, running web app. Everything you see is editable.
        Users with access can describe a change in plain English and an AI agent builds it,
        live, in a private preview.
      </span>
    ),
    selector: "onborda-hero",
    side: "bottom",
    showControls: true,
    pointerPadding: 12,
    pointerRadius: 8,
  },
  {
    // Step 2 — Hamburger menu
    icon: "☰",
    title: "The ☰ menu",
    content: (
      <span>
        The <strong className="text-white">☰ menu</strong> is how you access all of Primordia&apos;s features —
        credentials, evolve, branches, and admin tools.
      </span>
    ),
    selector: "onborda-hamburger",
    side: "bottom-left",
    showControls: true,
    pointerPadding: 8,
    pointerRadius: 8,
  },
  {
    // Step 3 — Navigate to settings (nextRoute triggers nav on Next click)
    icon: "🔑",
    title: "Set up AI credentials",
    content: (
      <span>
        First, let&apos;s look at <strong className="text-white">Account Settings</strong> — where you tell
        Primordia which AI service to use to build your changes.
      </span>
    ),
    selector: "onborda-hamburger",
    side: "bottom-left",
    showControls: true,
    pointerPadding: 8,
    pointerRadius: 8,
    nextRoute: "/settings",
  },
  {
    // Step 4 — Priority cascade (on /settings)
    icon: "⚡",
    title: "The credential cascade",
    content: (
      <span>
        Primordia uses a <strong className="text-white">cascade</strong> (highest priority first):{" "}
        <span className="text-sky-400">Claude.ai</span> ›{" "}
        <span className="text-amber-400">Anthropic API key</span> ›{" "}
        <span className="text-gray-400">exe.dev gateway</span>.
        <br /><br />
        You only need to configure one. The exe.dev gateway is your automatic no-config fallback.
      </span>
    ),
    selector: "onborda-priority-badge",
    side: "bottom",
    showControls: true,
    pointerPadding: 8,
    pointerRadius: 8,
  },
  {
    // Step 5 — OpenRouter card (navigate to /settings/claude-ai on Next)
    icon: "🆓",
    title: "Free option: OpenRouter",
    content: (
      <span>
        OpenRouter has a free tier with capable open-source coding models — no credit card needed.
        Get a key at <strong className="text-white">openrouter.ai/keys</strong> (the &quot;Get a key&quot; link
        is right on the card), paste it in, and hit <strong className="text-white">Save key</strong>.
      </span>
    ),
    selector: "onborda-openrouter-card",
    side: "top",
    showControls: true,
    pointerPadding: 8,
    pointerRadius: 12,
    nextRoute: "/settings/claude-ai",
  },
  {
    // Step 6 — Claude.ai sign in (on /settings/claude-ai)
    icon: "✨",
    title: "Claude.ai subscription",
    content: (
      <span>
        Have a Claude.ai Pro or Max plan? Click{" "}
        <strong className="text-white">Sign in with Claude.ai</strong> to connect it — no separate API bill.
        <br /><br />
        On Linux, you can also paste <code className="text-sky-400 bg-gray-800 px-1 rounded">~/.claude/.credentials.json</code> directly below the button.
      </span>
    ),
    selector: "onborda-claude-signin",
    side: "bottom",
    showControls: true,
    pointerPadding: 8,
    pointerRadius: 8,
    nextRoute: "/",
  },
  {
    // Step 7 — Evolve intro (back on /)
    icon: "🚀",
    title: "Propose a change",
    content: (
      <span>
        That&apos;s it for credentials. Now let&apos;s see the evolve flow.
        <br /><br />
        Open the <strong className="text-white">☰ menu</strong> and click{" "}
        <strong className="text-white">Propose a change</strong> to start.
      </span>
    ),
    selector: "onborda-hamburger",
    side: "bottom-left",
    showControls: true,
    pointerPadding: 8,
    pointerRadius: 8,
  },
  {
    // Step 8 — Evolve form description
    icon: "✏️",
    title: "Describe what you want",
    content: (
      <span>
        Type your request in plain English — as specific or as vague as you like.
        <br /><br />
        <em className="text-gray-300">&quot;Add a dark mode toggle to the nav bar.&quot;</em>
        <br /><br />
        The AI agent reads your request, looks at the codebase, writes the code, and builds a live preview.
      </span>
    ),
    selector: "onborda-hamburger",
    side: "bottom-left",
    showControls: true,
    pointerPadding: 8,
    pointerRadius: 8,
  },
  {
    // Step 9 — Attachments & inspector
    icon: "📎",
    title: "Attach context",
    content: (
      <span>
        You can also <strong className="text-white">attach screenshots or files</strong> as reference, or use the{" "}
        <strong className="text-white">element inspector</strong> (crosshair button) to click any part of the
        page and add it as context. Both help the AI understand exactly what you mean.
      </span>
    ),
    selector: "onborda-hamburger",
    side: "bottom-left",
    showControls: true,
    pointerPadding: 8,
    pointerRadius: 8,
  },
  {
    // Step 10 — Submit & session page
    icon: "⚙️",
    title: "Submit and review",
    content: (
      <span>
        When you hit <strong className="text-white">Propose Change</strong>, Primordia creates a private
        git branch, runs the AI agent, and starts a dev server with the result.
        <br /><br />
        On the session page you&apos;ll see live agent output, a side-by-side preview, and a diff of every
        file touched. Hit <strong className="text-white">Accept</strong> to deploy instantly, or{" "}
        <strong className="text-white">Reject</strong> to discard cleanly.
      </span>
    ),
    selector: "onborda-hamburger",
    side: "bottom-left",
    showControls: true,
    pointerPadding: 8,
    pointerRadius: 8,
  },
];

const mainWrapUp: Tour["steps"][number] = {
  // Wrap-up for non-admin users
  icon: "🎉",
  title: "You're all set!",
  content: (
    <span>
      <strong className="text-white">Credentials</strong> live in ☰ → Account Settings — update any time.
      <br />
      <strong className="text-white">Propose changes</strong> via ☰ → Propose a change.
      <br /><br />
      The tour won&apos;t show again. Go build something.
    </span>
  ),
  selector: "onborda-hero",
  side: "bottom",
  showControls: true,
  pointerPadding: 12,
  pointerRadius: 8,
};

const adminSteps: Tour["steps"] = [
  {
    // Admin intro — navigates to /admin on Next
    icon: "🛡️",
    title: "Admin panel",
    content: (
      <span>
        As the first user, you also have the <strong className="text-white">admin</strong> role.
        Let&apos;s take a quick look at the admin tools.
      </span>
    ),
    selector: "onborda-hamburger",
    side: "bottom-left",
    showControls: true,
    pointerPadding: 8,
    pointerRadius: 8,
    nextRoute: "/admin",
  },
  {
    // On /admin — heading / user list
    icon: "👥",
    title: "Manage users",
    content: (
      <span>
        This is the <strong className="text-white">Admin panel</strong> — only admins can see it.
        <br /><br />
        New users start with no roles. You decide who gets{" "}
        <strong className="text-white">can_evolve</strong> access to propose changes.
      </span>
    ),
    selector: "onborda-admin-heading",
    side: "right",
    showControls: true,
    pointerPadding: 8,
    pointerRadius: 8,
  },
  {
    // can_evolve controls
    icon: "🔓",
    title: "Granting evolve access",
    content: (
      <span>
        Use the toggle next to any user to grant or revoke{" "}
        <strong className="text-white">can_evolve</strong>. Admins automatically have it.
      </span>
    ),
    selector: "onborda-admin-evolve",
    side: "top",
    showControls: true,
    pointerPadding: 8,
    pointerRadius: 8,
  },
  {
    // Admin sidebar tools — navigate back to / on Next
    icon: "🧰",
    title: "Admin tools",
    content: (
      <span>
        A few tools worth knowing:
        <br />
        • <strong className="text-white">Server Health</strong> — disk & memory, clean old previews
        <br />
        • <strong className="text-white">Logs</strong> — live stdout/stderr stream
        <br />
        • <strong className="text-white">Rollback</strong> — one-click revert, zero downtime
        <br />
        • <strong className="text-white">Updates</strong> — pull upstream Primordia improvements
      </span>
    ),
    selector: "onborda-admin-nav",
    side: "right",
    showControls: true,
    pointerPadding: 8,
    pointerRadius: 8,
    nextRoute: "/",
  },
  {
    // Admin wrap-up (back on /)
    icon: "🎉",
    title: "You're all set!",
    content: (
      <span>
        <strong className="text-white">Credentials</strong> — ☰ → Account Settings
        <br />
        <strong className="text-white">Propose changes</strong> — ☰ → Propose a change
        <br />
        <strong className="text-white">Manage users & server</strong> — ☰ → Admin
        <br /><br />
        The tour won&apos;t show again. Everything is one menu click away.
      </span>
    ),
    selector: "onborda-hero",
    side: "bottom",
    showControls: true,
    pointerPadding: 12,
    pointerRadius: 8,
  },
];

const tours: Tour[] = [
  {
    tour: "main",
    steps: [...sharedSteps, mainWrapUp],
  },
  {
    tour: "admin",
    steps: [...sharedSteps, ...adminSteps],
  },
];

// ─── Inner trigger (must live inside OnbordaProvider) ────────────────────────

function TourTrigger() {
  const { startOnborda } = useOnborda();
  const pathname = usePathname();
  const startedRef = useRef(false);

  useEffect(() => {
    if (pathname !== "/" || startedRef.current) return;
    fetch(withBasePath("/api/auth/session"))
      .then((r) => r.json())
      .then((data: { user: SessionUser | null }) => {
        const user = data.user;
        if (user?.canEvolve && !user.tourCompleted) {
          startedRef.current = true;
          startOnborda(user.isAdmin ? "admin" : "main");
        }
      })
      .catch(() => {});
  }, [pathname, startOnborda]);

  return null;
}

// ─── Provider (placed in root layout) ────────────────────────────────────────

export function ProductTour({ children }: { children: React.ReactNode }) {
  const onComplete = useCallback(() => {
    fetch(withBasePath("/api/auth/tour-complete"), { method: "POST" }).catch(() => {});
  }, []);

  const onSkip = useCallback((atStep: number) => {
    fetch(withBasePath("/api/auth/tour-complete"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skipped: true, atStep }),
    }).catch(() => {});
  }, []);

  return (
    <TourCallbackContext.Provider value={{ onComplete, onSkip }}>
      <OnbordaProvider>
        <Onborda
          steps={tours}
          cardComponent={TourCard}
          shadowRgb="15,23,42"
          shadowOpacity="0.85"
          cardTransition={{ duration: 0.3, type: "tween" }}
        >
          <TourTrigger />
          {children}
        </Onborda>
      </OnbordaProvider>
    </TourCallbackContext.Provider>
  );
}

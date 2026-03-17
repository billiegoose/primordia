// app/page.tsx — The main entry point for Primordia
// This page renders the chat interface with an optional "evolve" mode toggle.
// When a user switches to evolve mode, their message is captured as a GitHub Issue
// instead of being sent to Claude for a normal conversation.
//
// Suspense is required because ChatInterface uses useSearchParams() to detect
// whether it is running as a local preview instance (with sessionId + parentOrigin
// query params injected by the parent dev server).

import { Suspense } from "react";
import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <Suspense>
      <ChatInterface />
    </Suspense>
  );
}

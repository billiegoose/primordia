"use client";

// app/oauth-test/page.tsx
// Interactive test page for Claude Code OAuth login.
//
// Flow:
//   1. User clicks "Start" — server spawns `claude` (or custom command)
//   2. Terminal output is streamed via SSE; when an OAuth URL is detected
//      it is highlighted as a clickable link (Step 2)
//   3. User opens the URL, approves in browser, receives a code
//   4. User pastes code into the input and clicks "Submit Code"
//   5. Server writes the code to the process stdin
//   6. When the process exits, credentials.json is fetched and displayed

import { useCallback, useEffect, useRef, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { ExternalLink, Play, Send, RefreshCw, Terminal } from "lucide-react";

type Status =
  | "idle"
  | "starting"
  | "waiting-for-code"
  | "complete"
  | "error";

// Strip ANSI escape codes for display
function stripAnsi(s: string): string {
  return s
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
    .replace(/\x1b\][^\x07]*\x07/g, "")
    .replace(/\x1b[()][AB012]/g, "");
}

export default function OAuthTestPage() {
  const [command, setCommand] = useState("claude");
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState(""); // accumulated terminal text (stripped)
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeSubmitted, setCodeSubmitted] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, unknown> | string | null>(null);
  const [credsError, setCredsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const outputRef = useRef<HTMLPreElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const chunkCountRef = useRef(0);

  // Auto-scroll terminal output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Open SSE stream after start
  const openStream = useCallback((fromIndex: number) => {
    if (esRef.current) {
      esRef.current.close();
    }
    const url = withBasePath(
      `/api/oauth-test/stream?from=${fromIndex}`
    );
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (evt) => {
      const data = JSON.parse(evt.data);

      if (data.chunks?.length > 0) {
        const text = (data.chunks as string[])
          .map((c) => stripAnsi(c))
          .join("");
        setOutput((prev) => prev + text);
        chunkCountRef.current = data.chunkCount ?? chunkCountRef.current;
      }

      if (data.oauthUrl) {
        setOauthUrl(data.oauthUrl);
      }

      if (data.status) {
        setStatus(data.status as Status);
      }

      if (data.done) {
        es.close();
        esRef.current = null;
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  // Step 1: Start the OAuth flow
  const handleStart = async () => {
    setBusy(true);
    setOutput("");
    setOauthUrl(null);
    setCode("");
    setCodeSubmitted(false);
    setCredentials(null);
    setCredsError(null);
    chunkCountRef.current = 0;

    const cmdParts = command.trim().split(/\s+/).filter(Boolean);
    const res = await fetch(withBasePath("/api/oauth-test/start"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: cmdParts }),
    });

    setBusy(false);

    if (!res.ok) {
      setStatus("error");
      setOutput(`[Failed to start: ${res.statusText}]\n`);
      return;
    }

    setStatus("starting");
    openStream(0);
  };

  // Step 3: Submit verification code
  const handleSubmitCode = async () => {
    if (!code.trim()) return;
    setBusy(true);

    const res = await fetch(withBasePath("/api/oauth-test/submit"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });

    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setOutput(
        (prev) =>
          prev + `\n[Submit error: ${body.error ?? res.statusText}]\n`
      );
      return;
    }

    setCodeSubmitted(true);
    // Re-open stream from current offset to catch remaining output
    openStream(chunkCountRef.current);
  };

  // Step 4: Fetch credentials.json
  const handleFetchCredentials = async () => {
    setBusy(true);
    setCredsError(null);

    const res = await fetch(withBasePath("/api/oauth-test/credentials"));
    const body = await res.json();
    setBusy(false);

    if (body.credentials === null) {
      setCredsError(
        "No credentials file found. The login may not have completed yet."
      );
    } else {
      setCredentials(body.credentials);
    }
  };

  const isRunning = status === "starting" || status === "waiting-for-code";
  const showCodeInput = oauthUrl !== null && !codeSubmitted;
  const showCredentials = status === "complete" || codeSubmitted;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-green-400" />
            Claude Code OAuth Test
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Launches <code className="text-green-300">claude</code> interactively,
            captures the OAuth URL, and feeds your verification code back in.
          </p>
        </div>

        {/* Step 1: Start */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Step 1 — Launch
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. claude  or  claude login"
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-gray-100 focus:outline-none focus:border-green-500"
              disabled={isRunning}
            />
            <button
              onClick={handleStart}
              disabled={busy || isRunning || !command.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              {isRunning ? "Running…" : "Start"}
            </button>
          </div>
        </section>

        {/* Terminal output */}
        {(output || isRunning) && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Terminal Output
              </h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                  status === "complete"
                    ? "bg-green-900 text-green-300"
                    : status === "error"
                    ? "bg-red-900 text-red-300"
                    : status === "waiting-for-code"
                    ? "bg-yellow-900 text-yellow-300"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                {status}
              </span>
            </div>
            <pre
              ref={outputRef}
              className="bg-gray-900 border border-gray-700 rounded p-3 text-xs font-mono text-green-300 h-64 overflow-y-auto whitespace-pre-wrap break-all"
            >
              {output || "Waiting for output…"}
            </pre>
          </section>
        )}

        {/* Step 2: OAuth URL */}
        {oauthUrl && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Step 2 — Approve OAuth
            </h2>
            <div className="bg-blue-950 border border-blue-700 rounded p-4 space-y-2">
              <p className="text-sm text-blue-200">
                Open the link below in your browser. After approving, copy the
                verification code it shows you.
              </p>
              <a
                href={oauthUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 underline break-all text-sm"
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                {oauthUrl}
              </a>
            </div>
          </section>
        )}

        {/* Step 3: Enter code */}
        {showCodeInput && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Step 3 — Enter Verification Code
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && code.trim()) handleSubmitCode();
                }}
                placeholder="Paste the code from the browser…"
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-gray-100 focus:outline-none focus:border-green-500"
                autoFocus
              />
              <button
                onClick={handleSubmitCode}
                disabled={busy || !code.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
              >
                <Send className="w-4 h-4" />
                Submit Code
              </button>
            </div>
          </section>
        )}

        {/* Step 4: Credentials */}
        {showCredentials && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Step 4 — credentials.json
              </h2>
              <button
                onClick={handleFetchCredentials}
                disabled={busy}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                {credentials ? "Refresh" : "Check Credentials"}
              </button>
            </div>

            {credsError && (
              <p className="text-sm text-red-400">{credsError}</p>
            )}

            {credentials && (
              <pre className="bg-gray-900 border border-gray-700 rounded p-3 text-xs font-mono text-gray-200 overflow-auto max-h-96 whitespace-pre">
                {JSON.stringify(credentials, null, 2)}
              </pre>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

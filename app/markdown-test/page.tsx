"use client";

// app/markdown-test/page.tsx
// Interactive test page for the streamdown integration.
// Streams a comprehensive markdown sample from /api/markdown-stream and renders
// it with <Streamdown mode="streaming" isAnimating={...}>.
//
// Controls:
//   • Speed slider  — adjusts the per-character delay (SSE query param)
//   • Restart button — resets accumulated text and starts a new SSE connection
//   • Chunk-size selector — characters sent per SSE event

import { useState, useRef, useCallback, useEffect } from "react";
import { Streamdown } from "streamdown";
import { withBasePath } from "@/lib/base-path";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUrl(delay: number, chunk: number): string {
  return withBasePath(`/api/markdown-stream?delay=${delay}&chunk=${chunk}`);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MarkdownTestPage() {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [delay, setDelay] = useState(8);
  const [chunk, setChunk] = useState(3);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const streamStarted = useRef(false);

  const startStream = useCallback(() => {
    // Cancel any in-flight stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setText("");
    setIsDone(false);
    setError(null);
    setIsStreaming(true);
    streamStarted.current = true;

    const url = buildUrl(delay, chunk);

    (async () => {
      try {
        const res = await fetch(url, { signal: abortRef.current!.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            if (payload === "[DONE]") {
              setIsStreaming(false);
              setIsDone(true);
              return;
            }
            try {
              const delta: string = JSON.parse(payload);
              setText((prev) => prev + delta);
            } catch {
              // ignore malformed lines
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
        setIsStreaming(false);
      }
    })();
  }, [delay, chunk]);

  // Start streaming automatically on first mount
  useEffect(() => {
    if (!streamStarted.current) startStream();
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3 flex flex-wrap items-center gap-3">
        <h1 className="text-sm font-semibold text-gray-100 mr-auto">
          Streamdown Test Page
        </h1>

        {/* Speed slider */}
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-20">
            Speed&nbsp;
            <span className="text-gray-200 font-mono">{delay}ms</span>
          </span>
          <input
            type="range"
            min={0}
            max={80}
            step={2}
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
            className="w-24 accent-violet-500"
            disabled={isStreaming}
          />
        </label>

        {/* Chunk size */}
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <span>Chunk</span>
          <select
            value={chunk}
            onChange={(e) => setChunk(Number(e.target.value))}
            disabled={isStreaming}
            className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-xs text-gray-200"
          >
            {[1, 3, 5, 10, 20, 50].map((v) => (
              <option key={v} value={v}>
                {v} char{v !== 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>

        {/* Restart / stop button */}
        <button
          onClick={() => {
            if (isStreaming) {
              abortRef.current?.abort();
              setIsStreaming(false);
            } else {
              startStream();
            }
          }}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            isStreaming
              ? "bg-red-600 hover:bg-red-500 text-white"
              : "bg-violet-600 hover:bg-violet-500 text-white"
          }`}
        >
          {isStreaming ? "Stop" : isDone ? "Restart" : "Start"}
        </button>
      </header>

      {/* ── Status bar ──────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-1.5 text-xs text-gray-500 flex items-center gap-3">
        <span>
          Status:{" "}
          <span
            className={`font-medium ${
              isStreaming
                ? "text-yellow-400"
                : isDone
                ? "text-green-400"
                : error
                ? "text-red-400"
                : "text-gray-400"
            }`}
          >
            {isStreaming ? "streaming…" : isDone ? "done" : error ? "error" : "idle"}
          </span>
        </span>
        <span>
          Chars received:{" "}
          <span className="font-mono text-gray-300">{text.length}</span>
        </span>
        {error && <span className="text-red-400">{error}</span>}
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-4xl mx-auto w-full">
        {text ? (
          <div className="prose prose-invert max-w-none">
            <Streamdown
              mode="streaming"
              isAnimating={isStreaming}
              className="text-sm leading-relaxed text-gray-200"
            >
              {text}
            </Streamdown>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
            {isStreaming ? "Waiting for first bytes…" : "Press Start to stream."}
          </div>
        )}
      </main>
    </div>
  );
}

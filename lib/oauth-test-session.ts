// lib/oauth-test-session.ts
// In-memory singleton that manages a single "claude login" child process for
// the /oauth-test page.  Only one session can be active at a time.

import { spawn } from "child_process";
import type { ChildProcessByStdio } from "child_process";
import type { Readable, Writable } from "stream";
import os from "os";
import path from "path";
import { readFileSync } from "fs";

type PipedChild = ChildProcessByStdio<Writable, Readable, Readable>;

export type OAuthTestStatus =
  | "idle"
  | "starting"
  | "waiting-for-code"
  | "complete"
  | "error";

interface State {
  chunks: string[]; // raw output text, one entry per data event
  oauthUrl: string | null;
  status: OAuthTestStatus;
  proc: PipedChild | null;
}

// Module-level singleton — shared for the lifetime of the Next.js server process.
const state: State = {
  chunks: [],
  oauthUrl: null,
  status: "idle",
  proc: null,
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function stripAnsi(s: string): string {
  return s
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
    .replace(/\x1b\][^\x07]*\x07/g, "")
    .replace(/\x1b[()][AB012]/g, "");
}

function tryExtractOAuthUrl(text: string): string | null {
  const clean = stripAnsi(text);
  const matches = [...clean.matchAll(/https?:\/\/[^\s\r\n"'<>]+/g)];
  for (const m of matches) {
    const url = m[0].replace(/[.,;:!?)\]]+$/, "");
    if (
      url.includes("claude.ai") ||
      url.includes("anthropic.com") ||
      url.toLowerCase().includes("oauth") ||
      url.toLowerCase().includes("auth")
    ) {
      return url;
    }
  }
  return null;
}

function appendChunk(chunk: string) {
  state.chunks.push(chunk);
  if (!state.oauthUrl) {
    const url = tryExtractOAuthUrl(chunk);
    if (url) {
      state.oauthUrl = url;
      state.status = "waiting-for-code";
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Snapshot of current state for the SSE stream. */
export function getSnapshot() {
  return {
    chunkCount: state.chunks.length,
    oauthUrl: state.oauthUrl,
    status: state.status,
  };
}

/** Return chunks starting at `fromIndex` (0-based). */
export function getChunksSince(fromIndex: number): string[] {
  return state.chunks.slice(fromIndex);
}

/** Start a fresh session by spawning the given command. */
export function startSession(command: string[]): void {
  // Kill any existing process
  if (state.proc) {
    try {
      state.proc.kill("SIGTERM");
    } catch {
      // ignore
    }
    state.proc = null;
  }

  // Reset state
  state.chunks = [];
  state.oauthUrl = null;
  state.status = "starting";

  const [cmd, ...args] = command;

  const proc = spawn(cmd, args, {
    stdio: ["pipe", "pipe", "pipe"] as ["pipe", "pipe", "pipe"],
    cwd: os.homedir(),
    env: {
      ...process.env,
      TERM: "xterm-256color",
      NO_COLOR: "0",
    },
  });

  state.proc = proc;

  proc.stdout.on("data", (buf: Buffer) => appendChunk(buf.toString("utf8")));
  proc.stderr.on("data", (buf: Buffer) => appendChunk(buf.toString("utf8")));

  proc.on("error", (err: Error) => {
    appendChunk(`\n[Spawn error: ${err.message}]\n`);
    state.status = "error";
    state.proc = null;
  });

  proc.on("exit", (code: number | null) => {
    appendChunk(`\n[Process exited with code ${code ?? "null"}]\n`);
    if (state.status !== "complete") {
      state.status = code === 0 ? "complete" : "error";
    }
    state.proc = null;
  });
}

/** Write the verification code to the process stdin. */
export function submitCode(code: string): void {
  if (!state.proc || !state.proc.stdin) {
    throw new Error("No active process");
  }
  state.proc.stdin.write(code.trim() + "\n", "utf8");
}

/** Read the credentials file from the default Claude config dir. */
export function readCredentials(): string | null {
  const claudeDir =
    process.env.USER_CLAUDE_DIR ||
    process.env.CLAUDE_CONFIG_DIR ||
    path.join(os.homedir(), ".claude");
  const credPath = path.join(claudeDir, ".credentials.json");
  try {
    return readFileSync(credPath, "utf-8");
  } catch {
    return null;
  }
}

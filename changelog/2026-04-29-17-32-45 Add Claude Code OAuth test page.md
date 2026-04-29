# Add Claude Code OAuth test page

## What changed

- New page at `/oauth-test` — an interactive debug tool for walking through the Claude Code OAuth login flow entirely from the browser.
- New in-memory session singleton at `lib/oauth-test-session.ts` — manages a single `child_process.spawn` of `claude` (or any configurable command), accumulates its stdout/stderr output in a chunk buffer, and automatically extracts any OAuth URL that appears in the output.
- Four new API routes under `app/api/oauth-test/`:
  - `POST /api/oauth-test/start` — kills any existing process and spawns a fresh one from a caller-supplied command array.
  - `GET /api/oauth-test/stream` — SSE stream that polls the in-memory chunk buffer every 250 ms and delivers new output plus the detected OAuth URL and process status.
  - `POST /api/oauth-test/submit` — writes the user-supplied verification code to the running process's stdin.
  - `GET /api/oauth-test/credentials` — reads `$USER_CLAUDE_DIR/.credentials.json` (falling back to `~/.claude/.credentials.json`) and returns its parsed contents.

## How the flow works

1. User enters a command (default: `claude`) and clicks **Start**.
2. The server spawns the process with piped stdin/stdout/stderr and streams all output to the browser via SSE.
3. When a `claude.ai` or `anthropic.com` URL appears in the output it is surfaced as a highlighted clickable link.
4. User opens the link, approves the OAuth flow in the browser, copies the verification code.
5. User pastes the code into the input on the page and clicks **Submit Code** — the server writes the code to the process stdin.
6. After the process exits the user clicks **Check Credentials** to read and display `~/.claude/.credentials.json`.

## Why

This page was needed to test and debug the Claude Code OAuth credential-acquisition flow without having to manually interact with a terminal. It also serves as a reference implementation for spawning interactive CLI tools from a Next.js server and piping their I/O through a browser UI.

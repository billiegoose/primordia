# Keep logging preview server output after ready

## What changed

In `lib/evolve-sessions.ts`, both the initial dev server startup (`startLocalEvolve`) and the
restart path (`restartDevServer`) now persist dev server output that arrives **after** the
"Ready" signal, not just during startup.

Previously, `appendProgress` was called for all dev server stdout/stderr data (before and after
"Ready"), but `persist()` was only called once — when "Ready" was first detected. After that
point the output landed in the in-memory `session.progressText` but was never written to SQLite,
so the SSE stream and session page never showed it.

The fix adds an `else if (session.devServerStatus === 'running') { void persist(); }` branch to
each `onData` handler so that every subsequent data chunk is flushed to SQLite as it arrives.

## Why

The preview dev server sometimes prints errors related to git operations (Next.js hot-reload,
module resolution, API route failures) that are invisible in the session log because they occur
after startup. Having these in the log makes it much easier to diagnose issues without needing
to SSH into the server or tail a separate log file.

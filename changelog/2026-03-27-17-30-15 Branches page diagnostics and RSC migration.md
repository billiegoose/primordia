# Branches page diagnostics and RSC migration

## What changed

- **Rewrote `app/branches/page.tsx` as a React Server Component.** The previous implementation was a `"use client"` component that fetched data from `/api/branches` via `fetch`. It is now a server component that runs git commands directly in the render function, eliminating the client/server round-trip entirely.

- **Deleted `app/api/branches/route.ts`.** The separate API route is no longer needed. All logic (git commands, session lookups, tree building) now lives inline in the page component.

- **Added a Diagnostics section to the page.** A `<details>` disclosure widget at the bottom of the page shows:
  - `process.cwd()` — the working directory where git commands run
  - `NODE_ENV`
  - Raw stdout, stderr, exit code, and spawn errors for:
    - `git --version`
    - `git branch --format=%(refname:short)`
    - `git branch --show-current`
  - Number of active local evolve sessions

  This makes it immediately obvious why "No local branches found." appeared — previously all git errors were silently swallowed by `execSync` wrapped in a try/catch that returned `''`.

- **Switched from `execSync` to `spawnSync`** for git commands. `spawnSync` returns stdout and stderr as separate fields even on non-zero exit codes, whereas `execSync` throws and discards output on failure. This is essential for the diagnostics.

- **Auto-refresh preserved** via an inline `<script>` tag (`setTimeout(() => location.reload(), 3000)`), replacing the `setInterval` from the old client component.

## Why

The previous evolve that added the branches page produced a page that always showed "No local branches found." The root cause was that all git errors were silently swallowed — `gitSync` caught every exception and returned an empty string, so any failure in `git branch` would produce an empty list with no indication of what went wrong.

Converting to a React Server Component also simplifies the architecture: no API route, no client-side fetch, and no hydration overhead. It also makes the diagnostics trivially easy to add — server state (`process.cwd()`, `sessions.size`) is directly accessible in the render function.

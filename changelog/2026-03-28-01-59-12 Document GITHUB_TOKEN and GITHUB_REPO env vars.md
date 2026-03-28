# Document GITHUB_TOKEN and GITHUB_REPO env vars

## What changed

- Added `GITHUB_TOKEN` and `GITHUB_REPO` as optional, commented-out entries in `.env.example`
- Added both variables to the Environment Variables table in `PRIMORDIA.md`

## Why

PR #101 (exe.dev flow consolidation) removed all GitHub/Vercel/Neon env var documentation, but `app/api/git-sync/route.ts` — a route that is intentionally preserved — still reads `process.env.GITHUB_TOKEN` and `process.env.GITHUB_REPO` to build an authenticated remote URL for git pull/push via the GitSyncDialog.

Without documentation, developers setting up the app would have no way to know these vars exist or what they do. Both are optional: the route gracefully falls back to the `origin` remote when they are absent.

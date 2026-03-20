# Show full git commit message via server component

## What changed

- `app/page.tsx` is now a React Server Component that reads the current git branch and full HEAD commit message at request time using `execSync` (falling back to Vercel env vars on Vercel deployments).
- The git context is passed as props (`branch`, `commitMessage`) directly to `ChatInterface`, eliminating the client-side `fetch("/api/git-context")` on mount.
- Changed the git log format from `--pretty=%s` (subject line only) to `--pretty=%B` (full commit message including body).
- Removed the `app/api/git-context/` API route entirely — it is no longer needed.
- The "here's what's changed" assistant message now renders the full commit message (subject + body) instead of just the first line.

## Why

The previous approach made an extra HTTP round-trip on page load to fetch git info that was already available server-side at render time. Using a server component eliminates that latency and removes a superfluous API route. Showing the full commit message (not just the subject) gives users more context about what changed in the current build.

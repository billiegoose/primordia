On Vercel preview deployments, the top header now displays a linked `#N` badge right after "Primordia", pointing to the GitHub PR for that preview.

**What changed**: `next.config.ts` now exposes four Vercel system env vars (`VERCEL_ENV`, `VERCEL_GIT_PULL_REQUEST_NUMBER`, `VERCEL_GIT_REPO_OWNER`, `VERCEL_GIT_REPO_SLUG`) via the `env` block, which Next.js inlines at build time so client components can read them. `ChatInterface.tsx` conditionally renders the link when `VERCEL_ENV === "preview"` and a PR number is present. Production deployments are unaffected.

**Why**: Makes it easy to identify which PR each preview tab corresponds to.

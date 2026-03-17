Fixed incorrect Vercel environment variable name for the PR ID.

**What changed**: Renamed `VERCEL_GIT_PULL_REQUEST_NUMBER` → `VERCEL_GIT_PULL_REQUEST_ID` in `next.config.ts` and `ChatInterface.tsx`.

**Why**: `VERCEL_GIT_PULL_REQUEST_NUMBER` is not a real Vercel system env var. The correct name is `VERCEL_GIT_PULL_REQUEST_ID`. Without this fix the PR badge in the header would never render on preview deployments.

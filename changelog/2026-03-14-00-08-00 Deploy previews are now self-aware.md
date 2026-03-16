Deploy previews now load their own PR and linked-issue context into the chat, making the assistant aware it is running on a work-in-progress build.

**What changed**:
- New `app/api/deploy-context/route.ts`: server-side endpoint that reads `VERCEL_GIT_PULL_REQUEST_ID`, fetches the PR from GitHub, extracts the linked issue (via `Closes #N` in the PR body), and returns a formatted context string.
- `app/api/chat/route.ts`: now accepts an optional `systemContext` field in the POST body and appends it to the hardcoded system prompt, so Claude is aware of the WIP context.
- `components/ChatInterface.tsx`: on mount, if `VERCEL_ENV === "preview"`, calls `/api/deploy-context` and (a) prepends a visible amber system-message notice to the chat, (b) passes the context as `systemContext` in every `/api/chat` call. System messages render as a distinct amber notice bar rather than a chat bubble.

**Why**: Deploy previews are live but unmerged works-in-progress. Loading the PR and linked issue into the chat makes the assistant aware it's running on a preview build, and gives users immediate visibility into which PR/issue the preview corresponds to.

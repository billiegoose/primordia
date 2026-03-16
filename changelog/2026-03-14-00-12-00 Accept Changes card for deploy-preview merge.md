Added an "Accept Changes" card to the chat interface on deploy previews, allowing users to merge the PR directly from the chat.

**What changed**:
- `app/api/merge-pr/route.ts` (new): POST endpoint that merges a PR via the GitHub API using `GITHUB_TOKEN`.
- `app/api/deploy-context/route.ts`: now also returns `prNumber` and `prUrl` alongside `context` so the client can identify the PR without re-parsing the context string.
- `components/ChatInterface.tsx`:
  - Stores `deployPrNumber` from the deploy-context response.
  - New `isMergeIntent()` helper detects phrasing like "merge this branch", "accept this change", "ship this", etc.
  - When a merge-intent message is submitted on a deploy preview, a green **"Accept Changes"** card is shown above the input (styled like the related-issues decision card). It displays the PR number and a "Cancel" option.
  - Clicking "Accept Changes" calls `/api/merge-pr`, then appends a confirmation (or error) message to the chat.

**Why**: On deploy previews users sometimes want to merge the PR right from the chat rather than switching to GitHub. The card-response pattern (same as related issues) gives a clear, safe confirmation step before an irreversible action.

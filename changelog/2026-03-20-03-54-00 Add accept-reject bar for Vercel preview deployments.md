# Add accept/reject bar for Vercel preview deployments

## What changed
- Added a new `/api/close-pr` route that closes a PR via the GitHub API (PATCH `state: "closed"`).
- Replaced the old chat-intent-triggered merge card in `ChatInterface.tsx` with a persistent **accept/reject bar** that appears automatically on all Vercel preview deployments (whenever `deployPrNumber` is set).
  - **Accept Changes** → calls `/api/merge-pr` to merge the PR, then shows a confirmation.
  - **Reject** → calls `/api/close-pr` to close the PR, then shows a confirmation.
  - The bar collapses into a static status message once an action is taken.
- Removed the `isMergeIntent` helper function and `showMergeCard` state, which were only needed for the old chat-triggered flow.

## Why
Previously, users on a Vercel preview deployment had to type "merge" or "accept" in the chat to trigger a merge card — and there was no reject/close option at all. The new bar gives reviewers a clear, always-visible way to either ship or discard a PR directly from the preview URL, matching the UX of the local dev preview flow.

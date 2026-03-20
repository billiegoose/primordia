# Move accept/reject bar below the app layout

## What changed

Extracted the accept/reject changes widget from `ChatInterface` into a new
`AcceptRejectBar` component, and moved it into the root layout (`app/layout.tsx`)
so it appears on every page.

The bar now sits **below** the 100dvh main app content. On preview builds
(local worktree or Vercel deploy preview), users can scroll down to reveal
the accept/reject controls. On production builds the bar renders `null`
and has no effect.

### Files changed

- **New**: `components/AcceptRejectBar.tsx` — standalone client component
  containing all accept/reject state and handlers for both local and Vercel
  previews.
- **Modified**: `app/layout.tsx` — added git preview detection (`runGit` /
  `isPreviewInstance`) and renders `<AcceptRejectBar>` after `{children}`.
- **Modified**: `components/ChatInterface.tsx` — removed accept/reject bars,
  state (`previewActionState`, `vercelActionState`, `deployPrNumber`,
  `deployPrBaseBranch`, `deployPrState`), and handlers. Kept the deploy-context
  fetch (simplified to only `context` string) for the chat system prompt.
- **Modified**: `app/page.tsx` — removed `isPreviewInstance` and
  `previewParentBranch` props (now handled in layout).

## Why

The accept/reject widget was previously only visible on the `/` chat page.
Moving it to the root layout makes it accessible from any page (e.g. `/evolve`,
`/changelog`). Keeping the main layout at `h-dvh` means the app looks identical
to production at first glance; the bar is discoverable by scrolling down.

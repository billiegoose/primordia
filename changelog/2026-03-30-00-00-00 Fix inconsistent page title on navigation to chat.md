# Fix inconsistent page title on navigation to chat

## What changed

1. Removed the `useEffect` in `components/ChatInterface.tsx` that was manually setting `document.title` to `"Primordia (${branch})"` on every client-side mount.

2. Added `generateMetadata()` to `app/page.tsx` (the landing page) so its `<title>` follows the same standardized format as all other pages: `"Primordia — :3002 — branch-name"` on non-main branches, or just `"Primordia"` on main.

3. Fixed a dash inconsistency in `lib/page-title.ts`: the separator before the branch name was a short hyphen (` - `) while all other separators used an em dash (` — `). All separators are now em dashes.

## Why

`ChatInterface` contained a legacy client-side title override:

```ts
useEffect(() => {
  if (branch) {
    document.title = `Primordia (${branch})`;
  }
}, [branch]);
```

This predates the `buildPageTitle` utility and the `generateMetadata()` export added to `app/chat/page.tsx`. When navigating to `/chat` via a Next.js client-side transition, Next.js correctly sets the title to the value returned by `generateMetadata()` (e.g. `"Chat — Primordia — :3002 — branch-name"`). Immediately afterward, React mounts `ChatInterface` and the `useEffect` fires, overwriting the title with the shorter `"Primordia (branch-name)"` format.

On a hard refresh the correct server-rendered title appears in the browser tab before JavaScript hydrates, so users tended to see the right title then — but on client-side navigation the wrong title was the only one they ever saw.

Removing the `useEffect` leaves title management solely to `generateMetadata()`, which runs server-side for every navigation and produces the correct, fully-qualified title consistently.

The landing page was missing a `generateMetadata()` entirely, so its `<title>` fell through to whatever the root layout defined rather than showing the branch-aware format. Adding `generateMetadata()` with `buildPageTitle()` (no page name argument) gives it the format `"Primordia — :3002 — branch-name"` — consistent with the pattern used by all other pages, and useful for quickly identifying which worktree's tab is which.

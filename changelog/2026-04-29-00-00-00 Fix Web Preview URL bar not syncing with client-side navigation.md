# Fix Web Preview URL bar not syncing with client-side navigation

## What changed

Added a 250ms polling interval in `WebPreviewPanel` that reads `contentWindow.location.href` from the preview iframe and keeps the URL bar in sync.

Previously the URL bar only updated in the `onLoad` handler, which fires for full page loads (hard navigations). Client-side navigation in Next.js uses the History API (`pushState` / `replaceState`) and never triggers `onLoad`, so the URL bar would silently fall out of sync whenever the user clicked a link inside the preview.

## Why

The Web Preview embeds a Next.js app that does client-side routing. After the initial page load any in-app link click updates the browser's history without a full reload, leaving the URL bar stuck on the last hard-navigated URL.

## How

- A `setInterval` (250ms) reads `iframeRef.current?.contentWindow?.location?.href` inside a try/catch (cross-origin frames throw; same-origin frames work fine).
- The interval skips updates while the user has the URL bar focused (tracked via a `urlBarFocusedRef`) so it can't clobber text the user is typing.
- The existing `onLoad` handler continues to handle initial loads and hard navigations.

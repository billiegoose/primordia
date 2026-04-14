# Add WebPreviewPanel inline browser on session page

## What changed

Added a new `WebPreviewPanel` component (`components/WebPreviewPanel.tsx`) that renders an inline browser-like preview inside the session page.

The panel appears automatically on the session page (`/evolve/session/[id]`) once the session is `ready` and the proxy reports the preview server as `running`. It includes:

- **Back** / **Forward** buttons that call `contentWindow.history.back()` / `.forward()` on the embedded iframe.
- **Refresh** button (spins while the page is loading) that calls `contentWindow.location.reload()`.
- **URL bar** — shows the current iframe URL (updated on every `onLoad` event). The user can edit it and press Enter to navigate the iframe to any URL on the preview server.
- **Open in new tab** button (external-link icon) linking to the original `previewUrl`.
- A 600 px tall `<iframe>` that loads the preview server URL.
- A "Loading preview…" overlay while the iframe is fetching.

Cross-origin navigation is handled gracefully: if `contentWindow.location` or `history` throw (cross-origin guard), the error is silently caught and the URL bar retains its last known value.

## Why

Previously users had to click a link to open the preview in a separate tab, context-switch, then return to the session page to accept or reject. With the inline preview they can see and interact with the running preview without leaving the session page, making the accept/reject decision flow much faster.

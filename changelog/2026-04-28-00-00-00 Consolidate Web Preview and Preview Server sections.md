# Consolidate Web Preview and Preview Server sections

## What changed

On the evolve session page, the previously separate "Web Preview" iframe block and
"Preview server" card have been merged into a single card — and then further simplified
by removing all redundant chrome.

**Before:**
- A standalone `xl:hidden` `<WebPreviewPanel>` block appeared in the progress list (visible
  on mobile only, only when the server was running).
- Below it, a dedicated "🚀 Preview server" card showed the URL, a text status label, a
  restart button, and collapsible server logs — always visible when the session was ready,
  even on desktop where the iframe already lived in the sidebar.

**After:**
- A single card replaces both, with no top title row.
- On mobile (`xl:hidden`), the iframe is embedded directly in the card body, with inline
  "Starting preview…" and "Preview server stopped" states when the server isn't running.
- A collapsible "🪵 Server logs" section sits at the bottom of the card
  (auto-expanded when the server is stopped). The restart/start button lives in the
  `<summary>` row, to the right of the "Server logs" label, so it doesn't open/close logs.

## Why

The two sections were redundant — the URL appeared in "Preview server" but was already
the source of the iframe in "Web preview". The server status was shown as an explicit text
label, but is implied by whether the iframe is loading. The title row added no information
beyond what the iframe itself communicates. Removing all of this makes the layout more
compact while preserving full functionality (restart button, server logs, stopped/starting
states on mobile).

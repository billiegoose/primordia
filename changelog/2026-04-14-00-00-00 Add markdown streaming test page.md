# Add Markdown Streaming Test Page

## What changed

- **`app/api/markdown-stream/route.ts`** — new SSE API route that streams a comprehensive markdown document character-by-character (or in configurable chunks). Accepts `delay` (ms per tick, 0–200) and `chunk` (chars per event, 1–50) query params.

- **`app/markdown-test/page.tsx`** — new client-side test page at `/markdown-test` that:
  - Connects to the SSE stream on mount and accumulates received text
  - Renders accumulated text with `<Streamdown mode="streaming" isAnimating={...}>` so streamdown's streaming-specific behaviour (incomplete block handling, remend, etc.) is exercised in real time
  - Shows a status bar (streaming / done / error) and live character count
  - Exposes controls for speed (delay slider), chunk size (select), and a Start / Stop / Restart button
  - Starts streaming automatically on page load

## Why

The branch is specifically for testing the streamdown component migration. Having a dedicated page that exercises all major Markdown syntax — headings H1–H6, emphasis, blockquotes, ordered/unordered/task lists, fenced code blocks in multiple languages, GFM tables, horizontal rules, inline HTML, and long paragraphs — makes it easy to spot rendering regressions as streamdown is updated.

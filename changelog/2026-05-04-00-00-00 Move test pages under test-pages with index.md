# Move test pages under /test-pages with index

## What changed

- Moved `app/ansi-test/`, `app/markdown-test/`, and `app/sound-test/` into a shared `app/test-pages/` directory. Their routes are now:
  - `/test-pages/ansi-test`
  - `/test-pages/markdown-test`
  - `/test-pages/sound-test`
- Added `app/test-pages/page.tsx` — an index page listing all test pages with emoji, title, description, and route path. Styled consistently with the rest of the dark UI.
- Updated CLAUDE.md file map to reflect the new structure.

## Why

Grouping all developer/component test pages under a single `/test-pages` prefix makes them easier to find, keeps the top-level route list clean, and gives contributors a single URL to bookmark.

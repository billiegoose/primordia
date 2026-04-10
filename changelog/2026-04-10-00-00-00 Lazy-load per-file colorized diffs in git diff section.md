# Lazy-load per-file colorized diffs in git diff section

## What changed

- **New API route** `GET /api/evolve/diff?sessionId=...&file=...` — runs `git diff parent...sessionBranch -- <file>` and returns the raw unified diff as plain text. Capped at 4 MB per file.
- **New component** `components/DiffFileExpander.tsx` — renders a single file row in the "Files changed" section. Clicking the row toggles an inline colorized diff view. The diff is fetched once on first expand (lazy-loaded); subsequent toggles re-use the cached result.
  - `+` lines → green; `-` lines → red; `@@` hunk headers → blue; meta headers (`diff`, `index`, `---`, `+++`) → muted gray.
  - Shows a spinner while loading.
  - Keyboard-accessible (`Enter`/`Space` to toggle).
- **Updated** `EvolveSessionView.tsx` — replaced the plain `<table>` of file rows with `DiffFileExpander` instances. The outer "Files changed" `<details>` expand/collapse is unchanged.

## Why

The file list previously showed only filenames and +/- line counts. To understand what actually changed without leaving the page, users can now click any file to expand the full colorized diff inline.

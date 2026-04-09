# Sort changelog by git commit timestamp

## What changed

The changelog page (`/changelog`) and the chat system prompt now sort entries by **git commit timestamp** (when each file was first added to git) rather than by lexicographic filename order.

## Why

Many recent changelog entries use `00-00-00` as a placeholder time in their filename (e.g. `2026-04-09-00-00-00 Some change.md`). When multiple entries share the same `YYYY-MM-DD-00-00-00` prefix, the old lexicographic sort grouped them together and ordered them alphabetically by description — not by when they were actually committed.

The time portion of the filename is **not displayed** to users (only the date is shown), but it does need to drive the "most recent first" ordering. Using git commit timestamps as the primary sort key ensures that entries appear in the correct chronological order even when their filenames carry a placeholder time.

For same-commit entries (multiple files added in one commit), the sort falls back to reverse filename order, which is consistent and stable.

If git is unavailable (not a git repo, no git binary), the sort falls back to reverse filename order — the previous behaviour.

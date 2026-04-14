# Fix Pi text breaking on single newlines

## What changed

Fixed two related issues in how Pi's (Claude Code agent) response text is rendered in the evolve session view.

### Root cause

Pi streams its text output as many small delta chunks. Each chunk is stored as a separate `{ type: "text" }` event in the session NDJSON log. In `EvolveSessionView.tsx`, each `text` event was rendered as its own `<MarkdownContent>` component, which wraps its output in a `<div>`. This caused every streaming chunk boundary to become a block-level break, fragmenting prose mid-sentence (sometimes even mid-word across an inline code span).

### Fix 1 — Merge consecutive text events before rendering (`EvolveSessionView.tsx`)

Added a `mergeConsecutiveTextEvents()` helper that collapses runs of adjacent `text` events into a single event by concatenating their `content` strings. Applied this in three places:

- **`RunningClaudeSection`** — live/streaming event list
- **`DoneClaudeSection` detail events** — the tool-call detail panel (inside `<details>`)
- **`DoneClaudeSection` final events** — the concluding prose shown below the tool list; these are all text events so they're now joined with `.join('')` into one `<MarkdownContent>`

### Fix 2 — Treat single newlines as spaces in `MarkdownContent` (`SimpleMarkdown.tsx`)

Within a paragraph (text between blank lines), single `\n` characters are now joined with a space instead of a `<br />`. Standard Markdown treats a bare newline as a soft line break (space), not a hard break — only `\n\n` starts a new paragraph. This prevents accidental line breaks when a text chunk happens to start or end at a newline.

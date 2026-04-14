# Fix Pi text breaking on single newlines

## What changed

In `components/SimpleMarkdown.tsx`, the `MarkdownContent` block renderer was inserting a `<br />` element between every line within a paragraph. This caused Pi's (Claude Code's) response text to break at each raw newline in the source, producing visually broken output like:

> "I can see the curl command is getting truncated with an ellipsis. The fix
> is to increase the `max-w-xl` container width…"

or even breaking inline code tokens mid-token:

> "…from `max-w-xl` (576px) to `max-w-
> -2xl` (672px)…"

## Why

Standard Markdown spec treats a single newline within a paragraph as a **soft line break** — it should be rendered as a space, not as a `<br />`. Only a blank line (two or more consecutive newlines) creates a new paragraph. Pi's responses are written as flowing prose with occasional single newlines for source readability, and the old renderer was faithfully (but incorrectly) turning each of those newlines into a hard line break in the HTML output.

## Fix

Changed the line joiner in the mixed/plain paragraph branch of `MarkdownContent` from `<br />` to a plain `" "` space character. Bullet list items are unaffected — they already render each item in its own `<li>`. Paragraph splitting on `\n\n+` is also unchanged, so double-newline paragraph breaks still work correctly.

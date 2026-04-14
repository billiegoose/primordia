# Replace SimpleMarkdown and MarkdownContent with streamdown

## What changed

- Added `streamdown@2.5.0` as a dependency.
- Rewrote `components/SimpleMarkdown.tsx` to use the `Streamdown` component from streamdown instead of the hand-rolled inline parser.
  - `SimpleMarkdown` now uses minimal chat-context components (inherits parent text colour/size) — used in chat bubbles.
  - `MarkdownContent` now uses prose components with explicit `text-xs text-gray-300` dark styling — used in evolve session progress, changelog entries, etc.
  - Both use `mode="static"` (no streaming animations).
  - Custom `components` override keep the existing visual appearance: inline code (`bg-gray-700 px-1 rounded text-xs`), links (`underline text-blue-300 hover:text-blue-200`), bullet lists, headings, blockquotes.
- Imported `streamdown/styles.css` at the top of `app/globals.css` (before Tailwind directives, as required by CSS spec).
- Removed `whitespace-pre-wrap` from chat-bubble containers in `ChatInterface.tsx`; `Streamdown` renders proper block elements so pre-wrap is no longer needed there.

## Why

The hand-rolled renderer only handled bold, links, and inline code. LLM responses frequently use headings, ordered lists, blockquotes, fenced code blocks, and other standard markdown constructs that were previously rendered as raw text. `streamdown` is a purpose-built React markdown renderer designed for AI-powered streaming interfaces, giving full GFM support with a single drop-in replacement.

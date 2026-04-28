# Smart Preview Start URL from LLM Output

## What changed

The Web Preview panel in evolve session pages now opens on the most relevant page for the session, instead of always defaulting to the app's landing page.

A new utility function `deriveSmartPreviewUrl` (in `lib/smart-preview-url.ts`) infers the best starting path by scanning the **LLM's text output** events from the session log. The LLM typically summarises what it built at the end of its response, e.g.:

> "Done. The test page is at `/ansi-test` and offers: …"

The function collects all candidate path mentions across several regex patterns (backtick-quoted paths, markdown link targets, double/single-quoted paths, and contextual phrases like "at /path"), tags each with its position in the text, then returns the **last** one found — which is usually the most relevant summary statement.

Paths that are internal infrastructure (e.g. `/api/`, `/_next/`, `/lib/`, `/components/`) and paths that look like filenames (have file extensions) are excluded. If no valid path is found, the preview falls back to the landing page as before.

The smart URL is computed from the `events` state array in `EvolveSessionView`. By the time the dev server is ready and the `WebPreviewPanel` mounts, the session events are complete, so the inferred path is stable. Both the inline (mobile) and sidebar (desktop) preview panels use the smart URL.

## Why

Previously the Web Preview always started on the landing page regardless of what the session built. Matching against the initial request text was unreliable — requests describe what to change, not which URL to view. Matching against the LLM's output is far more accurate: the agent explicitly names the pages it creates or modifies in its summary messages.

Fixed a bug in `SimpleMarkdown` where bold text (`**text**`) was rendered twice — once as a `<strong>` element and once as a plain `<span>`.

**What changed**: Fixed the split regex in `SimpleMarkdown`. `String.split()` with a regex that has capturing groups includes the captured sub-groups in the result array. The split regex had inner capturing groups (e.g., `([^*]+)` inside `\*\*([^*]+)\*\*`), so for each bold token the array contained both the full `**text**` match and the inner `text` capture. The fix converts all inner groups to non-capturing (`(?:...)`) so only the full token appears in the split result.

**Why**: Bold text was visually duplicated in the chat UI.

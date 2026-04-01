# Split session log into collapsible sections

## What changed

`EvolveSessionView.tsx` now parses the `progressText` blob into logical sections and renders each one as a distinct, purpose-built card.

**Parsing layer (`parseProgressSections`, `splitClaudeContent`):**
- `parseProgressSections(text)` — splits at `### ` heading markers; the first chunk becomes the "Setup" section (integrated into the "Created branch" card).
- `splitClaudeContent(content)` — strips terminal markers (`✅ **Claude Code finished.**`, etc.), counts tool calls, and splits content into a collapsible bulk part and the final visible message.

**"Created branch" card now hosts the Setup section:**
- While setup is in progress: title shows "Creating branch… [spinner]".
- Once the first `### ` section appears: title becomes "Created branch" and setup steps collapse into a `<details>` with summary "✅ X steps completed".

**Claude Code sections (active vs. done):**
- Active: shows the heading with a "Running…" spinner and full streaming content — you can watch Claude work in real time.
- Done: title becomes "🤖 Claude Code finished"; all tool calls and intermediate text fold into `<details>` "🔧 X tool calls made"; only the final summary message (the paragraph Claude wrote last) remains visible.

**Follow-up request sections:**
- `### 🔄 Follow-up Request` is rendered as a "Your request"-style card (label: "Follow-up request") — never collapsible.
- The subsequent `### 🤖 Claude Code` section for that follow-up uses the same Claude Code rendering above.

**Type-fix sections (`### 🔧 Fixing type errors…`):**
- When a TypeScript type-fix pass is triggered automatically on Accept, `evolve-sessions.ts` now appends `### 🔧 Fixing type errors…` instead of the user-visible follow-up format.
- Rendered as its own orange-bordered section; title becomes "🔧 Type errors fixed" when done.

**Preview server sections:**
- Active: heading shown with "Starting…" spinner.
- Done: title becomes "🚀 Preview ready"; server startup logs collapse into `<details>` "📋 Server logs"; the preview URL hyperlink is shown directly in the card (replaces the separate "Preview ready" card that existed previously).

**"Changes accepted" banner updated:**
- Now reads "The branch was merged into `<branch>` and the worktree has been removed." instead of the generic version.

**"Restart preview" moved into Available Actions:**
- The "↺ Restart preview" button now lives in the Available Actions panel header (right side), visible when `status === "ready"` and the dev server is running or disconnected.
- The separate "Dev server" status card has been removed; the preview URL is now inside the server section card.
- The disconnected-server warning notice retains its own restart button for that specific error case.

## Why

The previous iteration (all sections collapsed to a single `<details>` line with uniform styling) clashed with the card-based design of the rest of the session page. This pass aligns each section type with the page's visual language:
- Setup belongs inside "Created branch" — it's part of the same operation.
- Claude Code should stream fully while active, then summarize on completion.
- The preview URL deserves to live next to the server startup that produced it.
- Follow-up requests should look like the original request card, not a collapsed log entry.
- Type-fix passes are internal housekeeping — they deserve their own distinct styling so users know what happened.

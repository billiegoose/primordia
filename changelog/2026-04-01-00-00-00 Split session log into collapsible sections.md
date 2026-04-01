# Split session log into collapsible sections

## What changed

`EvolveSessionView.tsx` now parses the `progressText` blob into logical sections and renders each one as its own card.

**New parsing layer (client-side only, fully backward compatible):**
- `parseProgressSections(text)` — splits the progress string at `### ` heading markers, producing one `ParsedSection` per logical unit. The first chunk (before any `###`) becomes the "Setup" section.
- `extractClaudeSummary(content)` — finds the last non-tool-use paragraph before the `✅` marker; used as the collapsed summary for Claude Code sections.
- `extractServerSummary(content)` — extracts the port number or local URL from a server startup section.
- `getSectionSummary(section)` — dispatches to the right extractor and formats a one-liner per section type.

**New `LogSection` component:**
- **Active section** (last section while session is not terminal): expanded card with a coloured border (gray for Setup, blue for Claude Code, emerald for server sections) and an animated "Running…" indicator.
- **Done sections** (all others): `<details>` element, collapsed by default. The `<summary>` row shows the section heading and, when collapsed, the extracted summary (e.g. "✅ 4 steps completed", the last paragraph Claude wrote, or "Ready on port 3001").
- **Follow-up Request sections** (`### 🔄 Follow-up Request`): always rendered as a compact amber callout, never collapsible.

**Removed from the progress block:**
- The single "Local Evolve Progress" wrapper card (replaced by the individual section cards).
- The standalone "Running…" spinner below the card (incorporated into the active section header).
- The "Starting preview server…" indicator (the active server section card shows its own spinner).

## Why

The session log was a single growing wall of text. During a session it's fun to watch, but once done — especially for accepted sessions reviewed later — most of it is noise. The new layout lets you scan the completed stages at a glance and expand any section you care about.

The change is purely in the rendering layer. The `progressText` string stored in SQLite is unchanged, so all existing sessions (in-progress, accepted, rejected) benefit from the visual upgrade immediately.

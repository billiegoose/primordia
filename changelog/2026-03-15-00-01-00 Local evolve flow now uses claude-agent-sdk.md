Replaced the spawned `claude` CLI in the local evolve flow with `@anthropic-ai/claude-agent-sdk`'s `query()` for structured, rich progress output.

**What changed**:
- `lib/local-evolve-sessions.ts`: replaced `spawn('claude', ...)` with `query()` from `@anthropic-ai/claude-agent-sdk`. The session now stores a `progressText` field (formatted markdown) instead of raw `logs`. As the SDK emits `assistant` messages, text blocks are appended verbatim and `tool_use` blocks are summarised as `- 🔧 Read \`path\`` style lines. A `summarizeToolUse()` helper handles the common Claude Code tools (Read, Write, Edit, Glob, Grep, Bash, TodoWrite).
- `app/api/evolve/local/route.ts`: GET endpoint now returns `progressText` instead of `logs`. Error handler updated to use `appendProgress`.
- `components/ChatInterface.tsx`: `LocalEvolveSession` interface renamed `logs` → `progressText`. The polling handler now renders `**Local Evolve Progress**:\n\n{progressText}` — the same pattern as `**CI Progress** ...\n\n{body}` used by the GitHub/CI flow, so both paths have a consistent progress display style.
- `package.json`: added `@anthropic-ai/claude-agent-sdk` dependency.

**Why**: Spawning the `claude` CLI produced unstructured stdout that was truncated to 20 lines. Using the SDK gives structured message events (text blocks, tool-use blocks, result), enabling a formatted progress display that mirrors what the GitHub CI comment shows — checklist setup steps, then Claude's live commentary and tool calls, then a ✅ finish line.

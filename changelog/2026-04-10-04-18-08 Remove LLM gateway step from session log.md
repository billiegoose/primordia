# Remove LLM gateway step from session log

## What changed

Removed the `- [x] Determine LLM source: exe.dev gateway` step that appeared at the top of every evolve session's progress log.

- Deleted the `isGatewayAvailable()` call and `appendProgress` for the LLM source step in `lib/evolve-sessions.ts`.
- Removed the now-unused `import { isGatewayAvailable } from './llm-client'` from `lib/evolve-sessions.ts`.

The `llm-client.ts` module itself and the `check-keys` route are unchanged — gateway detection still works for determining whether `ANTHROPIC_API_KEY` is required.

## Why

Claude Code cannot use the exe.dev LLM gateway (it requires the Anthropic API key directly), so the step was misleading when it showed "exe.dev gateway" — the gateway was never actually used by the evolve pipeline. Removing it avoids user confusion.

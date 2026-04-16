# Fix Pi not reporting invalid API key errors

## What changed

`scripts/pi-worker.ts` now detects and surfaces API-level errors (e.g. invalid
API key) that the Pi SDK silently swallows.

## Why

When Pi runs with an invalid Anthropic API key, the Pi SDK emits a
`message_update` event whose `assistantMessageEvent.type` is `'error'` (with an
`errorMessage` like `"Invalid API key"`), but `session.prompt()` **resolves
successfully** — it does not throw. This meant the session was reported as
`finished` even though nothing was accomplished, giving the user no indication
that their API key was wrong.

Claude Code (via `@anthropic-ai/claude-agent-sdk`) surfaces the error
correctly, making the discrepancy obvious.

## How it was fixed

Two additions to `pi-worker.ts`:

1. A new variable `lastApiErrorMessage` is initialised to `null` before the
   session is created.

2. In the `session.subscribe()` callback, the `message_update` handler now
   includes an `else if (ae.type === 'error')` branch that captures
   `ae.error.errorMessage` (or a generic fallback) into `lastApiErrorMessage`.

3. Immediately after `session.prompt()` resolves, if `lastApiErrorMessage` is
   set, an `Error` is thrown with that message. The existing outer `catch` block
   then writes a `{ type: 'result', subtype: 'error', message: … }` event to the
   session log, which the UI displays as "errored" with the error message — the
   same behaviour as Claude Code.

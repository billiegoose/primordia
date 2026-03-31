# Allow follow-up requests from error state

## What changed

- **`app/api/evolve/local/followup/route.ts`**: The status guard previously rejected follow-up requests unless the session was in `"ready"` state. It now also accepts `"error"` state, allowing the API to accept a retry/recovery request without returning a 400.

- **`components/EvolveSessionView.tsx`**: Added a follow-up panel that renders when `status === "error"`. The panel shows a textarea and submit button so the user can provide additional guidance or ask Claude to retry — it reuses the existing `handleFollowupSubmit` handler, which transitions status to `"running-claude"` and resumes polling. No new state was needed.

## Why

The `error` session state was effectively terminal in the UI — there was no way to recover without navigating away and creating a brand-new session. In practice, errors are often transient (e.g. a flaky tool call, a minor misunderstanding in the prompt) and a follow-up message is enough to resolve them. Making the error state recoverable is consistent with how `disconnected` sessions already allow a restart action.

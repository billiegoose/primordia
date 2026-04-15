# Fix follow-up form model dropdown showing empty

## What changed

- `lib/session-events.ts`: Added optional `harnessId` and `modelId` fields to the `section_start` agent event type.
- `lib/evolve-sessions.ts`: Now stores stable IDs (`harnessId`, `modelId`) alongside human-readable labels (`harness`, `model`) when emitting agent `section_start` events — both for initial runs and follow-up runs.
- `components/EvolveSessionView.tsx`:
  - Imported `HARNESS_OPTIONS` and `MODEL_OPTIONS_BY_HARNESS` from `lib/agent-config`.
  - Extended `SectionGroup` with `harnessId?` and `modelId?` fields.
  - `groupEventsIntoSections` now copies `harnessId`/`modelId` from agent section events.
  - `sessionHarness`/`sessionModel` now use stored IDs first; for old sessions that lack them, falls back to reverse label→ID lookup.

## Why

The follow-up request form was receiving the agent's display labels (e.g. `"Claude Code"`, `"Claude Sonnet 4"`) as `defaultHarness`/`defaultModel` instead of the IDs used by `MODEL_OPTIONS_BY_HARNESS` (e.g. `"claude-code"`, `"claude-sonnet-4-6"`). Because `MODEL_OPTIONS_BY_HARNESS["Claude Code"]` is `undefined`, the Model `<select>` rendered with no `<option>` elements — appearing as a blank dropdown — and submitting the follow-up request sent a null/label string as the model, causing the API call to fail.

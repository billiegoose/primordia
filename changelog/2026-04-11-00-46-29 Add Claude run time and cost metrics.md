# Add Claude run time and cost metrics

## What changed

Four new metrics are now captured for every evolve session and displayed in the session UI:

- **Time** — wall-clock duration of the Claude Code run (from the SDK `duration_ms` field on the result message)
- **Cost** — total API cost in USD (`total_cost_usd` from the SDK result)
- **Tokens in / out** — input and output token counts from the SDK usage object

### Storage

Four new nullable columns were added to the `evolve_sessions` SQLite table via additive migrations (safe on existing databases):

- `duration_ms INTEGER`
- `input_tokens INTEGER`
- `output_tokens INTEGER`
- `cost_usd REAL`

### Data collection (`scripts/claude-worker.ts`)

The worker already iterates over SDK messages; it now captures the `result` message's `duration_ms`, `total_cost_usd`, and `usage.{input,output}_tokens` fields and writes them to the DB on every exit path (success, timeout, user abort, error).

### Streaming (`app/api/evolve/stream/route.ts`)

The SSE stream's terminal (`done: true`) event now includes the four metric fields so live sessions see their metrics appear the moment the run completes, without a page reload.

### UI (`components/EvolveSessionView.tsx`)

A compact **📊 Usage** card is shown below the file-diff section once a session reaches a terminal state (ready / accepted / rejected) and at least one metric is available. It renders:

- Time as `Xs` (< 1 min) or `Xm Ys` (≥ 1 min)
- Cost as `$0.0000` (four decimal places)
- Token counts as `X,XXX in / Y,YYY out`

## Why

The time metric makes it easy to spot regressions in prompt/run performance. The cost metric gives direct visibility into API spend per change, making it much simpler to understand and optimise overall expenditure.

# Add OpenAI model support to pi harness via LLM gateway

## What changed

### Dynamic model list (new)

Model options are no longer hard-coded. They are generated at runtime from the
pi `ModelRegistry`, so they stay current whenever the pi SDK is updated without
any code changes.

- **`lib/pi-model-registry.server.ts`** (new, server-only): calls
  `ModelRegistry.getAll()` and returns per-harness `ModelOption[]` lists.
  - `claude-code` harness: all `anthropic` provider models
  - `pi` harness: all `anthropic` + `openai` provider models (sorted: Anthropic
    first, then OpenAI, alphabetically by name within each group)
  - Also exports `getModelLabel(harness, modelId)` and
    `resolveValidModel(harness, modelId, fallback)` helpers for server-side label
    lookup and preference validation.

- **`app/api/evolve/models/route.ts`** (new): `GET /api/evolve/models` — serves
  the dynamic model list as JSON, with a 60-second client-side cache header.

- **`components/EvolveRequestForm.tsx`**: fetches the model list from
  `/api/evolve/models` on mount and uses it to populate the harness/model
  dropdowns. Silently falls back to an empty list until the fetch completes.

- **`app/evolve/session/[id]/EvolveSessionView.tsx`**: same dynamic fetch for the
  follow-up form's model picker.

- **`lib/user-prefs.ts`**: model preference validation now uses
  `resolveValidModel()` (registry-backed) instead of the static list.

- **`lib/evolve-sessions.ts`**: model label lookup for session log headers now
  uses `getModelLabel()` (registry-backed) instead of the static list.

- **`lib/agent-config.ts`**: `MODEL_OPTIONS_BY_HARNESS` removed. Only
  `HARNESS_OPTIONS`, `DEFAULT_HARNESS`, and `DEFAULT_MODEL` remain.

### OpenAI gateway support (pi harness)

- **`scripts/pi-worker.ts`**:
  - Added `OPENAI_GATEWAY_BASE_URL` (`http://169.254.169.254/gateway/llm/openai`)
  - Added `inferProvider(modelId)` helper — returns `'openai'` for `gpt-*` /
    `o<digit>*` model IDs, `'anthropic'` otherwise
  - Gateway mode: registers both `anthropic` and `openai` providers via the
    exe.dev LLM gateway
  - User API key mode: routes the supplied key to the inferred provider instead
    of hard-coding `'anthropic'`
  - Model lookup uses `modelRegistry.find(modelProvider, modelId)` rather than
    always looking in the anthropic namespace

## Why

The previous implementation hard-coded three model IDs per harness. This meant
the list became stale as the pi SDK added new models, required manual PRs to
update, and missed the newer Anthropic and OpenAI models entirely. The new
approach reads live from `ModelRegistry.getAll()` at request time, so the
dropdown always reflects what the pi SDK actually supports without any code
changes.

# Add OpenRouter as LLM provider for Pi harness

## What changed

The Pi coding agent harness now supports OpenRouter as a third LLM provider, alongside the existing Anthropic and OpenAI (via exe.dev gateway) options.

- **`lib/pi-model-registry.server.ts`** — Added `openrouter` to `HARNESS_PROVIDERS['pi']`, added `OpenRouter` to `PROVIDER_LABELS`, set a placeholder auth key so the pi SDK includes OpenRouter models in its listing, and added two new filter rules:
  - **R5**: Drop model IDs containing `:` (OpenRouter variant suffix tags like `:free`, `:extended`, `:thinking`).
  - **R6**: Drop meta-router / auto-router model IDs (`auto`, `openrouter/*`).

- **`scripts/regenerate-model-registry.ts`** — Mirrored the same changes (providers, labels, auth placeholder, R5/R6 filters) so the generated model list stays in sync.

- **`scripts/pi-worker.ts`** — Updated `inferProvider()` to return `'openrouter'` for model IDs containing `/` (the standard OpenRouter format: `{sub-provider}/{model-id}`, e.g. `google/gemini-2.5-flash`). Direct OpenAI and Anthropic model IDs are recognised first by their well-known prefixes (`gpt-`, `o\d`, `codex-`, `claude-`).

- **`lib/models.generated.json`** — Regenerated. The Pi harness now lists 157 models: 3 Anthropic, 7 OpenAI (direct), and 147 OpenRouter.

## How to use

1. Open the evolve form and expand **Advanced**.
2. Select the **Pi** harness.
3. Pick any model whose ID contains `/` (e.g. `google/gemini-2.5-flash`, `deepseek/deepseek-r1`, `meta-llama/llama-4-maverick`).
4. Set your **OpenRouter API key** via the hamburger menu → "API key". OpenRouter models are not available through the exe.dev LLM gateway; a key is required.

## Why

The pi SDK already supports OpenRouter natively (253 built-in models, base URL `https://openrouter.ai/api/v1`, `openai-completions` API format). No additional SDK changes were needed — just wiring up the provider in Primordia's model registry and provider-inference logic. This gives Pi users access to Google Gemini, Meta Llama, DeepSeek, Mistral Devstral/Codestral, Qwen Coder, xAI Grok, and many other models not available through the direct Anthropic/OpenAI gateways.

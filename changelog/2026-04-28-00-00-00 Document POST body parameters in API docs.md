# Document POST body parameters in API docs

## What changed

Added `requestBody` definitions to all POST and PATCH endpoints in `public/openapi.json` that accept a request body. Previously the API docs only documented query parameters and path parameters, leaving all body parameters undocumented.

### Endpoints updated

**Evolve**
- `POST /evolve` — Full multipart/form-data schema (`request`, `harness`, `model`, `cavemanMode`, `cavemanIntensity`, `encryptedApiKey`, `attachments`) plus JSON fallback (`request`, `encryptedApiKey`).
- `POST /evolve/followup` — Full multipart/form-data schema (`sessionId`, `request`, `harness`, `model`, `encryptedApiKey`, `attachments`) plus JSON fallback.
- `POST /evolve/manage` — JSON body (`action: "accept" | "reject"`, `sessionId`).
- `POST /evolve/abort` — JSON body (`sessionId`).
- `POST /evolve/upstream-sync` — JSON body (`sessionId`, `action: "merge"`).
- `POST /evolve/from-branch` — JSON body (`branchName`).
- `POST /evolve/kill-restart` — JSON body (`sessionId`).

**Admin**
- `POST /admin/rollback` — JSON body (`worktreePath`).
- `PATCH /admin/proxy-settings` — JSON body (`previewInactivityMin`, `diskCleanupThresholdPct`).
- `POST /admin/git-mirror` — JSON body (`url`).
- `POST /admin/permissions` — JSON body (`userId`, `role: "can_evolve"`, `action: "grant" | "revoke"`).

**Auth**
- `POST /auth/cross-device/approve` — JSON body (`tokenId`).

**LLM Key**
- `POST /llm-key/encrypted-key` — JSON body (`iv`, `ciphertext`).

Each request body includes field descriptions, required/optional markers, enums where applicable, and example values.

## Why

The evolve endpoints in particular use multipart/form-data to support file attachments, which is non-obvious from the endpoint name alone. Without documented body schemas, developers using the API reference had no way to know what fields to send in POST requests — making the API docs only half-useful.

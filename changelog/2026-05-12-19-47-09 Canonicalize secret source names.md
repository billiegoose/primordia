# Canonicalize secret source names

Secret storage now uses the same lowercase billing source identifiers everywhere, such as `anthropic-api-key`, `openrouter-api-key`, `claude-subscription`, and `chatgpt-subscription`.

This removes the old parallel uppercase secret type names and the mapping layer that translated between the two. Settings data, secret API routes, client-side secret helpers, and tests now all use the canonical source names directly, matching the `encrypted_credentials.auth_source` values already stored in SQLite.

Follow-up: the Presets settings page now receives its initial preset lists, disabled built-in IDs, credential availability, and model options from the server component so the first meaningful view renders without waiting for client-side fetches.

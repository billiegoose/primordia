# Add Claude Credentials storage dialog

## What changed

Added a new **Claude Credentials** dialog that lets users paste the contents of their `~/.claude/.credentials.json` file and store it encrypted, using the exact same security architecture as the existing API Key dialog.

### New files

- **`app/api/llm-key/encrypted-credentials/route.ts`** — GET/POST/DELETE API route that stores and retrieves the AES-GCM encrypted credentials ciphertext in `user_preferences`, mirroring `encrypted-key/route.ts`.
- **`lib/credentials-client.ts`** — Client-side helpers:
  - `hasStoredCredentials()` — checks whether credentials are configured on this device.
  - `setStoredCredentials(json | null)` — encrypts with a browser-generated AES-256-GCM key (stored in `localStorage`) and persists the ciphertext to the server; passing `null` clears both.
  - `encryptStoredCredentials()` — for future use when credentials need to be sent in requests; uses **hybrid encryption** (ephemeral AES-GCM encrypts the payload, RSA-OAEP encrypts only the 32-byte AES key) to handle credentials.json files that exceed RSA-OAEP's plaintext size limit.
- **`components/CredentialsDialog.tsx`** — Modal dialog with a textarea for pasting credentials.json, JSON validation, status indicator, save/clear actions, and Escape-to-close behaviour.

### Modified files

- **`components/HamburgerMenu.tsx`** — Added a **"Claude Credentials"** menu item (sky blue, `FileKey` icon) below the existing API Key item. Opens `CredentialsDialog` in the same pattern as `ApiKeyDialog`.

## Why

Claude Code's OAuth session (stored in `~/.claude/.credentials.json`) is needed when users want to run evolve requests using their own Claude Code subscription. Storing it with the same browser-side AES-256-GCM + server-ciphertext approach ensures the plaintext credentials never leave the browser unencrypted and are never logged or transmitted in plaintext.

The hybrid encryption in `encryptStoredCredentials()` is a deliberate forward-compatibility measure: because credentials.json can be several hundred bytes, plain RSA-OAEP (max ~190 bytes with 2048-bit keys and SHA-256) would fail; wrapping only the small ephemeral AES key with RSA-OAEP removes that size restriction while keeping the same security guarantees.

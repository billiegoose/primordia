# QR Login Dialog Popup from Hamburger Menu with Credential Key Transfer

## What changed

Added a "Sign in on another device" dialog accessible from the hamburger menu for logged-in users. This implements a new **push flow** for cross-device authentication — where the already-authenticated device generates the QR code instead of the new device.

### New files

- **`components/QrSignInOtherDeviceDialog.tsx`** — Modal dialog that generates a pre-approved QR code. Reads AES encryption key JWKs from localStorage, encrypts each one with the server's ephemeral RSA-OAEP public key (same mechanism used by `ApiKeyDialog` and `CredentialsDialog`), then sends the ciphertexts to the push endpoint. The raw JWK strings never travel over the wire or touch the DB in plaintext.
- **`app/api/auth/cross-device/push/route.ts`** — New `POST /api/auth/cross-device/push` endpoint. Requires an active session. Creates a cross-device token pre-approved with the caller's userId and optional AES key JWKs (one for the API key, one for Claude credentials). Token expires in 10 minutes like pull tokens.
- **`app/login/cross-device-receive/page.tsx`** — Landing page for the scanning device. Auto-polls the token on mount, sets the session cookie (via the poll endpoint), stores any received AES key JWKs in its own localStorage, then redirects home.

### Modified files

- **`components/HamburgerMenu.tsx`** — Added "Sign in on another device" menu item (with QrCode icon, blue hover) under the "Signed in as" section, above "Sign out". Opens `QrSignInOtherDeviceDialog`. Added imports and state.
- **`app/api/auth/cross-device/qr/route.ts`** — Added `?type=push` query param support. Push QR codes point to `/login/cross-device-receive?token=<id>` instead of `/login/approve?token=<id>`.
- **`app/api/auth/cross-device/poll/route.ts`** — When the approved token carries AES key JWK ciphertexts, they are decrypted server-side using `decryptApiKey()` from `lib/llm-encryption.ts` (RSA-OAEP with the server's ephemeral private key) and the plaintext JWK strings are included in the response body (`apiKeyJwk`, `credentialsKeyJwk`) over HTTPS to Device B. Pull-flow tokens have null JWKs so the existing approve flow is unaffected. If the server has restarted between token creation and the poll (different ephemeral keypair), decryption fails gracefully and the keys are simply omitted.
- **`app/api/auth/cross-device/start/route.ts`** — Updated to pass `apiKeyJwk: null, credentialsKeyJwk: null` to satisfy the extended `CrossDeviceToken` type.
- **`lib/db/types.ts`** — Extended `CrossDeviceToken` with `apiKeyJwk: string | null` and `credentialsKeyJwk: string | null`. Added `createCrossDevicePushToken` method to `DbAdapter`.
- **`lib/db/sqlite.ts`** — Added two optional columns to the `cross_device_tokens` table (`api_key_jwk`, `credentials_key_jwk`), with `ALTER TABLE` migration guards for existing databases. Implemented `createCrossDevicePushToken` and updated `getCrossDeviceToken` to return the new fields.
- **`components/auth-tabs/cross-device/index.tsx`** — Updated the description text on the login page to explain the two-device flow and mention that credential encryption keys are copied automatically.

## Why

The previous QR login flow required the new device (phone) to show the QR code and the logged-in device (laptop) to scan it via an approve page. This is counterintuitive — most users expect the logged-in device to show the code.

The new push flow is more natural: you're already logged in on your laptop, you open the hamburger menu, click "Sign in on another device", and show the QR to your phone. Scanning it logs the phone in and also copies your API key and Claude credentials encryption keys so you don't have to re-enter them.

The pull flow (login page → QR tab) is preserved for cases where only the new device is present.

## Security model for AES key transfer

The AES-256-GCM keys (stored in localStorage as JWK strings) are the local half of Primordia's split-encryption scheme — the encrypted ciphertexts live on the server, while only the browser holds the keys. Transferring them must not weaken this.

The push flow uses the same **RSA-OAEP** mechanism as `ApiKeyDialog` and `CredentialsDialog`:

1. **Device A → server (push)**: the dialog fetches the server's ephemeral RSA-OAEP public key (`GET /api/llm-key/public-key`), encrypts each JWK string with `crypto.subtle.encrypt({ name: 'RSA-OAEP' })`, and sends only the ciphertexts. The plaintext JWKs never leave Device A's browser memory.
2. **DB at rest**: `cross_device_tokens.api_key_jwk` and `.credentials_key_jwk` store the RSA-OAEP ciphertexts. A DB dump alone is not sufficient to recover the keys — the server process's ephemeral private key is also required.
3. **Server → Device B (poll)**: the server decrypts the ciphertexts with its RSA-OAEP private key (via `decryptApiKey()`) and returns the plaintext JWK strings in the HTTP response body over HTTPS (TLS). This is equivalent to how the server already handles credentials during agent runs.
4. **Device B → localStorage**: the receive page stores the plaintext JWK strings in localStorage, exactly as if the user had typed their API key or pasted their credentials on that device.

Limitation: since the server's RSA keypair is ephemeral (regenerated on restart), a server restart between token creation and first poll will cause key decryption to fail. In that case the session is still granted but no keys are transferred — the user sees normal behaviour with empty credentials on Device B. The 10-minute token TTL makes this unlikely in practice.

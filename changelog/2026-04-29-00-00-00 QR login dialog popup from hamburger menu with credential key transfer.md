# QR Login Dialog Popup from Hamburger Menu with Credential Key Transfer

## What changed

Added a "Sign in on another device" dialog accessible from the hamburger menu for logged-in users. This implements a new **push flow** for cross-device authentication — where the already-authenticated device generates the QR code instead of the new device. AES encryption keys are transferred directly through the QR code URL fragment, bypassing the server entirely.

### New files

- **`components/QrSignInOtherDeviceDialog.tsx`** — Modal dialog that generates a pre-approved QR code **client-side**. Reads AES encryption key JWKs from localStorage, encodes them as base64url in the URL fragment (`#k1=...&k2=...`), and generates the QR code in the browser using `qrcode`. The keys are embedded only in the QR code — they never leave the browser.
- **`app/api/auth/cross-device/push/route.ts`** — New `POST /api/auth/cross-device/push` endpoint. Requires an active session. Creates a cross-device token pre-approved with the caller's userId. Token expires in 10 minutes like pull tokens. No keys involved.
- **`app/login/cross-device-receive/page.tsx`** — Landing page for the scanning device. Reads AES key JWKs from `window.location.hash` on mount, stores them in localStorage, then clears the fragment from the URL bar (to keep keys out of browser history). Polls the token, sets the session cookie (via the poll endpoint), then redirects home.

### Modified files

- **`components/HamburgerMenu.tsx`** — Added "Sign in on another device" menu item (with QrCode icon, blue hover) under the "Signed in as" section, above "Sign out". Opens `QrSignInOtherDeviceDialog`.
- **`app/api/auth/cross-device/qr/route.ts`** — Added `?type=push` query param support for the pull-flow QR (push-flow QR is now generated client-side and does not use this endpoint).
- **`app/api/auth/cross-device/poll/route.ts`** — Simplified: returns only `{ status, username }` on approval. No longer decrypts or returns AES key JWKs (keys travel via the QR code fragment instead).
- **`app/api/auth/cross-device/start/route.ts`** — Removed obsolete null JWK fields from `createCrossDeviceToken` call.
- **`lib/db/types.ts`** — Removed `apiKeyJwk` and `credentialsKeyJwk` from `CrossDeviceToken` (keys no longer stored in DB). Removed `createCrossDevicePushToken` from `DbAdapter` (push now uses the regular `createCrossDeviceToken` with `status: "approved"`).
- **`lib/db/sqlite.ts`** — Removed `createCrossDevicePushToken` implementation. Simplified `getCrossDeviceToken` to not read JWK columns (columns remain in DB schema but are unused — no migration needed).
- **`components/auth-tabs/cross-device/index.tsx`** — Fixed description text on the login page: accurately describes the pull flow (scan with camera → approval screen) and points users to the hamburger "Sign in on another device" option when they also want credential keys copied.

## Why

The previous QR login flow (pull) required the new device (phone) to show the QR code and the logged-in device (laptop) to scan it via an approve page. This is counterintuitive — most users expect the logged-in device to show the code.

The new push flow is more natural: you're already logged in on your laptop, you open the hamburger menu, click "Sign in on another device", and show the QR to your phone. Scanning it logs the phone in and copies your API key and Claude credentials encryption keys.

The pull flow (login page → QR tab) is preserved for cases where only the new device is present.

## Security model for AES key transfer

The AES-256-GCM keys are the local half of Primordia's split-encryption scheme — the encrypted ciphertexts live on the server, while only the browser holds the keys. Transferring them must not require the server to learn them.

The push flow uses the **URL fragment** (`#`) as a zero-server-involvement transfer channel:

1. **Device A (client-side only)**: the dialog reads AES JWK strings from localStorage, encodes them as base64url, and appends them to the receive URL as fragment parameters (`#k1=...&k2=...`). The QR code is generated entirely in the browser using `qrcode`. The server receives only a `POST /push` request with no key material.

2. **QR code as physical channel**: the fragment-bearing URL is encoded into the QR code image displayed on Device A's screen. Device B scans the QR with its camera; the OS/browser opens the URL locally. The fragment portion (`#...`) is **never sent to the server** — HTTP requests strip it before sending.

3. **Device B (client-side only)**: the receive page reads `window.location.hash` on mount, decodes the base64url values, stores the JWK strings in localStorage, and immediately clears the hash from the URL bar via `history.replaceState` to prevent the keys from persisting in browser history.

4. **Session**: Device B gets a session by polling the pre-approved token. That exchange contains only `{ status, username }` — no key material.

This design means a server compromise, DB dump, or network intercept cannot recover the AES keys transferred via the push flow. The only attack surface is physical (someone photographing Device A's screen while the QR code is visible).

The DB columns `api_key_jwk` and `credentials_key_jwk` remain in the SQLite schema (from the migration that added them) but are never written to or read from.

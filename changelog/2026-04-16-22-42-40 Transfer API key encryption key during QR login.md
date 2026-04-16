# Transfer API key encryption key during QR login

## What changed

When a user approves a QR-code cross-device login, the approver device now
transfers its AES-256-GCM encryption key to the requester device. After the
login completes, the newly signed-in device can immediately use the user's
stored Anthropic API key without needing to re-enter it.

### Protocol (ECDH + AES-GCM key wrapping)

1. **Requester** (new device) generates an ephemeral ECDH P-256 key pair when
   starting the QR flow and sends its public key to the server with the token.
2. **Approver** (existing device) fetches the requester's public key from a new
   `GET /api/auth/cross-device/token-info` endpoint when the approve page loads.
3. **Approver** reads its own AES key from `localStorage`, generates its own
   ephemeral ECDH key pair, derives a shared secret (ECDH → HKDF-SHA-256 →
   AES-GCM), and wraps the AES key with it.
4. **Approver** sends its ECDH public key and the wrapped AES key to the server
   as part of the approve POST.
5. **Requester** receives both values in the next poll response (status:
   "approved"), derives the same shared secret using its private key, unwraps
   the AES key, and writes it to `localStorage` before the page redirects.

### Security properties

- The server never sees the plaintext AES key. It only stores the wrapped
  ciphertext and the two ECDH public keys (which are safe to expose).
- The shared ECDH secret is never transmitted — only the public keys are.
- The wrapping key is derived via HKDF with a domain-separation label
  (`"primordia-aes-key-transfer"`), preventing key reuse.
- The ECDH key pairs are ephemeral: generated fresh for each QR flow and
  discarded after use.
- If either device has no AES key (no API key configured), or if any crypto
  step fails, the transfer is skipped silently — login still succeeds.

## Files changed

- **`lib/key-transfer-client.ts`** *(new)* — client-side ECDH utilities:
  `generateEcdhKeyPair`, `exportPublicKeyJwk`, `importPublicKeyJwk`,
  `deriveWrapKey`, `wrapBytes`, `unwrapBytes`.
- **`lib/db/types.ts`** — added `requesterEcdhPublicKey`, `approverEcdhPublicKey`,
  `wrappedAesKey` fields to `CrossDeviceToken`; updated `DbAdapter.approveCrossDeviceToken`
  signature to accept optional key-transfer data.
- **`lib/db/sqlite.ts`** — added three new columns to `cross_device_tokens` (with
  `ALTER TABLE` migrations for existing databases); updated `createCrossDeviceToken`,
  `getCrossDeviceToken`, and `approveCrossDeviceToken` queries.
- **`app/api/auth/cross-device/start/route.ts`** — accepts optional
  `requesterEcdhPublicKey` in the POST body and stores it with the token.
- **`app/api/auth/cross-device/token-info/route.ts`** *(new)* — authenticated GET
  endpoint returning the requester's ECDH public key for a pending token.
- **`app/api/auth/cross-device/approve/route.ts`** — accepts optional
  `approverEcdhPublicKey` and `wrappedAesKey` and stores them on approval.
- **`app/api/auth/cross-device/poll/route.ts`** — includes `approverEcdhPublicKey`
  and `wrappedAesKey` in the "approved" poll response.
- **`app/login/LoginClient.tsx`** — generates the ECDH key pair at QR flow start,
  keeps the private key in a `useRef`, and unwraps the AES key from the poll
  response on approval.
- **`app/login/approve/page.tsx`** — fetches the requester's ECDH public key
  alongside the session check, and encrypts/transfers the AES key on approval.

## Why

Previously, after a successful QR-code login the user would see "No API key set"
on the new device even though they had configured one on the approving device.
They had to re-enter their API key manually. This change makes the experience
seamless — the API key encryption key is securely transferred so the new device
can use the existing server-stored ciphertext immediately.

// lib/cross-device-creds.ts
// Client-side ECDH P-256 helpers for credential transfer in the pull flow.
//
// When the requester device (no session) shows a QR code, it embeds an ephemeral
// ECDH P-256 public key in the QR URL. The approver device reads that key,
// encrypts its own AES credentials with a shared ECDH secret, and sends the
// ciphertext through the server. Only the requester (who holds the matching
// private key in memory) can decrypt.
//
// Used by:
//   - components/auth-tabs/cross-device/index.tsx  (requester: keygen + decrypt)
//   - app/login/approve/page.tsx                   (approver: encrypt)
//   - components/QrSignInOtherDeviceDialog.tsx      (approver: encrypt in Approve tab)

/** URL-safe base64 encode (no padding). */
export function b64uEncodeAb(ab: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(ab)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/** URL-safe base64 decode to ArrayBuffer. */
export function b64uDecodeAb(s: string): ArrayBuffer {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

/** Generate an ephemeral ECDH P-256 keypair for the requester (no-session) device. */
export async function generateEcdhKeypair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
}

/**
 * Export a P-256 ECDH public key as URL-safe base64 (raw, 65 bytes → ~87 chars).
 * Small enough to embed as a URL query parameter in the QR code.
 */
export async function exportEcdhPubKeyB64u(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", publicKey);
  return b64uEncodeAb(raw);
}

/** The encrypted credential bundle stored on the server and returned by the poll route. */
export interface EncryptedCredBundle {
  /** Approver's ephemeral ECDH public key (base64url, raw P-256 = 65 bytes). */
  bPubKey: string;
  /** AES-GCM IV (base64url, 12 bytes). */
  iv: string;
  /** AES-GCM ciphertext of JSON `{ k1: string|null, k2: string|null }` (base64url). */
  ciphertext: string;
}

/**
 * Called on the approver device. Encrypts its own AES credentials for the
 * requester device using ECDH P-256 key exchange.
 *
 * @param requesterPubB64u  The requester's ephemeral public key (from `pk=` URL param).
 * @param k1                primordia_aes_key JWK string (or null).
 * @param k2                primordia_credentials_aes_key JWK string (or null).
 * @returns Encrypted bundle, or null if there are no credentials to transfer.
 */
export async function encryptCredentialsForRequester(
  requesterPubB64u: string,
  k1: string | null,
  k2: string | null
): Promise<EncryptedCredBundle | null> {
  if (!k1 && !k2) return null;

  const requesterPubKey = await crypto.subtle.importKey(
    "raw",
    b64uDecodeAb(requesterPubB64u),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Generate an ephemeral ECDH keypair for the approver side.
  const bPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );

  // Derive a shared AES-256-GCM key via ECDH.
  const sharedKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: requesterPubKey },
    bPair.privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify({ k1, k2 }));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, sharedKey, plaintext);

  const bPubRaw = await crypto.subtle.exportKey("raw", bPair.publicKey);

  return {
    bPubKey: b64uEncodeAb(bPubRaw),
    iv: b64uEncodeAb(iv.buffer),
    ciphertext: b64uEncodeAb(ciphertext),
  };
}

/**
 * Called on the requester device after the poll returns an encrypted bundle.
 * Decrypts using the ephemeral private key kept in memory.
 *
 * @param privateKey  The requester's ephemeral ECDH private key (never leaves memory).
 * @param bundle      The encrypted bundle from the server.
 */
export async function decryptReceivedCredentials(
  privateKey: CryptoKey,
  bundle: EncryptedCredBundle
): Promise<{ k1: string | null; k2: string | null }> {
  const bPubKey = await crypto.subtle.importKey(
    "raw",
    b64uDecodeAb(bundle.bPubKey),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: bPubKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const iv = new Uint8Array(b64uDecodeAb(bundle.iv));
  const ciphertext = b64uDecodeAb(bundle.ciphertext);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, sharedKey, ciphertext);

  const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as {
    k1?: string | null;
    k2?: string | null;
  };
  return { k1: parsed.k1 ?? null, k2: parsed.k2 ?? null };
}

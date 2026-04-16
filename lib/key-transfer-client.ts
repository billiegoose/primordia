"use client";

// lib/key-transfer-client.ts
// Client-side ECDH utilities for transferring the AES encryption key from an
// approver device to a requester device during QR-code cross-device login.
//
// Protocol:
//   1. Requester generates an ephemeral ECDH P-256 key pair and sends its
//      public key to the server when creating the cross-device token.
//   2. Approver fetches the requester's public key, generates its own ephemeral
//      ECDH key pair, and derives a shared secret.
//   3. Approver wraps (encrypts) its AES-GCM storage key with an AES-GCM key
//      derived from the ECDH shared secret via HKDF.
//   4. Approver sends its ECDH public key + wrapped AES key to the server.
//   5. Requester receives both via the poll response, derives the same shared
//      secret, and unwraps the AES key into localStorage.
//
// The server never sees the plaintext AES key — only the ECDH public keys
// (which are fine to expose) and the AES-GCM ciphertext (useless without the
// shared ECDH secret that only the two devices can derive).

const HKDF_INFO = new TextEncoder().encode("primordia-aes-key-transfer");
const HKDF_SALT = new Uint8Array(32); // all-zero salt is fine for ECDH-derived material

/** Generates an ephemeral ECDH P-256 key pair. */
export async function generateEcdhKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true, // extractable so the public key can be exported as JWK
    ["deriveBits"],
  );
}

/** Exports a CryptoKey as a JWK object. */
export async function exportPublicKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

/** Imports a JWK object as an ECDH P-256 public key (not extractable). */
export async function importPublicKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [], // public keys have no usages in ECDH — the private key does the work
  );
}

/**
 * Derives the AES-GCM wrapping key from an ECDH key pair.
 * Both devices must use the same (myPrivateKey, theirPublicKey) pair to arrive
 * at the same shared secret and therefore the same wrap key.
 */
export async function deriveWrapKey(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey,
): Promise<CryptoKey> {
  // Step 1: ECDH → 256 bits of shared secret material
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    256,
  );

  // Step 2: Import as HKDF key material
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey"],
  );

  // Step 3: HKDF → AES-GCM 256-bit wrap key
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: HKDF_SALT, info: HKDF_INFO },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypts arbitrary bytes with the wrap key.
 * Returns a JSON-serialisable bundle `{ iv, ciphertext }` with base64 values.
 */
export async function wrapBytes(
  wrapKey: CryptoKey,
  plaintext: Uint8Array,
): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrapKey,
    plaintext,
  );
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  };
}

/**
 * Decrypts a bundle produced by `wrapBytes`.
 * Returns the plaintext bytes, or throws if decryption fails.
 */
export async function unwrapBytes(
  wrapKey: CryptoKey,
  bundle: { iv: string; ciphertext: string },
): Promise<Uint8Array> {
  const iv = Uint8Array.from(atob(bundle.iv), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(bundle.ciphertext), (c) => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, wrapKey, ct);
  return new Uint8Array(plaintext);
}

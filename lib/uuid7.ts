// lib/uuid7.ts — UUID v7 generator (RFC 9562)
// UUID v7 embeds a Unix timestamp (ms) in the first 48 bits, making it
// lexicographically sortable by creation time.
// Written without BigInt literals so it compiles under ES2017 targets.

function hex(n: number, width: number): string {
  return n.toString(16).padStart(width, "0");
}

export function generateUuid7(): string {
  const now = Date.now(); // Unix ms timestamp

  // 10 random bytes for rand_a (12 bits) + rand_b (62 bits)
  const rand = crypto.getRandomValues(new Uint8Array(10));

  // ── High 64 bits (as two 32-bit halves) ──────────────────────────────────
  // Bits 0–47  : unix_ts_ms
  // Bits 48–51 : version = 0x7
  // Bits 52–63 : rand_a (12 random bits)
  const tsHigh = Math.floor(now / 0x100000000); // top 16 bits of ts (bits 32–47)
  const tsLow = now >>> 0; // bottom 32 bits of ts (bits 0–31)

  // rand_a: top 12 bits from rand bytes 0–1
  const randA = ((rand[0] << 4) | (rand[1] >> 4)) & 0xfff;

  // Upper 32 bits of the UUID: ts bits 47..16
  const hi1 = (tsHigh << 16) | (tsLow >>> 16);
  // Lower 32 bits of the upper half: ts bits 15..0 + version(4) + rand_a(12)
  const hi2 = ((tsLow & 0xffff) << 16) | (0x7000) | randA;

  // ── Low 64 bits (as two 32-bit halves) ───────────────────────────────────
  // Bits 64–65 : variant = 0b10 (i.e. 0x8..0xb in the top nibble of byte 8)
  // Bits 66–127: rand_b (62 random bits from rand bytes 1–9)
  const lo1 =
    (((rand[1] & 0x3f) | 0x80) << 24) | // variant bits + 6 rand bits
    (rand[2] << 16) |
    (rand[3] << 8) |
    rand[4];
  const lo2 =
    (rand[5] << 24) |
    (rand[6] << 16) |
    (rand[7] << 8) |
    rand[8];

  const h1 = hex(hi1 >>> 0, 8);
  const h2 = hex(hi2 >>> 0, 8);
  const l1 = hex(lo1 >>> 0, 8);
  const l2 = hex(lo2 >>> 0, 8);

  return `${h1}-${h2.slice(0, 4)}-${h2.slice(4, 8)}-${l1.slice(0, 4)}-${l1.slice(4, 8)}${l2}`;
}

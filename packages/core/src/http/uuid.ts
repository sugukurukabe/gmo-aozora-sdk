import { randomBytes } from 'node:crypto';

/**
 * Generate a UUIDv7 — time-ordered UUID for request IDs.
 * Format: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
 * First 48 bits = Unix timestamp in milliseconds (sortable).
 */
export function generateUuidV7(): string {
  const ms = BigInt(Date.now());

  // 48-bit timestamp
  const tsHigh = Number((ms >> 16n) & 0xffffffffn);
  const tsLow = Number(ms & 0xffffn);

  // Random bits
  const rand = randomBytes(10);

  // ver=7, var=0b10
  const ver7 = 0x7000 | ((((rand[0] ?? 0) << 8) | (rand[1] ?? 0)) & 0x0fff);
  const varBits = 0x8000 | ((((rand[2] ?? 0) << 8) | (rand[3] ?? 0)) & 0x3fff);

  const hex = [pad8(tsHigh), pad4(tsLow), pad4(ver7), pad4(varBits), toHex(rand.subarray(4))].join(
    '-',
  );

  return hex;
}

function pad8(n: number): string {
  return n.toString(16).padStart(8, '0');
}

function pad4(n: number): string {
  return n.toString(16).padStart(4, '0');
}

function toHex(buf: Uint8Array): string {
  return Buffer.from(buf).toString('hex');
}

export const newId = () => crypto.randomUUID();

/**
 * Shorter, URL-friendly id for meets — surfaced in the `?meet=` query param,
 * so 8 hex chars (plenty of headroom for the handful of meets a single user
 * creates) keeps that URL readable rather than carrying a full UUID.
 */
export const newMeetId = () => crypto.randomUUID().slice(0, 8);

/**
 * Deterministic 8-hex-char id (FNV-1a 32-bit) derived from a stable string,
 * e.g. a meet template's source EV3 URL — gives templates a `?template=`
 * value as short as a meet's without needing a hand-picked literal id that
 * could drift from the template it names.
 */
export function hashId(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

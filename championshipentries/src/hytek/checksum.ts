/**
 * HY3 record checksum.
 *
 * Reverse-engineered and verified against 135 real records across two
 * independent sample files (100% match, zero mismatches) — see
 * docs/hytek/hy3-spec.md §2 for the full derivation. The public reference
 * implementation (SwimComm/hytek-parser) does not implement this at all.
 */

/** Compute the 2-character checksum for a 128-character HY3 record body. */
export function hy3Checksum(body: string): string {
  let sumEven = 0
  let sumOdd = 0
  for (let i = 0; i < body.length; i++) {
    const code = body.charCodeAt(i)
    if (i % 2 === 0) sumEven += code
    else sumOdd += code
  }
  const total = sumEven + sumOdd * 2
  const divided = Math.floor(total / 21)
  const raw = (divided + 205) % 100
  const tens = Math.floor(raw / 10)
  const ones = raw % 10
  // Digits are written in reverse order: ones digit first, tens digit second.
  return `${ones}${tens}`
}

/** True if `line` (130 chars: 128-char body + 2-char checksum) has a valid checksum. */
export function isValidHy3Line(line: string): boolean {
  if (line.length !== 130) return false
  return hy3Checksum(line.slice(0, 128)) === line.slice(128, 130)
}

/** Append the checksum to a 128-char record body, producing the full 130-char line content (no CRLF). */
export function appendHy3Checksum(body: string): string {
  const padded = body.length >= 128 ? body.slice(0, 128) : body.padEnd(128, ' ')
  return padded + hy3Checksum(padded)
}

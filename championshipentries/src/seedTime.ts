// A seed time is either `M:SS.hh` (single-digit minutes) or `S.hh` / `SS.hh` /
// `SSS.hh` (no minutes). The hundredths are optional (or partial) on entry and
// auto-completed to two digits, so `2:15`, `2:15.`, and `2:15.5` all become
// `2:15.50`; likewise `1` becomes `1.00`.
const MINUTE_SECONDS_RE = /^(\d):(\d{2})(?:\.(\d{0,2}))?$/
const SECONDS_ONLY_RE = /^(\d{1,3})(?:\.(\d{0,2}))?$/

/**
 * Normalize a user-typed seed time to `\d:\d{2}\.\d{2}` or `\d{1,3}\.\d{2}`,
 * completing the hundredths part if it was omitted or partial. Returns
 * undefined if the input doesn't match either shape (edit should be rejected).
 */
export function normalizeSeedTime(raw: string): string | undefined {
  const value = raw.trim()
  if (value === '') return ''

  const msMatch = value.match(MINUTE_SECONDS_RE)
  if (msMatch) {
    const [, minutes, seconds, hundredths] = msMatch
    return `${minutes}:${seconds}.${(hundredths ?? '').padEnd(2, '0')}`
  }

  const sMatch = value.match(SECONDS_ONLY_RE)
  if (sMatch) {
    const [, seconds, hundredths] = sMatch
    return `${seconds}.${(hundredths ?? '').padEnd(2, '0')}`
  }

  return undefined
}

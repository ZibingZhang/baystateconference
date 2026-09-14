// Matches `query`'s characters, in order, anywhere within `label`
// (case-insensitive), returning a relevance score, or `null` if `query` isn't
// a subsequence of `label` at all.
//
// Scoring favors, in rough order of weight:
//   - consecutive runs of matched characters (and the longer the run, the
//     more each additional character in it is worth), so "abhrs" scores
//     "ABoxborough" higher for the "ab" prefix than scattering across it
//   - matches that land on a word boundary (start of label, or right after a
//     space/hyphen/etc., or a lower->upper camelCase transition), so
//     "abhrs" picks out the leading letter of each word in
//     "Acton-Boxborough Regional High School"
//   - matches at the very start of the label
export function scoreSubsequenceMatch(query: string, label: string): number | null {
  if (!query) return 0
  const q = query.toLowerCase()
  const l = label.toLowerCase()

  let qi = 0
  let score = 0
  let consecutiveRun = 0
  let previousMatchIndex = -1

  for (let li = 0; li < l.length && qi < q.length; li += 1) {
    if (l[li] !== q[qi]) continue

    consecutiveRun = li === previousMatchIndex + 1 ? consecutiveRun + 1 : 1

    let charScore = 1
    charScore += consecutiveRun * 3

    const prevChar = label[li - 1]
    const isWordBoundary =
      li === 0 || !/[a-z0-9]/i.test(prevChar) || (/[a-z]/.test(prevChar) && /[A-Z]/.test(label[li]))
    if (isWordBoundary) charScore += 5

    if (li === 0) charScore += 5

    score += charScore
    previousMatchIndex = li
    qi += 1
  }

  return qi === q.length ? score : null
}

// Filters `options` down to those whose label is a subsequence match for
// `query`, sorted best-match-first. Shared by MUI Autocomplete `filterOptions`
// callbacks that otherwise all repeat the same score/filter/sort dance.
export function filterBySubsequence<T>(options: T[], query: string, getLabel: (option: T) => string): T[] {
  return options
    .map((option) => ({ option, score: scoreSubsequenceMatch(query, getLabel(option)) }))
    .filter((entry): entry is { option: T; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.option)
}

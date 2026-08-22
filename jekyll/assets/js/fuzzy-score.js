// Subsequence match with a relevance score, roughly fzf-style: null means no
// match, otherwise higher is a better match. Consecutive characters and
// matches at the start of a word score higher; gaps between matched
// characters are penalized so tighter, earlier matches rank first.
//
// This has to consider every place each query character could match, not
// just the first one greedily found left-to-right — e.g. for query "award"
// against "jack mcdonald memorial award", greedily latching onto the stray
// "a" in "jack" leaves a huge gap to the real "award" at the end, scoring
// far worse than it should. Small dynamic program over (text index, query
// index) finds the best-scoring alignment instead of the first one.
function fuzzyScore(query, text) {
  if (query.length === 0) return 0;

  const n = text.length;
  let prevRow = null; // best score of matching query[0..j-1] ending exactly at each text index
  let bestForRow = null;

  for (let j = 0; j < query.length; j++) {
    const currRow = new Array(n).fill(null);

    for (let i = 0; i < n; i++) {
      if (text[i] !== query[j]) continue;

      let best = null;
      if (j === 0) {
        best = -i; // fewer skipped characters before the first match is better
      } else if (prevRow) {
        for (let k = 0; k < i; k++) {
          if (prevRow[k] === null) continue;
          let candidate = prevRow[k] - (i - k - 1);
          if (k === i - 1) candidate += 15; // consecutive-match bonus
          if (best === null || candidate > best) best = candidate;
        }
      }
      if (best === null) continue;

      if (i === 0 || /[\s\-_]/.test(text[i - 1])) best += 10; // word-boundary bonus
      currRow[i] = best;
    }

    bestForRow = currRow.some((v) => v !== null) ? currRow : null;
    if (!bestForRow) return null; // query[0..j] can't be matched at all

    prevRow = bestForRow;
  }

  return Math.max(...bestForRow.filter((v) => v !== null));
}

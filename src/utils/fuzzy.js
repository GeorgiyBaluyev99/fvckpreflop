// Contiguous substring match (not a loose subsequence): the token must
// appear literally, in order and unbroken, inside text. This is far more
// precise than subsequence fuzzy matching once names share a lot of
// letters (sb / bb / btn / hubb / sbb all overlap heavily) - subsequence
// matching was returning near-everything for short tokens like "sbb".
// Score rewards earlier and longer matches.
export function substringScore(token, text) {
  const idx = text.indexOf(token);
  if (idx === -1) return -1;
  return token.length * 10 - idx * 0.1;
}

// Explicit position shortcuts, recognized only as the FIRST word typed.
// These restrict results to scenarios where that position is the one
// ACTING (its id starts with the prefix), not just mentioned as the
// opponent (e.g. typing "sb" must not surface "BBvsSBlimp", where BB acts
// and SB is merely the opponent).
const POSITION_SHORTCUTS = {
  btn: 'BTN',
  bu: 'BTN',
  sb: 'SB',
  bb: 'BB',
  hb: 'HUBB',
  hs: 'HUSB',
  sbb: 'SBB',
  svl: 'SBvsBTNlimp',
  svm: 'SBvsBTNmr',
  svo: 'SBvsBTNOS',
  bsl: 'BBvsSBlimp',
  bsm: 'BBvsSBmr',
  bso: 'BBvsSBOS',
  bbl: 'BBvsBTNlimp',
  bbm: 'BBvsBTNmr',
  bbo: 'BBvsBTNOS',
  hvl: 'HUBBvsLimp',
  hvm: 'HUBBvsMR',
  hv3: 'HUBBvs3x',
  hvo: 'HUBBvsOS',
};

// Shortcuts above whose prefix must match the FULL scenario id exactly
// (case-insensitive), not just a leading substring - e.g. "sbb" must
// only ever match the SBB scenario, never accidentally something else
// that happens to start with those letters.
const EXACT_SHORTCUTS = new Set([
  'sbb', 'svl', 'svm', 'svo', 'bsl', 'bsm', 'bso',
  'bbl', 'bbm', 'bbo', 'hvl', 'hvm', 'hv3', 'hvo',
]);

// Single-key hotkeys (one keystroke = jump straight to that scenario).
// Exported so the UI can render a legend of them next to the search box.
export const SINGLE_KEY_SHORTCUTS = {
  q: 'BTN',
  w: 'SBB',
  e: 'SBvsBTNlimp',
  r: 'SBvsBTNmr',
  t: 'SBvsBTNOS',
  a: 'BBvsSBlimp',
  s: 'BBvsSBmr',
  d: 'BBvsSBOS',
  f: 'BBvsBTNlimp',
  g: 'BBvsBTNmr',
  j: 'BBvsBTNOS',
  z: 'HUSB',
  x: 'HUBBvsLimp',
  c: 'HUBBvsMR',
  v: 'HUBBvs3x',
  n: 'HUBBvsOS',
};

// Splits a raw whitespace-separated word into its letter-runs and
// digit-runs, so typing "sbb13" (no space) behaves exactly like "sbb 13":
// the letters are matched against the scenario name, the digits against
// the stack depth - instead of being treated as one unmatchable blob.
function splitLettersAndDigits(word) {
  return word.match(/[a-z.]+|\d+/gi) || [word];
}

// Query is split into words; each word must match independently.
// Pure-digit words (e.g. "19") are matched by exact containment against
// entry.numbers (the individual stack depths a bucket covers) instead of
// being text-matched - this keeps wide ranges like 14-99 from being
// penalized just for spanning many numbers, and gives an exact, reliable
// "is my stack size in this bucket" lookup.
function matchEntry(entry, tokens) {
  let score = 0;
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      const num = parseInt(token, 10);
      if (!entry.numbers.includes(num)) return -1;
      score += 5; // exact numeric match is a strong, reliable signal
      continue;
    }
    const sub = substringScore(token, entry.coreText);
    if (sub < 0) return -1;
    score += sub;
  }
  return score;
}

export function fuzzyFilter(entries, query, limit = 8, stickyScenarioId = null) {
  const q = query.trim().toLowerCase();
  if (!q) return { results: entries.slice(0, limit), resolvedScenarioId: null };
  const words = q.split(/\s+/).filter(Boolean);

  // Shortcuts (e.g. "hv3", "sbb") are checked against the whole FIRST
  // WORD before it gets split into letter/digit runs - otherwise a
  // shortcut like "hv3" would be chopped into "hv"+"3" and never match
  // the "hv3" key.
  let candidates = entries;
  let remainingWords = words;
  const shortcutKey = words[0];
  const shortcutPrefix = POSITION_SHORTCUTS[shortcutKey];

  // Single-key hotkeys: one letter, optionally followed immediately by
  // digits (e.g. "s", "s13") - checked before the multi-letter word
  // shortcuts above since a single letter like "s" would never appear
  // there anyway.
  const singleKeyMatch = /^([a-z])(\d*)$/i.exec(shortcutKey || '');
  const singleKeyScenario = singleKeyMatch && SINGLE_KEY_SHORTCUTS[singleKeyMatch[1]];

  // "Sticky position": once a query has explicitly resolved to exactly one
  // scenario (via a single-key hotkey or an exact word shortcut), we report
  // that scenario back to the caller. If the caller passes it back in as
  // stickyScenarioId on a LATER query that's pure digits with no position
  // shortcut of its own, we keep filtering inside that same scenario - so
  // once you've locked onto a position you can just keep typing stack sizes.
  let resolvedScenarioId = null;

  if (singleKeyScenario) {
    candidates = entries.filter((e) => e.scenarioId.toUpperCase() === singleKeyScenario.toUpperCase());
    remainingWords = singleKeyMatch[2] ? [singleKeyMatch[2], ...words.slice(1)] : words.slice(1);
    resolvedScenarioId = singleKeyScenario;
  } else if (shortcutPrefix) {
    if (EXACT_SHORTCUTS.has(shortcutKey)) {
      candidates = entries.filter((e) => e.scenarioId.toUpperCase() === shortcutPrefix.toUpperCase());
      resolvedScenarioId = shortcutPrefix;
    } else {
      candidates = entries.filter((e) => e.scenarioId.toUpperCase().startsWith(shortcutPrefix));
      // Generic prefixes like "sb"/"bb"/"btn" can span several scenarios -
      // only treat as a sticky lock if they happen to resolve to just one.
      const distinctScenarios = new Set(candidates.map((e) => e.scenarioId));
      if (distinctScenarios.size === 1) resolvedScenarioId = [...distinctScenarios][0];
    }
    remainingWords = words.slice(1);
  } else if (stickyScenarioId && words.every((w) => /^\d+$/.test(w))) {
    // No position shortcut typed this time, but every word is a bare
    // number - assume the user is still targeting the previously locked
    // position and just wants a different stack depth within it.
    candidates = entries.filter((e) => e.scenarioId === stickyScenarioId);
    resolvedScenarioId = stickyScenarioId;
  }
  const matchTokens = remainingWords.flatMap(splitLettersAndDigits);

  const scored = [];
  for (const entry of candidates) {
    const score = matchTokens.length === 0 ? 0 : matchEntry(entry, matchTokens);
    if (score >= 0) scored.push({ entry, score });
  }
  // Tie-break: same scenario stays grouped together, deepest stacks first,
  // so a query like "sbb" lists all of its buckets in a stable, readable order.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.entry.scenarioId !== b.entry.scenarioId) return a.entry.scenarioId.localeCompare(b.entry.scenarioId);
    return b.entry.bbSort - a.entry.bbSort;
  });
  return { results: scored.slice(0, limit).map((s) => s.entry), resolvedScenarioId };
}

import chartsConfig from './charts.json';

// The "bb" field on a stack can be a single depth (15), a range
// ("22-99", "18-21", "1-2"), or - for reg charts, where buckets get much
// narrower - a decimal range ("6.5-6", "5.9-5.5"). Ranges can also be
// written high-to-low ("9-7") rather than low-to-high; both directions
// are normalized here. This parses any of those shapes into a consistent
// { label, min, max, numbers } so the UI and search can treat them the
// same way. "numbers" is every INTEGER stack depth covered by the bucket
// (used so typing an exact stack size like "19" finds the "18-21" bucket
// that contains it) - for narrow decimal buckets that don't fully contain
// any integer (e.g. "5.9-5.5"), numbers is simply empty, which is fine:
// that bucket just isn't reachable by typing a bare integer.
export function parseBB(bb) {
  const str = String(bb);
  const match = str.match(/^([\d.]+)-([\d.]+)$/);
  if (match) {
    const a = parseFloat(match[1]);
    const b = parseFloat(match[2]);
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const numbers = [];
    for (let n = Math.ceil(min); n <= Math.floor(max); n++) numbers.push(n);
    return { label: `${str}bb`, min, max, numbers };
  }
  const n = parseFloat(str);
  return { label: `${str}bb`, min: n, max: n, numbers: [n] };
}

// Flattens the nested scenarios/stacks config into a flat list of
// selectable entries: one per (scenario, stack) pair, each carrying
// its available variants (open / vsshove / vs3bet3x / ...).
// This flat shape is what the fuzzy search command palette operates on.
//
// `population` selects which parallel data set to flatten: 'fish' (the
// default, using scenario.stacks - unchanged, original data) or 'reg'
// (using scenario.regStacks, a separate grid of stack buckets with its
// own boundaries and its own branches, added only for the scenarios that
// have reg charts so far). A scenario with no regStacks simply contributes
// no entries when population is 'reg' - same "nothing matches" behavior
// the search already has, no special fallback to fish.
//
// Some scenarios are "universal" (scenario.universal === true): they have
// a single chart covering every stack depth (e.g. facing a squeeze), so
// there's no stacks array at all - just one entry with no bb. Universal
// scenarios don't currently support a reg variant.
export function getEntries(population = 'fish') {
  const entries = [];
  for (const scenario of chartsConfig.scenarios) {
    if (scenario.universal) {
      if (population !== 'fish') continue;
      entries.push({
        id: scenario.id,
        scenarioId: scenario.id,
        label: scenario.label,
        bb: null,
        bbLabel: '',
        bbSort: 0,
        coreText: `${scenario.label} ${scenario.id}`.toLowerCase(),
        numbers: [],
        variants: scenario.variants,
      });
      continue;
    }
    const stacks = population === 'reg' ? scenario.regStacks : scenario.stacks;
    if (!stacks) continue;
    for (const stack of stacks) {
      const { label: bbLabel, max, numbers } = parseBB(stack.bb);
      entries.push({
        id: `${scenario.id}_${stack.bb}bb_${population}`,
        scenarioId: scenario.id,
        label: scenario.label,
        bb: stack.bb,
        bbLabel,
        bbSort: max,
        coreText: `${scenario.label} ${scenario.id} ${bbLabel}`.toLowerCase(),
        numbers,
        variants: stack.variants,
      });
    }
  }
  return entries;
}

export const VARIANT_LABELS = {
  open: 'Open',
  vsshove: 'vs Shove',
  'vs3bet2.5x': 'vs 3bet 2.5x',
  vs3bet3x: 'vs 3bet 3x',
};

// Preferred cycle order; any variant not listed here is appended after.
export const VARIANT_ORDER = ['open', 'vsshove', 'vs3bet2.5x', 'vs3bet3x'];

export function orderedVariantKeys(variants) {
  const keys = Object.keys(variants);
  return keys.sort((a, b) => {
    const ia = VARIANT_ORDER.indexOf(a);
    const ib = VARIANT_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

// Reg-chart variant keys bake the literal raise size into the slug itself
// (e.g. "vs-bb-iso-4.5bb") since that size changes bucket to bucket - no
// manual VARIANT_LABELS entry per exact size. Falls back to VARIANT_LABELS
// first (for the original fish keys like "open"/"vsshove"), then prettifies
// any hyphenated slug by spacing out its parts and fixing up "bb"/"allin".
export function formatVariantLabel(key) {
  if (VARIANT_LABELS[key]) return VARIANT_LABELS[key];
  if (!key.includes('-')) return key;
  return key
    .split('-')
    .map((part) => {
      if (part === 'bb') return 'BB';
      if (part === 'allin') return 'All-in';
      return part;
    })
    .join(' ');
}

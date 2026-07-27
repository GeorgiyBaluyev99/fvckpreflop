import chartsConfig from './charts.json';

// The "bb" field on a stack can be a single depth (15) or a range
// ("22-99", "18-21", "1-2"). This parses either shape into a consistent
// { label, min, max, numbers } so the UI and search can treat them the
// same way (numbers is every individual depth covered, used so typing an
// exact stack size like "19" finds the "18-21" bucket that contains it).
export function parseBB(bb) {
  const str = String(bb);
  const match = str.match(/^(\d+)-(\d+)$/);
  if (match) {
    const min = parseInt(match[1], 10);
    const max = parseInt(match[2], 10);
    const numbers = [];
    for (let n = min; n <= max; n++) numbers.push(n);
    return { label: `${str}bb`, min, max, numbers };
  }
  const n = parseInt(str, 10);
  return { label: `${str}bb`, min: n, max: n, numbers: [n] };
}

// Flattens the nested scenarios/stacks config into a flat list of
// selectable entries: one per (scenario, stack) pair, each carrying
// its available variants (open / vsshove / vs3bet3x / ...).
// This flat shape is what the fuzzy search command palette operates on.
//
// Some scenarios are "universal" (scenario.universal === true): they have
// a single chart covering every stack depth (e.g. facing a squeeze), so
// there's no stacks array at all - just one entry with no bb.
export function getEntries() {
  const entries = [];
  for (const scenario of chartsConfig.scenarios) {
    if (scenario.universal) {
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
    for (const stack of scenario.stacks) {
      const { label: bbLabel, max, numbers } = parseBB(stack.bb);
      entries.push({
        id: `${scenario.id}_${stack.bb}bb`,
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

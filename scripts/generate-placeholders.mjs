// Generates placeholder chart images (SVG) for every scenario/stack/variant
// listed in src/data/charts.json, written into public/charts/.
// Real chart images can later just overwrite these files (same filenames),
// no code changes needed.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const configPath = path.join(root, 'src/data/charts.json');
const outDir = path.join(root, 'public/charts');
mkdirSync(outDir, { recursive: true });

const { scenarios } = JSON.parse(readFileSync(configPath, 'utf-8'));

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const COLORS = { raise: '#c0392b', call: '#27ae60', fold: '#34495e', mixed: '#e67e22' };

// Deterministic pseudo-random action per cell, seeded by string, just so
// placeholders visually differ from each other instead of being identical.
function seededAction(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const options = ['raise', 'raise', 'call', 'fold', 'fold', 'fold', 'mixed'];
  return options[h % options.length];
}

function buildGridSvg({ title, subtitle, badge }) {
  const cell = 46;
  const gridSize = RANKS.length * cell;
  const padTop = 90;
  const width = gridSize + 40;
  const height = gridSize + padTop + 20;

  let cells = '';
  for (let row = 0; row < RANKS.length; row++) {
    for (let col = 0; col < RANKS.length; col++) {
      const r1 = RANKS[row];
      const r2 = RANKS[col];
      let hand;
      if (row === col) hand = `${r1}${r2}`;
      else if (row < col) hand = `${r1}${r2}s`;
      else hand = `${r2}${r1}o`;
      const action = seededAction(title + hand);
      const x = 20 + col * cell;
      const y = padTop + row * cell;
      cells += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${COLORS[action]}" stroke="#1b1f24" stroke-width="1"/>`;
      cells += `<text x="${x + cell / 2}" y="${y + cell / 2 + 4}" font-size="12" fill="#fff" text-anchor="middle" font-family="monospace">${hand}</text>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#0f1216"/>
  <text x="20" y="34" font-size="26" fill="#ffffff" font-family="sans-serif" font-weight="bold">${title}</text>
  <text x="20" y="58" font-size="16" fill="#9aa4af" font-family="sans-serif">${subtitle}</text>
  ${badge ? `<rect x="${width - 150}" y="18" width="130" height="30" rx="6" fill="#e67e22"/><text x="${width - 85}" y="38" font-size="14" fill="#111" text-anchor="middle" font-family="sans-serif" font-weight="bold">${badge}</text>` : ''}
  ${cells}
</svg>`;
}

const VARIANT_LABELS = {
  open: 'OPEN',
  vsshove: 'VS SHOVE',
  'vs3bet2.5x': 'VS 3BET 2.5x',
  vs3bet3x: 'VS 3BET 3x',
};

let count = 0;
for (const scenario of scenarios) {
  if (scenario.universal) {
    for (const [variant, filename] of Object.entries(scenario.variants)) {
      const svg = buildGridSvg({
        title: `${scenario.label} — all stacks`,
        subtitle: `PLACEHOLDER CHART · scenario: ${scenario.id} · universal · ${variant}`,
        badge: variant === 'open' ? null : VARIANT_LABELS[variant] || variant.toUpperCase(),
      });
      writeFileSync(path.join(outDir, filename), svg, 'utf-8');
      count++;
    }
    continue;
  }
  for (const stack of scenario.stacks) {
    for (const [variant, filename] of Object.entries(stack.variants)) {
      const svg = buildGridSvg({
        title: `${scenario.label} — ${stack.bb}bb`,
        subtitle: `PLACEHOLDER CHART · scenario: ${scenario.id} · ${stack.bb}bb · ${variant}`,
        badge: variant === 'open' ? null : VARIANT_LABELS[variant] || variant.toUpperCase(),
      });
      writeFileSync(path.join(outDir, filename), svg, 'utf-8');
      count++;
    }
  }
}

console.log(`Generated ${count} placeholder chart images into public/charts/`);

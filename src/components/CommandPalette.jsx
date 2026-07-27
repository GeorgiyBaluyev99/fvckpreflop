import { useEffect, useMemo, useRef, useState } from 'react';
import { fuzzyFilter } from '../utils/fuzzy';

const LEGEND_ROWS = [
  [['q', 'BU']],
  [['w', 'SBB'], ['e', 'SVL'], ['r', 'SVM'], ['t', 'SVO']],
  [['a', 'BSL'], ['s', 'BSM'], ['d', 'BSO']],
  [['f', 'BBL'], ['g', 'BBM'], ['j', 'BBO']],
  [['z', 'HS']],
  [['x', 'HVL'], ['c', 'HVM'], ['v', 'HV3'], ['n', 'HVO']],
];

// Always-focused fuzzy search list. Typing filters instantly, arrow keys
// move the highlighted row, Enter selects the highlighted (or top) result.
// `initialQuery` lets the parent seed the box with a character the user
// just typed while a chart was showing (so nothing is ever lost/blocked).
export default function CommandPalette({ entries, initialQuery = '', stickyScenarioId = null, onStickyChange, onSelect }) {
  const [query, setQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const { results, resolvedScenarioId } = useMemo(
    () =>
      query.trim() === ''
        ? { results: [], resolvedScenarioId: null }
        : fuzzyFilter(entries, query, 14, stickyScenarioId),
    [entries, query, stickyScenarioId]
  );

  useEffect(() => {
    if (resolvedScenarioId && resolvedScenarioId !== stickyScenarioId) {
      onStickyChange?.(resolvedScenarioId);
    }
  }, [resolvedScenarioId, stickyScenarioId, onStickyChange]);

  const stickyLabel = useMemo(() => {
    if (!stickyScenarioId) return '';
    return entries.find((e) => e.scenarioId === stickyScenarioId)?.label ?? '';
  }, [entries, stickyScenarioId]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = results[activeIndex] ?? results[0];
      if (pick) onSelect(pick);
    }
  }

  return (
    <div className="palette">
      <div className="palette-legend">
        {LEGEND_ROWS.map((row, i) => (
          <div className="palette-legend-row" key={i}>
            {row.map(([key, label]) => (
              <span className="palette-legend-item" key={key}>
                <kbd>{key}</kbd>
                {label}
              </span>
            ))}
          </div>
        ))}
      </div>
      {stickyLabel && (
        <div className="palette-sticky">
          🔒 {stickyLabel} · только цифры — стек внутри этой позиции
        </div>
      )}
      <input
        ref={inputRef}
        className="palette-input"
        type="text"
        value={query}
        placeholder="Введи сценарий: btn, sb vs, mr, 15bb…"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        spellCheck={false}
      />
      <ul className="palette-list">
        {results.length === 0 && query.trim() !== '' && (
          <li className="palette-empty">Ничего не найдено</li>
        )}
        {results.map((entry, i) => (
          <li
            key={entry.id}
            className={i === activeIndex ? 'palette-item active' : 'palette-item'}
            onMouseEnter={() => setActiveIndex(i)}
            onClick={() => onSelect(entry)}
          >
            <span className="palette-label">{entry.label}</span>
            {entry.bbLabel && <span className="palette-bb">{entry.bbLabel}</span>}
          </li>
        ))}
      </ul>
      <div className="palette-hint">↑↓ выбрать · Enter открыть</div>
    </div>
  );
}

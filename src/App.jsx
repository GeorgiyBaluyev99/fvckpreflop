import { useEffect, useMemo, useState } from 'react';
import CommandPalette from './components/CommandPalette';
import ChartView from './components/ChartView';
import { getEntries, orderedVariantKeys } from './data/flattenEntries';
import './App.css';

// Two modes:
//  - "search": command palette is focused, user is typing/filtering/picking.
//  - "view": a chart is shown fullscreen; Space cycles through its variants
//    (open -> vsshove -> vs3bet3x -> back to open), any other letter jumps
//    straight back to "search" seeded with that letter (so nothing is ever
//    blocked - just start typing the next scenario at any time).
//
// `population` ("fish" or "reg") is a separate, orthogonal axis from mode:
// it picks which parallel chart set getEntries() flattens (see
// flattenEntries.js). Tab toggles it from anywhere - search or view - and
// always drops back to "search" afterward, since the reg/fish grids have
// their own stack buckets and the previously selected entry may not have
// an equivalent on the other side. The scenario hotkeys themselves (q, w,
// e, ...) don't change at all between populations.
function App() {
  const [population, setPopulation] = useState('fish');
  const entries = useMemo(() => getEntries(population), [population]);
  const [mode, setMode] = useState('search');
  const [selected, setSelected] = useState(null);
  const [variantIndex, setVariantIndex] = useState(0);
  const [seedQuery, setSeedQuery] = useState('');
  const [stickyScenarioId, setStickyScenarioId] = useState(null);

  function handleSelect(entry) {
    setSelected(entry);
    setStickyScenarioId(entry.scenarioId);
    setVariantIndex(0);
    setMode('view');
  }

  // Tab always flips fish/reg, regardless of mode or focus.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      setPopulation((p) => (p === 'fish' ? 'reg' : 'fish'));
      setSeedQuery('');
      setMode('search');
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (mode !== 'view' || !selected) return;

    function onKeyDown(e) {
      if (e.key === ' ') {
        e.preventDefault();
        const keys = orderedVariantKeys(selected.variants);
        setVariantIndex((i) => (i + 1) % keys.length);
        return;
      }
      if (e.key === 'Escape') {
        setSeedQuery('');
        setMode('search');
        return;
      }
      // Any single printable character reopens search seeded with it.
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setSeedQuery(e.key);
        setMode('search');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, selected]);

  const activeVariantKey = selected
    ? orderedVariantKeys(selected.variants)[variantIndex % orderedVariantKeys(selected.variants).length]
    : null;

  return (
    <div className={`app-root population-${population}`}>
      <div className="population-bar">{population === 'reg' ? '🦈 VS REG' : '🐟 VS FISH'}</div>
      {mode === 'search' || !selected ? (
        <CommandPalette
          entries={entries}
          initialQuery={seedQuery}
          stickyScenarioId={stickyScenarioId}
          onStickyChange={setStickyScenarioId}
          onSelect={handleSelect}
        />
      ) : (
        <ChartView entry={selected} variant={activeVariantKey} />
      )}
      <footer className="app-footer">
        FVCKPREFLOP · Tab — переключить fish/reg ·{' '}
        {mode === 'view' ? 'Space — переключить вариант · любая буква — новый поиск' : 'Печатай, чтобы найти сценарий'}
      </footer>
    </div>
  );
}

export default App;

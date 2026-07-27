import { orderedVariantKeys, VARIANT_LABELS } from '../data/flattenEntries';

// Fullscreen chart display. Shows the image for the currently active
// variant plus small context (scenario label, stack, which variant, and
// how many variants exist) so it's readable at a glance mid-hand.
export default function ChartView({ entry, variant }) {
  const variantKeys = orderedVariantKeys(entry.variants);
  const filename = entry.variants[variant] ?? entry.variants[variantKeys[0]];
  const activeVariant = entry.variants[variant] ? variant : variantKeys[0];

  return (
    <div className="chart-view">
      <div className="chart-header">
        <div className="chart-title">
          <span className="chart-label">{entry.label}</span>
          {entry.bbLabel && <span className="chart-bb">{entry.bbLabel}</span>}
        </div>
        {variantKeys.length > 1 && (
          <div className="chart-variants">
            {variantKeys.map((key) => (
              <span
                key={key}
                className={key === activeVariant ? 'variant-pill active' : 'variant-pill'}
              >
                {VARIANT_LABELS[key] || key}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="chart-image-wrap">
        <img className="chart-image" src={`/charts/${filename}`} alt={`${entry.label} ${entry.bbLabel} ${activeVariant}`} />
      </div>
    </div>
  );
}

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  colour: string;
}

interface Props {
  title: string;
  caption: string;
  slices: DonutSlice[];
  activeKey: string;
  onSliceClick: (key: string) => void;
}

// SVG circle trick: one circle per slice, all sharing a stroke-dasharray of the
// full circumference, offset so each starts where the previous ended. Avoids
// pulling in a charting library for a single donut.
const RADIUS = 48;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutPanel({ title, caption, slices, activeKey, onSliceClick }: Props) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let offset = 0;

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <span className="ph-count">{total.toLocaleString()}</span>
      </div>

      <div className="donut-wrap">
        <div className="donut">
          <svg width="118" height="118" viewBox="0 0 118 118">
            {slices.map((slice) => {
              const fraction = total ? slice.value / total : 0;
              const dash = fraction * CIRCUMFERENCE;
              const segment = (
                <circle
                  key={slice.key}
                  className={`donut-seg${activeKey && activeKey !== slice.key ? " dim" : ""}`}
                  cx="59"
                  cy="59"
                  r={RADIUS}
                  stroke={slice.colour}
                  strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                  strokeDashoffset={-offset}
                  onClick={() => onSliceClick(activeKey === slice.key ? "" : slice.key)}
                >
                  <title>{`${slice.label}: ${slice.value.toLocaleString()}`}</title>
                </circle>
              );
              offset += dash;
              return segment;
            })}
          </svg>

          <div className="donut-centre">
            <span className="donut-total">{total.toLocaleString()}</span>
            <span className="donut-caption">{caption}</span>
          </div>
        </div>

        <div className="legend">
          {slices.map((slice) => (
            <div
              className={`legend-row${activeKey === slice.key ? " active" : ""}`}
              key={slice.key}
              style={{ "--lc": slice.colour } as React.CSSProperties}
              onClick={() => onSliceClick(activeKey === slice.key ? "" : slice.key)}
            >
              <span className="legend-dot" style={{ background: slice.colour }} />
              <span className="legend-name">{slice.label}</span>
              <span className="legend-val" style={{ color: slice.colour }}>
                {slice.value.toLocaleString()}
              </span>
              <span className="legend-pct">
                {total ? ((slice.value / total) * 100).toFixed(1) : "0.0"}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

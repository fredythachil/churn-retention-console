export interface PillBarSlice {
  key: string;
  label: string;
  value: number;
  colour: string;
}

interface Props {
  title: string;
  slices: PillBarSlice[];
  activeKey: string;
  onSliceClick: (key: string) => void;
}

export function PillBarPanel({ title, slices, activeKey, onSliceClick }: Props) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const max = Math.max(...slices.map((slice) => slice.value), 1);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <span className="ph-count">{total.toLocaleString()}</span>
      </div>

      <div className="pillbars">
        {slices.map((slice) => (
          <div
            className={`pillbar-row${activeKey === slice.key ? " active" : ""}`}
            key={slice.key}
            style={{ "--pc": slice.colour } as React.CSSProperties}
            onClick={() => onSliceClick(activeKey === slice.key ? "" : slice.key)}
            title={`${slice.label}: ${slice.value.toLocaleString()}`}
          >
            <span className="pillbar-count">{slice.value.toLocaleString()}</span>
            <div className="pillbar-track">
              <div
                className="pillbar-fill"
                style={{ height: `${(slice.value / max) * 100}%` }}
              />
            </div>
            <span className="pillbar-name">{slice.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

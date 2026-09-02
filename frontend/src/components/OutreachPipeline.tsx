import type { CustomerStats } from "../api/customers";

const STAGES = [
  { key: "NOT_CONTACTED", label: "New", colour: "#94a3b8" },
  { key: "IN_PROGRESS", label: "Working", colour: "#7c3aed" },
  { key: "RETAINED", label: "Saved", colour: "#059669" },
  { key: "LOST", label: "Lost", colour: "#dc2626" },
];

interface Props {
  stats: CustomerStats;
  activeStage: string;
  onStageClick: (stage: string) => void;
}

export function OutreachPipeline({ stats, activeStage, onStageClick }: Props) {
  const worked = stats.total - (stats.stages.NOT_CONTACTED ?? 0);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Outreach pipeline</h2>
        <span className="ph-count">{worked.toLocaleString()} worked</span>
      </div>

      <div className="pipe">
        <div className="pipe-track" />
        {STAGES.map((stage) => (
          <div
            className={`pipe-step${activeStage === stage.key ? " active" : ""}`}
            key={stage.key}
            style={{ "--p": stage.colour } as React.CSSProperties}
            onClick={() => onStageClick(activeStage === stage.key ? "" : stage.key)}
          >
            <div className="pipe-node">
              {(stats.stages[stage.key] ?? 0).toLocaleString()}
            </div>
            <span className="pipe-name">{stage.label}</span>
          </div>
        ))}
      </div>

      <div className="muted" style={{ fontSize: 11, textAlign: "center", marginTop: 12 }}>
        Average risk score {stats.average_score} / 100
      </div>
    </div>
  );
}

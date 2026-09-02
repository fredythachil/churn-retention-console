import type { RiskAssessment } from "../types/api";
import { FACTOR_LABELS } from "../types/labels";

// Contribution bands, not the tier palette - this shows how much of a factor's
// available weight a customer used, which is a different question from risk.
function bandColour(points: number, max: number) {
  if (points === 0) return "#94a3b8";
  const ratio = points / max;
  if (ratio >= 0.8) return "#dc2626";
  if (ratio >= 0.5) return "#ea580c";
  return "#d97706";
}

export function FactorBreakdown({ risk }: { risk: RiskAssessment }) {
  return (
    <div>
      {risk.factors.map((factor) => {
        const percent = factor.max_points === 0 ? 0 : (factor.points / factor.max_points) * 100;
        const colour = bandColour(factor.points, factor.max_points);

        return (
          <div
            className={`factor${factor.points === 0 ? " zero" : ""}`}
            key={factor.factor}
            style={{ "--fc": colour } as React.CSSProperties}
          >
            <div className="factor-head">
              <span>
                <span className="factor-name">
                  {FACTOR_LABELS[factor.factor] ?? factor.factor}
                </span>{" "}
                <span className="factor-value">{factor.value}</span>
              </span>
              <span className="factor-points">
                {factor.points}
                <span style={{ opacity: 0.55 }}>/{factor.max_points}</span>
              </span>
            </div>

            <div className="factor-track">
              <span style={{ width: `${percent}%` }} />
            </div>

            <div className="factor-reason">{factor.reason}</div>
          </div>
        );
      })}
    </div>
  );
}

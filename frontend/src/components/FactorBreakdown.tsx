import type { RiskAssessment } from "../types/api";
import { FACTOR_LABELS } from "../types/labels";

export function FactorBreakdown({ risk }: { risk: RiskAssessment }) {
  return (
    <div>
      {risk.factors.map((factor) => {
        const percent = factor.max_points === 0 ? 0 : (factor.points / factor.max_points) * 100;

        return (
          <div className="factor" key={factor.factor}>
            <div className="factor-head">
              <span>
                <strong>{FACTOR_LABELS[factor.factor] ?? factor.factor}</strong>{" "}
                <span className="muted">— {factor.value}</span>
              </span>
              <span className="num muted">
                {factor.points} / {factor.max_points}
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

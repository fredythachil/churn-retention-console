import type { RiskTier } from "../types/api";

const TIER_VAR: Record<RiskTier, string> = {
  LOW: "var(--low)",
  MEDIUM: "var(--medium)",
  HIGH: "var(--high)",
  CRITICAL: "var(--critical)",
};

export function ScoreBar({ score, tier }: { score: number; tier: RiskTier }) {
  return (
    <div className="score-cell">
      <strong className="num" style={{ width: 24 }}>{score}</strong>
      <div className="score-bar" title={`${score} of 100`}>
        <span style={{ width: `${score}%`, background: TIER_VAR[tier] }} />
      </div>
    </div>
  );
}

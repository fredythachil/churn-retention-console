import type { RiskTier } from "../types/api";
import { TIER_LABELS } from "../types/labels";

export function RiskBadge({ tier }: { tier: RiskTier }) {
  return <span className={`badge badge-${tier}`}>{TIER_LABELS[tier]}</span>;
}

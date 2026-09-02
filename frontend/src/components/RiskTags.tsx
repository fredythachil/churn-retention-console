import { FACTOR_LABELS } from "../types/labels";

// Compact labels - the full FACTOR_LABELS text is too long for an inline tag.
const TAG_LABELS: Record<string, string> = {
  contract: "Contract",
  tenure: "New customer",
  payment_method: "Payment",
  internet_service: "Internet",
  protective_add_ons: "No add-ons",
  demographics: "Household",
};

export function RiskTags({ factors }: { factors: string[] }) {
  if (factors.length === 0) return null;

  return (
    <div className="tags">
      {factors.map((factor) => (
        <span className="tag" key={factor} title={FACTOR_LABELS[factor] ?? factor}>
          {TAG_LABELS[factor] ?? factor}
        </span>
      ))}
    </div>
  );
}

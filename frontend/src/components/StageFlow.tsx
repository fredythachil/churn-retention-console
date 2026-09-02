import type { OutreachStage } from "../types/api";
import { STAGE_LABELS } from "../types/labels";

const FLOW: OutreachStage[] = ["NOT_CONTACTED", "IN_PROGRESS", "RETAINED"];

const STAGE_COLOUR: Record<OutreachStage, string> = {
  NOT_CONTACTED: "var(--text-muted)",
  IN_PROGRESS: "#7c3aed",
  RETAINED: "var(--low)",
  LOST: "var(--critical)",
};

export function StageFlow({ stage }: { stage: OutreachStage }) {
  // LOST replaces RETAINED as the final step - a customer reaches one or the
  // other, never both.
  const steps: OutreachStage[] = stage === "LOST" ? ["NOT_CONTACTED", "IN_PROGRESS", "LOST"] : FLOW;
  const currentIndex = steps.indexOf(stage);
  const progress = currentIndex <= 0 ? 0 : (currentIndex / (steps.length - 1)) * 100;
  const colour = STAGE_COLOUR[stage];

  return (
    <div className="stage-flow">
      <div className="stage-track">
        <div
          className="stage-progress"
          style={{ width: `${progress}%`, background: colour }}
        />
      </div>

      {steps.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "";
        return (
          <div
            className={`stage-step ${state}`}
            key={step}
            style={{ "--s": STAGE_COLOUR[step] } as React.CSSProperties}
          >
            <div className="stage-node">{index < currentIndex ? "✓" : index + 1}</div>
            <div className="stage-name">{STAGE_LABELS[step]}</div>
          </div>
        );
      })}
    </div>
  );
}

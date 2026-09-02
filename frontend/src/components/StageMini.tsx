import { Fragment } from "react";

import type { OutreachStage, OutreachSubStage } from "../types/api";
import { STAGE_LABELS, SUB_STAGE_LABELS } from "../types/labels";

const STAGE_COLOUR: Record<OutreachStage, string> = {
  NOT_CONTACTED: "#15803d",
  IN_PROGRESS: "#7c3aed",
  RETAINED: "#059669",
  LOST: "#dc2626",
};

interface Props {
  stage: OutreachStage;
  subStage: OutreachSubStage | null;
}

export function StageMini({ stage, subStage }: Props) {
  const path: OutreachStage[] = ["NOT_CONTACTED", "IN_PROGRESS"];
  const outcomes: OutreachStage[] = ["RETAINED", "LOST"];
  const steps = [...path, ...outcomes];

  const reachedOutcome = outcomes.includes(stage);
  const currentIndex = reachedOutcome ? path.length : path.indexOf(stage);
  const fillIndex = reachedOutcome ? steps.indexOf(stage) : currentIndex;

  return (
    <div
      className="stage-mini"
      style={{ "--m": STAGE_COLOUR[stage] } as React.CSSProperties}
      title={
        subStage
          ? `${STAGE_LABELS[stage]} - ${SUB_STAGE_LABELS[subStage]}`
          : STAGE_LABELS[stage]
      }
    >
      <div className="stage-mini-track">
        <div
          className="stage-mini-fill"
          style={{ width: `${(fillIndex / (steps.length - 1)) * 100}%` }}
        />
      </div>

      {steps.map((step, index) => {
        const isOutcome = outcomes.includes(step);
        const current = isOutcome ? step === stage : index === currentIndex;
        const done = isOutcome ? false : index < currentIndex;

        return (
          <Fragment key={step}>
            <div
              className={`stage-mini-step${done ? " done" : ""}${current ? " current" : ""}`}
              style={{ "--sm": STAGE_COLOUR[step] } as React.CSSProperties}
            >
              {/* the pill carries the sub-stage; the label below is always the
                  main stage, so the two never say the same thing */}
              {current && subStage ? (
                <span className="stage-mini-pill">{SUB_STAGE_LABELS[subStage]}</span>
              ) : (
                <div className="stage-mini-dot" />
              )}
              <span className="stage-mini-name">{STAGE_LABELS[step]}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

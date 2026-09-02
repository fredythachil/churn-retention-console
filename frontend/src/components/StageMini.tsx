import { Fragment } from "react";

import type { OutreachStage } from "../types/api";
import { STAGE_LABELS } from "../types/labels";

const STAGE_COLOUR: Record<OutreachStage, string> = {
  NOT_CONTACTED: "#94a3b8",
  IN_PROGRESS: "#7c3aed",
  RETAINED: "#059669",
  LOST: "#dc2626",
};

// Short labels because three sit inline in a table cell. The pill marking the
// current position carries the full stage name.
const SHORT_NAMES: Record<OutreachStage, string> = {
  NOT_CONTACTED: "New",
  IN_PROGRESS: "Working",
  RETAINED: "Saved",
  LOST: "Lost",
};

export function StageMini({ stage }: { stage: OutreachStage }) {
  // LOST is an alternative ending to RETAINED, not a step after it, so it
  // replaces the final node rather than adding one.
  const steps: OutreachStage[] =
    stage === "LOST"
      ? ["NOT_CONTACTED", "IN_PROGRESS", "LOST"]
      : ["NOT_CONTACTED", "IN_PROGRESS", "RETAINED"];

  const currentIndex = steps.indexOf(stage);
  const fillPercent = (currentIndex / (steps.length - 1)) * 100;

  return (
    <div
      className="stage-mini"
      style={{ "--m": STAGE_COLOUR[stage] } as React.CSSProperties}
      title={`${STAGE_LABELS[stage]} — step ${currentIndex + 1} of ${steps.length}`}
    >
      <div className="stage-mini-track">
        <div className="stage-mini-fill" style={{ width: `${fillPercent}%` }} />
      </div>

      {steps.map((step, index) => {
        const done = index <= currentIndex;
        const current = index === currentIndex;
        const stepClass = ["stage-mini-step", done && "done", current && "current"]
          .filter(Boolean)
          .join(" ");

        return (
          <Fragment key={step}>
            <div className={stepClass}>
              {current ? (
                <span className="stage-mini-pill">{STAGE_LABELS[step]}</span>
              ) : (
                <div className="stage-mini-dot" />
              )}
              <span className="stage-mini-name">{SHORT_NAMES[step]}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

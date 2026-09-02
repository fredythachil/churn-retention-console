import { useState } from "react";

import { ApiError } from "../api/client";
import { updateOutreach } from "../api/customers";
import type { OutreachStage, OutreachState, OutreachSubStage } from "../types/api";
import { NEXT_STAGES, STAGE_LABELS, SUB_STAGES_FOR_STAGE, SUB_STAGE_LABELS } from "../types/labels";

const STAGE_COLOUR: Record<OutreachStage, string> = {
  NOT_CONTACTED: "#15803d",
  IN_PROGRESS: "#7c3aed",
  RETAINED: "#059669",
  LOST: "#dc2626",
};

interface Props {
  customerId: string;
  outreach: OutreachState;
  note: string;
  onUpdated: (state: OutreachState) => void;
}

export function StageFlow({ customerId, outreach, note, onUpdated }: Props) {
  const [open, setOpen] = useState<OutreachStage | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stage = outreach.stage;

  // LOST is an alternative ending to RETAINED, not a step after it.
  // All four stages render. RETAINED and LOST are alternative endings rather
  // than sequential steps, so they share the final column as a fork - both are
  // reachable from IN_PROGRESS and the agent can see the choice exists.
  const path: OutreachStage[] = ["NOT_CONTACTED", "IN_PROGRESS"];
  const outcomes: OutreachStage[] = ["RETAINED", "LOST"];
  const steps = [...path, ...outcomes];

  const reachedOutcome = outcomes.includes(stage);
  const currentIndex = reachedOutcome ? path.length : path.indexOf(stage);
  // The reached outcome sits at its own index, so the line ends on it.
  const fillIndex = reachedOutcome ? steps.indexOf(stage) : currentIndex;
  const allowed = NEXT_STAGES[stage];

  async function commit(toStage: OutreachStage, subStage: OutreachSubStage) {
    setSaving(true);
    setError(null);
    setOpen(null);
    try {
      const updated = await updateOutreach(customerId, toStage, subStage, note.trim() || null);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stage-flow-wrap">
      {open && <div className="stage-backdrop" onClick={() => setOpen(null)} />}

      <div className="stage-flow">
        <div className="stage-track">
          <div
            className="stage-progress"
            style={{
              // The fill traces the path actually taken: to IN_PROGRESS while
              // still working, all the way to whichever outcome was reached.
              width: `${fillIndex <= 0 ? 0 : (fillIndex / (steps.length - 1)) * 100}%`,
              background: STAGE_COLOUR[stage],
            }}
          />
        </div>

        {steps.map((step, index) => {
          const isOutcome = outcomes.includes(step);
          // An outcome is "current" only if the customer actually reached THAT
          // one - otherwise both endings would light up together.
          const current = isOutcome ? step === stage : index === currentIndex;
          const done = isOutcome ? false : index < currentIndex;
          const canMove = allowed.includes(step) && !saving;

          return (
            <div
              className={`stage-step${done ? " done" : ""}${current ? " current" : ""}${
                canMove ? " clickable" : " locked"
              }${isOutcome ? " outcome" : ""}`}
              key={step}
              style={{ "--s": STAGE_COLOUR[step] } as React.CSSProperties}
              onClick={() => canMove && setOpen(open === step ? null : step)}
              title={canMove ? `Move to ${STAGE_LABELS[step]}` : "Not a valid next stage"}
            >
              <div className="stage-node">{STAGE_LABELS[step]}</div>

              {open === step && (
                <div
                  className="stage-popover"
                  style={{ "--sc": STAGE_COLOUR[step] } as React.CSSProperties}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="stage-popover-title">Select detail</div>
                  {SUB_STAGES_FOR_STAGE[step].map((option) => (
                    <button
                      key={option}
                      className="stage-option"
                      disabled={saving}
                      onClick={() => commit(step, option)}
                    >
                      {SUB_STAGE_LABELS[option]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {saving && (
        <div className="muted" style={{ fontSize: 11, textAlign: "center", marginTop: 10 }}>
          Saving…
        </div>
      )}

      {error && (
        <div className="state-error" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
    </div>
  );
}

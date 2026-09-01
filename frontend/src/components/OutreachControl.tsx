import { useState } from "react";

import { ApiError } from "../api/client";
import { updateOutreach } from "../api/customers";
import type { OutreachStage, OutreachState, OutreachSubStage } from "../types/api";
import { NEXT_STAGES, STAGE_LABELS, SUB_STAGES_FOR_STAGE, SUB_STAGE_LABELS } from "../types/labels";

interface Props {
  customerId: string;
  outreach: OutreachState;
  onUpdated: (state: OutreachState) => void;
}

export function OutreachControl({ customerId, outreach, onUpdated }: Props) {
  const options = NEXT_STAGES[outreach.stage];
  const [stage, setStage] = useState<OutreachStage>(options[0]);
  const [subStage, setSubStage] = useState<OutreachSubStage | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subStageOptions = SUB_STAGES_FOR_STAGE[stage];

  function selectStage(next: OutreachStage) {
    setStage(next);
    setSubStage("");
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateOutreach(
        customerId,
        stage,
        subStage || null,
        note.trim() || null,
      );
      onUpdated(updated);
      setNote("");
      setSubStage("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="filters" style={{ marginBottom: 10 }}>
        <select
          value={stage}
          disabled={saving}
          onChange={(e) => selectStage(e.target.value as OutreachStage)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {STAGE_LABELS[option]}
            </option>
          ))}
        </select>

        <select
          value={subStage}
          disabled={saving || subStageOptions.length === 0}
          onChange={(e) => setSubStage(e.target.value as OutreachSubStage | "")}
        >
          <option value="">
            {subStageOptions.length === 0 ? "No detail" : "Add detail (optional)"}
          </option>
          {subStageOptions.map((option) => (
            <option key={option} value={option}>
              {SUB_STAGE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <textarea
        placeholder="What happened on this call?"
        value={note}
        disabled={saving}
        maxLength={500}
        rows={2}
        style={{ width: "100%", marginBottom: 10, resize: "vertical" }}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && <div className="state-error" style={{ marginBottom: 10 }}>{error}</div>}

      <button className="btn-primary" disabled={saving} onClick={submit}>
        {saving ? "Saving…" : "Log outreach"}
      </button>
    </div>
  );
}

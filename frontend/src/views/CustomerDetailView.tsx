import { useEffect, useState } from "react";

import { ApiError } from "../api/client";
import { getCustomer, updateOutreach } from "../api/customers";
import { FactorBreakdown } from "../components/FactorBreakdown";
import { IconCard, IconHome, IconShield } from "../components/Icons";
import { StageFlow } from "../components/StageFlow";
import { ErrorState, LoadingState } from "../components/StateMessage";
import type { CustomerDetail, OutreachEvent, OutreachState } from "../types/api";
import { STAGE_LABELS, SUB_STAGE_LABELS } from "../types/labels";

const TIER_COLOUR: Record<string, string> = {
  LOW: "var(--low)",
  MEDIUM: "var(--medium)",
  HIGH: "var(--high)",
  CRITICAL: "var(--critical)",
};

const STAGE_COLOUR: Record<string, string> = {
  NOT_CONTACTED: "#94a3b8",
  IN_PROGRESS: "#7c3aed",
  RETAINED: "#059669",
  LOST: "#dc2626",
};

function Attr({ label, value, flag }: { label: string; value: string; flag?: boolean }) {
  const cls = flag === undefined ? "" : value === "Yes" ? "flag-yes" : "flag-no";
  return (
    <div className="attr-row">
      <span className="attr-key">{label}</span>
      <span className={`attr-val ${cls}`}>{value}</span>
    </div>
  );
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

// Newest first, grouped by calendar day so the timeline reads like an activity
// feed rather than a flat list.
function groupByDay(history: OutreachEvent[]) {
  const groups = new Map<string, OutreachEvent[]>();
  for (const event of [...history].reverse()) {
    const day = new Date(event.occurred_at).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const bucket = groups.get(day);
    if (bucket) bucket.push(event);
    else groups.set(day, [event]);
  }
  return [...groups.entries()];
}

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCustomer(customerId)
      .then((result) => {
        if (!cancelled) {
          setDetail(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId, reloadKey]);

  // A note with no stage change is a same-stage transition - the backend allows
  // IN_PROGRESS -> IN_PROGRESS precisely so repeated attempts can be logged.
  async function addNote() {
    if (!note.trim() || !detail) return;
    setSavingNote(true);
    try {
      const updated = await updateOutreach(
        detail.customer.customer_id,
        detail.outreach.stage,
        detail.outreach.sub_stage,
        note.trim(),
      );
      handleUpdated(updated);
      setNote("");
    } catch (err) {
      // The note text is deliberately kept so the agent does not lose it.
      setToast(err instanceof ApiError ? err.message : "Could not save the note.");
    } finally {
      setSavingNote(false);
    }
  }

  function handleUpdated(outreach: OutreachState) {
    setDetail((current) => (current ? { ...current, outreach } : current));
  }

  if (loading && !detail) return <LoadingState label="Loading customer…" />;
  if (error) return <ErrorState error={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  if (!detail) return null;

  const { customer, risk, outreach } = detail;
  const days = groupByDay(outreach.history);

  return (
    <>
      {toast && (
        <div className="toast">
          <span>{toast}</span>
          <button onClick={() => setToast(null)}>×</button>
        </div>
      )}

    <div className="detail-grid">
      {/* ---- left: who they are ---- */}
      <div className="detail-col">
        <div className="panel">
          <div className="profile-name">{customer.customer_id}</div>
          <div className="profile-sub">
            {customer.contract} · {customer.tenure} month{customer.tenure === 1 ? "" : "s"} ·{" "}
            ${customer.monthly_charges.toFixed(2)}/mo
          </div>

          <div className="score-hero">
            <span className="score-hero-num" style={{ color: TIER_COLOUR[risk.tier] }}>
              {risk.score}
            </span>
            <div className="score-hero-meta">
              <span className={`chip chip-${risk.tier}`}>{risk.tier}</span>
              <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
                Risk score out of 100
              </div>
            </div>
          </div>

          <StageFlow
            customerId={customer.customer_id}
            outreach={outreach}
            note={note}
            onUpdated={(state) => {
              handleUpdated(state);
              setNote("");
            }}
          />
          <div className="substage-row">
            <span className="substage-label">Action stage</span>
            <span
              className={`substage-pill${outreach.sub_stage ? "" : " none"}`}
              style={{ "--sp": STAGE_COLOUR[outreach.stage] } as React.CSSProperties}
            >
              {outreach.sub_stage ? SUB_STAGE_LABELS[outreach.sub_stage] : "None set"}
            </span>
          </div>

        </div>

        <div className="panel">
          <div className="attr-section"><IconCard />Account</div>
          <Attr label="Payment method" value={customer.payment_method} />
          <Attr label="Internet" value={customer.internet_service} />
          <Attr label="Total charges" value={`$${customer.total_charges.toFixed(2)}`} />
          <Attr label="Paperless billing" value={yesNo(customer.paperless_billing)} />

          <div className="attr-section"><IconShield />Protective services</div>
          <Attr label="Tech support" value={customer.tech_support} flag />
          <Attr label="Online security" value={customer.online_security} flag />
          <Attr label="Online backup" value={customer.online_backup} flag />
          <Attr label="Device protection" value={customer.device_protection} flag />

          <div className="attr-section"><IconHome />Household</div>
          <Attr label="Senior citizen" value={yesNo(customer.senior_citizen)} />
          <Attr label="Partner" value={yesNo(customer.partner)} />
          <Attr label="Dependents" value={yesNo(customer.dependents)} />
        </div>
      </div>

      {/* ---- centre: what happened ---- */}
      <div className="detail-col fixed">
        <div className="panel">
          <div className="activity-bar">
            <div className="panel-head">
              <h2>Customer log</h2>
              <span className="ph-count">{outreach.history.length}</span>
            </div>

            <div className="note-composer">
              <textarea
                placeholder="Add a note…"
                value={note}
                maxLength={500}
                rows={1}
                disabled={savingNote}
                onChange={(e) => setNote(e.target.value)}
              />
              <button
                className="btn-icon"
                disabled={savingNote || !note.trim()}
                onClick={addNote}
                title="Log a note without changing stage"
              >
                +
              </button>
            </div>
          </div>

          <div className="scroll-area">
            {days.length === 0 ? (
              <div className="empty-timeline">
                No outreach recorded yet.
                <br />
                Log a call to start the history.
              </div>
            ) : (
              <div className="timeline">
                <div className="timeline-spine" />
                {days.map(([day, events]) => (
                  <div key={day}>
                    <div className="day-marker">
                      <span className="day-pill">{day}</span>
                    </div>

                    {events.map((event, index) => {
                      const isLeft = index % 2 === 0;
                      const isNote = event.from_stage === event.to_stage;

                      const card = (
                        <div className={`tl-card${isNote ? " note" : ""}`}>
                          <div className="tl-type">
                            <span className="tl-kind">{isNote ? "Note" : "Stage"}</span>
                            <span className="tl-action">
                              {isNote ? "Added" : "Change action stage"}
                            </span>
                          </div>

                          {isNote ? (
                            <div className="tl-body">{event.note}</div>
                          ) : (
                            <>
                              <div className="tl-body">
                                Moved to {STAGE_LABELS[event.to_stage]}
                                {event.sub_stage && ` — ${SUB_STAGE_LABELS[event.sub_stage]}`}
                              </div>
                              {event.note && <div className="tl-sub">{event.note}</div>}
                              <div className="tl-from">
                                from {STAGE_LABELS[event.from_stage]}
                              </div>
                            </>
                          )}
                        </div>
                      );

                      const meta = (
                        <div className="tl-meta">
                          {new Date(event.occurred_at).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      );

                      // DOM order is swapped per side so card / node / time land in
                      // grid columns 1-2-3 without any grid-column overrides.
                      return (
                        <div
                          className={`tl-row ${isLeft ? "left" : "right"}`}
                          key={`${day}-${index}`}
                          style={{ "--ac": STAGE_COLOUR[event.to_stage] } as React.CSSProperties}
                        >
                          {isLeft ? card : meta}
                          <div className="tl-node">{events.length - index}</div>
                          {isLeft ? meta : card}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- right: why this score ---- */}
      <div className="detail-col">
        <div className="panel">
          <div className="panel-head">
            <h2>Why this score</h2>
            <span className="ph-count">{risk.score} / 100</span>
          </div>
          <FactorBreakdown risk={risk} />
        </div>
      </div>
    </div>
    </>
  );
}

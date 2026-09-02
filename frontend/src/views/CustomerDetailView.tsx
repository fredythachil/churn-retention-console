import { useEffect, useState } from "react";

import { getCustomer } from "../api/customers";
import { FactorBreakdown } from "../components/FactorBreakdown";
import { OutreachControl } from "../components/OutreachControl";
import { StageFlow } from "../components/StageFlow";
import { ErrorState, LoadingState } from "../components/StateMessage";
import type { CustomerDetail, OutreachState } from "../types/api";
import { STAGE_LABELS, SUB_STAGE_LABELS } from "../types/labels";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <div className="field-value">{value}</div>
    </div>
  );
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

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


  function handleUpdated(outreach: OutreachState) {
    setDetail((current) => (current ? { ...current, outreach } : current));
  }

  if (loading && !detail) return <LoadingState label="Loading customer…" />;
  if (error) return <ErrorState error={error} onRetry={() => setReloadKey((k) => k + 1)} />;
  if (!detail) return null;

  const { customer, risk, outreach } = detail;

  const TIER_COLOUR: Record<string, string> = {
    LOW: "var(--low)",
    MEDIUM: "var(--medium)",
    HIGH: "var(--high)",
    CRITICAL: "var(--critical)",
  };

  return (
    <>
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "Outfit", fontSize: 18, fontWeight: 800 }}>
              {customer.customer_id}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              {customer.contract} · {customer.tenure} month
              {customer.tenure === 1 ? "" : "s"} · ${customer.monthly_charges.toFixed(2)}/mo
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
            <div style={{ textAlign: "right" }}>
              <div
                className="num"
                style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, color: TIER_COLOUR[risk.tier] }}
              >
                {risk.score}
              </div>
              <div className="muted" style={{ fontSize: 10 }}>RISK SCORE</div>
            </div>
            <span className={`chip chip-${risk.tier}`}>{risk.tier}</span>
          </div>
        </div>

        <div className="field-grid">
          <Field label="Payment method" value={customer.payment_method} />
          <Field label="Internet" value={customer.internet_service} />
          <Field label="Total charges" value={`$${customer.total_charges.toFixed(2)}`} />
          <Field label="Tech support" value={customer.tech_support} />
          <Field label="Online security" value={customer.online_security} />
          <Field label="Online backup" value={customer.online_backup} />
          <Field label="Device protection" value={customer.device_protection} />
          <Field label="Senior citizen" value={yesNo(customer.senior_citizen)} />
          <Field label="Partner" value={yesNo(customer.partner)} />
          <Field label="Dependents" value={yesNo(customer.dependents)} />
          <Field label="Paperless billing" value={yesNo(customer.paperless_billing)} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Outreach stage</h2>
        </div>
        <StageFlow stage={outreach.stage} />
        {outreach.sub_stage && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <span className={`chip chip-${outreach.stage}`}>
              {SUB_STAGE_LABELS[outreach.sub_stage]}
            </span>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Why this score</h2>
          <span className="ph-count">{risk.score} / 100</span>
        </div>
        <FactorBreakdown risk={risk} />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Log outreach</h2>
        </div>
        <OutreachControl
          customerId={customer.customer_id}
          outreach={outreach}
          onUpdated={handleUpdated}
        />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>History</h2>
          {outreach.history.length > 0 && (
            <span className="ph-count">{outreach.history.length}</span>
          )}
        </div>

        {outreach.history.length === 0 ? (
          <div className="muted" style={{ fontSize: 12 }}>No contact recorded yet.</div>
        ) : (
          [...outreach.history].reverse().map((event, index) => (
            <div className="history-item" key={index}>
              <div style={{ marginBottom: 2 }}>
                <span className={`chip chip-${event.to_stage}`}>
                  {STAGE_LABELS[event.to_stage]}
                </span>
                {event.sub_stage && (
                  <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                    {SUB_STAGE_LABELS[event.sub_stage]}
                  </span>
                )}
              </div>
              {event.note && <div style={{ marginBottom: 2 }}>{event.note}</div>}
              <div className="muted" style={{ fontSize: 10 }}>
                {new Date(event.occurred_at).toLocaleString()} · from{" "}
                {STAGE_LABELS[event.from_stage]}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

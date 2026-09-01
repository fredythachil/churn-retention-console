import { useEffect, useState } from "react";

import { getCustomer } from "../api/customers";
import { FactorBreakdown } from "../components/FactorBreakdown";
import { OutreachControl } from "../components/OutreachControl";
import { RiskBadge } from "../components/RiskBadge";
import { ErrorState, LoadingState } from "../components/StateMessage";
import type { CustomerDetail, OutreachState } from "../types/api";
import { STAGE_LABELS, SUB_STAGE_LABELS } from "../types/labels";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div>{value}</div>
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

  return (
    <>
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, textTransform: "none", letterSpacing: 0, color: "var(--text)" }}>
            {customer.customer_id}
          </h2>
          <RiskBadge tier={risk.tier} />
          <span className="muted">Risk score {risk.score} / 100</span>
          <span className="badge badge-stage" style={{ marginLeft: "auto" }}>
            {STAGE_LABELS[outreach.stage]}
            {outreach.sub_stage && ` — ${SUB_STAGE_LABELS[outreach.sub_stage]}`}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <Field label="Tenure" value={`${customer.tenure} months`} />
          <Field label="Contract" value={customer.contract} />
          <Field label="Monthly charges" value={`$${customer.monthly_charges.toFixed(2)}`} />
          <Field label="Total charges" value={`$${customer.total_charges.toFixed(2)}`} />
          <Field label="Payment method" value={customer.payment_method} />
          <Field label="Internet" value={customer.internet_service} />
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
        <h2>Why this score</h2>
        <FactorBreakdown risk={risk} />
      </div>

      <div className="panel">
        <h2>Log outreach</h2>
        <OutreachControl
          customerId={customer.customer_id}
          outreach={outreach}
          onUpdated={handleUpdated}
        />
      </div>

      <div className="panel">
        <h2>Outreach history</h2>
        {outreach.history.length === 0 ? (
          <div className="muted">No contact recorded yet.</div>
        ) : (
          [...outreach.history].reverse().map((event, index) => (
            <div className="history-item" key={index}>
              <div>
                <strong>{STAGE_LABELS[event.to_stage]}</strong>
                {event.sub_stage && (
                  <span className="muted"> — {SUB_STAGE_LABELS[event.sub_stage]}</span>
                )}
              </div>
              {event.note && <div style={{ fontSize: 13 }}>{event.note}</div>}
              <div className="muted" style={{ fontSize: 12 }}>
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

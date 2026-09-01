import { useEffect, useState } from "react";

import { listCustomers, type CustomerFilters } from "../api/customers";
import { RiskBadge } from "../components/RiskBadge";
import { ScoreBar } from "../components/ScoreBar";
import { EmptyState, ErrorState, LoadingState } from "../components/StateMessage";
import type { CustomerSummary, Page } from "../types/api";
import { STAGE_LABELS } from "../types/labels";

const PAGE_SIZE = 25;

interface Props {
  onSelect: (customerId: string) => void;
}

export function CustomerListView({ onSelect }: Props) {
  const [page, setPage] = useState(1);
  const [tier, setTier] = useState("");
  const [contract, setContract] = useState("");
  const [stage, setStage] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [descending, setDescending] = useState(true);

  const [data, setData] = useState<Page<CustomerSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const filters: CustomerFilters = {
        page,
        page_size: PAGE_SIZE,
        tier: tier || undefined,
        contract: contract || undefined,
        outreach_stage: stage || undefined,
        search: search || undefined,
        sort_by: sortBy,
        descending,
      };

      setLoading(true);
      listCustomers(filters)
        .then((result) => {
          if (!cancelled) {
            setData(result);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, tier, contract, stage, search, sortBy, descending, reloadKey]);

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  function toggleSort(field: string) {
    if (sortBy === field) {
      setDescending((current) => !current);
    } else {
      setSortBy(field);
      setDescending(true);
    }
    setPage(1);
  }

  function sortIndicator(field: string) {
    if (sortBy !== field) return "";
    return descending ? " ↓" : " ↑";
  }

  return (
    <>
      <div className="panel">
        <div className="filters">
          <input
            placeholder="Search customer ID…"
            value={search}
            onChange={(e) => changeFilter(setSearch, e.target.value)}
            style={{ minWidth: 200 }}
          />
          <select value={tier} onChange={(e) => changeFilter(setTier, e.target.value)}>
            <option value="">All risk tiers</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select value={contract} onChange={(e) => changeFilter(setContract, e.target.value)}>
            <option value="">All contracts</option>
            <option value="Month-to-month">Month-to-month</option>
            <option value="One year">One year</option>
            <option value="Two year">Two year</option>
          </select>
          <select value={stage} onChange={(e) => changeFilter(setStage, e.target.value)}>
            <option value="">All outreach stages</option>
            <option value="NOT_CONTACTED">Not contacted</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RETAINED">Retained</option>
            <option value="LOST">Lost</option>
          </select>
          {data && (
            <span className="muted" style={{ marginLeft: "auto" }}>
              {data.total.toLocaleString()} customers
            </span>
          )}
        </div>
      </div>

      {error && (
        <ErrorState error={error} onRetry={() => setReloadKey((k) => k + 1)} />
      )}

      <div className="panel" style={{ opacity: loading ? 0.6 : 1 }}>
        {!data && loading && <LoadingState />}
        {data && data.items.length === 0 && (
          <EmptyState label="No customers match these filters." />
        )}

        {data && data.items.length > 0 && (
          <table>
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort("customer_id")}>
                  Customer{sortIndicator("customer_id")}
                </th>
                <th className="sortable num" onClick={() => toggleSort("score")}>
                  Risk{sortIndicator("score")}
                </th>
                <th>Tier</th>
                <th>Contract</th>
                <th className="sortable num" onClick={() => toggleSort("tenure")}>
                  Tenure{sortIndicator("tenure")}
                </th>
                <th className="sortable num" onClick={() => toggleSort("monthly_charges")}>
                  Monthly{sortIndicator("monthly_charges")}
                </th>
                <th>Outreach</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((customer) => (
                <tr key={customer.customer_id} onClick={() => onSelect(customer.customer_id)}>
                  <td>{customer.customer_id}</td>
                  <td><ScoreBar score={customer.score} tier={customer.tier} /></td>
                  <td><RiskBadge tier={customer.tier} /></td>
                  <td>{customer.contract}</td>
                  <td className="num">{customer.tenure} mo</td>
                  <td className="num">${customer.monthly_charges.toFixed(2)}</td>
                  <td>
                    <span className="badge badge-stage">
                      {STAGE_LABELS[customer.outreach_stage]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data && data.total_pages > 1 && (
          <div className="pagination">
            <button disabled={!data.has_previous} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span className="muted">
              Page {data.page} of {data.total_pages.toLocaleString()}
            </span>
            <button disabled={!data.has_next} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}

import { useEffect, useState } from "react";

import { getStats, listCustomers, type CustomerFilters, type CustomerStats } from "../api/customers";
import { EmptyState, ErrorState } from "../components/StateMessage";
import { IconClock, IconContract, IconFlow, IconGauge, IconMoney, IconSearch, IconUser } from "../components/Icons";
import { RiskTags } from "../components/RiskTags";
import { OutreachPipeline } from "../components/OutreachPipeline";
import { DonutPanel } from "../components/DonutPanel";
import { PillBarPanel } from "../components/PillBarPanel";
import { StageMini } from "../components/StageMini";
import type { CustomerSummary, OutreachStage, Page, RiskTier } from "../types/api";
import { STAGE_LABELS, TIER_LABELS } from "../types/labels";

const PAGE_SIZE = 10;

const TIER_COLOUR: Record<string, string> = {
  LOW: "var(--low)",
  MEDIUM: "var(--medium)",
  HIGH: "var(--high)",
  CRITICAL: "var(--critical)",
};

// Always render an arrow so every column reads as sortable - dimmed when the
// column is not the active sort.
function SortArrow({ field, sortBy, descending }: { field: string; sortBy: string; descending: boolean }) {
  const active = sortBy === field;
  return <span className="sort-arrow">{active && !descending ? "↑" : "↓"}</span>;
}

// Condensed page list: first, last, the current neighbourhood, and ellipses.
function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

interface Props {
  onSelect: (customerId: string, pageIds: string[]) => void;
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
  const [stats, setStats] = useState<CustomerStats | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    getStats()
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch(() => {
        // Tiles are supplementary - the list still works without them.
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

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

  return (
    <>
      {stats && (
        <div className="split-row">
          <DonutPanel
            title="Risk distribution"
            caption="customers"
            activeKey={tier}
            onSliceClick={(next) => changeFilter(setTier, next)}
            slices={[
              { key: "CRITICAL", label: "Critical", value: stats.tiers.CRITICAL ?? 0, colour: "#dc2626" },
              { key: "HIGH", label: "High", value: stats.tiers.HIGH ?? 0, colour: "#ea580c" },
              { key: "MEDIUM", label: "Medium", value: stats.tiers.MEDIUM ?? 0, colour: "#d97706" },
              { key: "LOW", label: "Low", value: stats.tiers.LOW ?? 0, colour: "#059669" },
            ]}
          />

          <PillBarPanel
            title="Contract mix"
            activeKey={contract}
            onSliceClick={(next) => changeFilter(setContract, next)}
            slices={[
              { key: "Month-to-month", label: "Month-to-month", value: stats.contracts["Month-to-month"] ?? 0, colour: "#dc2626" },
              { key: "One year", label: "One year", value: stats.contracts["One year"] ?? 0, colour: "#d97706" },
              { key: "Two year", label: "Two year", value: stats.contracts["Two year"] ?? 0, colour: "#059669" },
            ]}
          />

          <OutreachPipeline
            stats={stats}
            activeStage={stage}
            onStageClick={(next) => changeFilter(setStage, next)}
          />
        </div>
      )}


      <div className="panel">
        <div className="filters">
          <div className="search-box">
            <IconSearch />
            <input
              placeholder="Search customer ID…"
              value={search}
              onChange={(e) => changeFilter(setSearch, e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => changeFilter(setSearch, "")}>
                ×
              </button>
            )}
          </div>

          <div className="active-filters">
            {tier && (
              <span className="filter-pill">
                {TIER_LABELS[tier as RiskTier] ?? tier} risk
                <button onClick={() => changeFilter(setTier, "")}>×</button>
              </span>
            )}
            {contract && (
              <span className="filter-pill">
                {contract}
                <button onClick={() => changeFilter(setContract, "")}>×</button>
              </span>
            )}
            {stage && (
              <span className="filter-pill">
                {STAGE_LABELS[stage as OutreachStage] ?? stage}
                <button onClick={() => changeFilter(setStage, "")}>×</button>
              </span>
            )}
            {(tier || contract || stage || search) && (
              <button
                className="clear-all"
                onClick={() => {
                  setTier("");
                  setContract("");
                  setStage("");
                  setSearch("");
                  setPage(1);
                }}
              >
                × Clear all
              </button>
            )}
          </div>

          {data && (
            <span className="muted" style={{ marginLeft: "auto" }}>
              {data.total.toLocaleString()} customers
            </span>
          )}
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      <div className="panel">
        <div className="panel-head">
          <h2>Call list</h2>
          {data && <span className="ph-count">{data.total.toLocaleString()}</span>}
        </div>

        {!data && loading && (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div className="skeleton" key={i} />
            ))}
          </div>
        )}

        {data && data.items.length === 0 && (
          <EmptyState label="No customers match these filters." />
        )}

        {data && data.items.length > 0 && (
          <div style={{ opacity: loading ? 0.55 : 1, transition: "opacity 0.2s" }}>
            <div className="rows-scroll">
              <div className="row-head">
                <span />
                <span className="sortable" onClick={() => toggleSort("customer_id")}>
                  <IconUser />Customer<SortArrow field="customer_id" sortBy={sortBy} descending={descending} />
                </span>
                <span>Drivers</span>
                <span className="sortable" onClick={() => toggleSort("score")}>
                  <IconGauge />Risk score<SortArrow field="score" sortBy={sortBy} descending={descending} />
                </span>
                <span className="sortable" onClick={() => toggleSort("contract")}>
                  <IconContract />Contract<SortArrow field="contract" sortBy={sortBy} descending={descending} />
                </span>
                <span className="sortable center" onClick={() => toggleSort("tenure")}>
                  <IconClock />Tenure<SortArrow field="tenure" sortBy={sortBy} descending={descending} />
                </span>
                <span className="sortable center" onClick={() => toggleSort("monthly_charges")}>
                  <IconMoney />Monthly<SortArrow field="monthly_charges" sortBy={sortBy} descending={descending} />
                </span>
                <span className="sortable center" onClick={() => toggleSort("outreach_stage")}>
                  <IconFlow />Outreach<SortArrow field="outreach_stage" sortBy={sortBy} descending={descending} />
                </span>
              </div>
              <div className="rows">
              {data.items.map((customer) => (
                <div
                  className="row"
                  key={customer.customer_id}
                  onClick={() =>
                      onSelect(
                        customer.customer_id,
                        data.items.map((item) => item.customer_id),
                      )
                    }
                >
                  <div
                    className="row-mark"
                    style={{ background: TIER_COLOUR[customer.tier] }}
                  />
                  <div className="row-id">{customer.customer_id}</div>
                  <div><RiskTags factors={customer.top_factors} /></div>
                  <div className="score-cell">
                    <span className="score-num" style={{ color: TIER_COLOUR[customer.tier] }}>
                      {customer.score}
                    </span>
                    <div className="score-bar">
                      <span
                        style={{
                          width: `${customer.score}%`,
                          background: TIER_COLOUR[customer.tier],
                        }}
                      />
                    </div>
                    <span className={`chip chip-${customer.tier}`}>{customer.tier}</span>
                  </div>
                  <div>{customer.contract}</div>
                  <div className="num center">{customer.tenure} mo</div>
                  <div className="num center">${customer.monthly_charges.toFixed(2)}</div>
                  <div className="center">
                    <StageMini stage={customer.outreach_stage} subStage={customer.outreach_sub_stage} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        )}

        {data && data.total_pages > 1 && (
          <div className="pagination sticky">
            <button
              className="page-btn page-nav"
              disabled={!data.has_previous}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹ Prev
            </button>

            {pageNumbers(data.page, data.total_pages).map((entry, index) =>
              entry === "…" ? (
                <span className="page-ellipsis" key={`gap-${index}`}>…</span>
              ) : (
                <button
                  key={entry}
                  className={`page-btn${entry === data.page ? " active" : ""}`}
                  onClick={() => setPage(entry)}
                >
                  {entry}
                </button>
              ),
            )}

            <button
              className="page-btn page-nav"
              disabled={!data.has_next}
              onClick={() => setPage((p) => p + 1)}
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </>
  );
}

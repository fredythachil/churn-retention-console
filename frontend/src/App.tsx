import { useEffect, useState } from "react";

import { IconGrid } from "./components/Icons";
import { CustomerDetailView } from "./views/CustomerDetailView";
import { CustomerListView } from "./views/CustomerListView";

function customerIdFromHash(): string | null {
  const match = window.location.hash.match(/^#\/customer\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(customerIdFromHash);
  const [pageIds, setPageIds] = useState<string[]>([]);

  useEffect(() => {
    const onPop = () => setSelectedId(customerIdFromHash());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function open(customerId: string, ids: string[] = pageIds) {
    setPageIds(ids);
    window.history.pushState(null, "", `#/customer/${encodeURIComponent(customerId)}`);
    setSelectedId(customerId);
  }

  function step(delta: number) {
    const index = pageIds.indexOf(selectedId ?? "");
    const next = pageIds[index + delta];
    if (next) {
      window.history.replaceState(null, "", `#/customer/${encodeURIComponent(next)}`);
      setSelectedId(next);
    }
  }

  const index = selectedId ? pageIds.indexOf(selectedId) : -1;

  return (
    <div className="app">
      <div className="cmd-bar">
        <div className="cmd-left">
          <div className="cmd-logo">◆</div>
          <div className="cmd-title">
            <h1>Churn Risk &amp; Retention Console</h1>
            <div className="cmd-sub">Retention operations</div>
          </div>
        </div>

        {selectedId && index >= 0 && pageIds.length > 1 && (
          <div className="pager">
            <button
              className="pager-btn"
              disabled={index === 0}
              onClick={() => step(-1)}
              title="Previous customer"
            >
              ‹
            </button>
            <span className="pager-label">
              <em>{index + 1}</em> of <strong>{pageIds.length}</strong> customers
            </span>
            <button
              className="pager-btn"
              disabled={index === pageIds.length - 1}
              onClick={() => step(1)}
              title="Next customer"
            >
              ›
            </button>
          </div>
        )}

        <div className="cmd-left">
          {selectedId && (
            <button className="btn-back" onClick={() => window.history.back()}>
              <IconGrid />
              Back to list
            </button>
          )}
        </div>
      </div>

      {selectedId ? (
        <CustomerDetailView customerId={selectedId} />
      ) : (
        <CustomerListView onSelect={open} />
      )}
    </div>
  );
}

import { useEffect, useState } from "react";

import { CustomerDetailView } from "./views/CustomerDetailView";
import { CustomerListView } from "./views/CustomerListView";

// Two views, so a router would be overkill. The History API gives us working
// browser back/forward and shareable URLs in a handful of lines.
function customerIdFromHash(): string | null {
  const match = window.location.hash.match(/^#\/customer\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(customerIdFromHash);

  useEffect(() => {
    const onPop = () => setSelectedId(customerIdFromHash());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function selectCustomer(customerId: string) {
    window.history.pushState(null, "", `#/customer/${encodeURIComponent(customerId)}`);
    setSelectedId(customerId);
  }

  function backToList() {
    window.history.back();
  }

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

        <div className="cmd-left">
          {selectedId && <button onClick={backToList}>← Back to list</button>}
          <div className="cmd-live">
            <span className="live-dot" />
            Live
          </div>
        </div>
      </div>

      {selectedId ? (
        <CustomerDetailView customerId={selectedId} />
      ) : (
        <CustomerListView onSelect={selectCustomer} />
      )}
    </div>
  );
}

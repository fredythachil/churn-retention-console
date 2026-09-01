import { useState } from "react";

import { CustomerListView } from "./views/CustomerListView";
import { CustomerDetailView } from "./views/CustomerDetailView";

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Churn Risk & Retention Console</h1>
        {selectedId && <button onClick={() => setSelectedId(null)}>← Back to list</button>}
      </header>

      {selectedId ? (
        <CustomerDetailView customerId={selectedId} />
      ) : (
        <CustomerListView onSelect={setSelectedId} />
      )}
    </div>
  );
}

import { useState } from "react";

import { CustomerListView } from "./views/CustomerListView";

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Churn Risk & Retention Console</h1>
        {selectedId && <button onClick={() => setSelectedId(null)}>← Back to list</button>}
      </header>

      {selectedId ? (
        <div className="panel">Detail view for {selectedId} — coming next</div>
      ) : (
        <CustomerListView onSelect={setSelectedId} />
      )}
    </div>
  );
}

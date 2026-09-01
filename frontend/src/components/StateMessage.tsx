import { ApiError } from "../api/client";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <div className="state">{label}</div>;
}

export function EmptyState({ label }: { label: string }) {
  return <div className="state">{label}</div>;
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const apiError = error instanceof ApiError ? error : null;
  const message = apiError?.message ?? "Something went wrong.";

  return (
    <div className="state-error">
      <div>{message}</div>
      {apiError?.requestId && <code>Request ID: {apiError.requestId}</code>}
      {onRetry && (
        <div style={{ marginTop: 8 }}>
          <button onClick={onRetry}>Try again</button>
        </div>
      )}
    </div>
  );
}

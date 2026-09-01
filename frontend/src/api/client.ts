const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  readonly status: number;
  readonly requestId: string | null;

  constructor(message: string, status: number, requestId: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
  }

  get isOffline() {
    return this.status === 0;
  }

  get isConflict() {
    return this.status === 409;
  }

  get isNotFound() {
    return this.status === 404;
  }
}


async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      // FastAPI validation errors arrive as a list of field-level problems.
      return body.detail.map((d: { msg: string }) => d.msg).join("; ");
    }
  } catch {
    // Body was not JSON - fall through to the generic message.
  }
  return `Request failed with status ${response.status}`;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError(
      "Cannot reach the API. Check that the backend is running.",
      0,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      await readError(response),
      response.status,
      response.headers.get("X-Request-ID"),
    );
  }

  return response.json() as Promise<T>;
}

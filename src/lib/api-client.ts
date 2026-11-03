export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; code: string; message?: string }>;
    requestId?: string;
  };
}

export class ClientApiError extends Error {
  code: string;
  statusCode: number;
  details?: Array<{ field?: string; code: string; message?: string }>;

  constructor(message: string, code: string, statusCode: number, details?: Array<{ field?: string; code: string; message?: string }>) {
    super(message);
    this.name = 'ClientApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function apiFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const errorData = data as ApiErrorResponse;
    const message = errorData?.error?.message || `Request failed with status ${res.status}`;
    const code = errorData?.error?.code || 'UNKNOWN_ERROR';
    const details = errorData?.error?.details;
    throw new ClientApiError(message, code, res.status, details);
  }

  return data as T;
}


type ApiResponse<T = unknown> = {
  data: T;
  status: number;
};

type RequestBody = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

declare global {
  interface Window {
    __APP_CONFIG__?: {
      API_BASE_URL?: string;
    };
  }
}

const runtimeApiBaseUrl = typeof window === 'undefined' ? '' : window.__APP_CONFIG__?.API_BASE_URL || '';

export const apiBaseUrl = (runtimeApiBaseUrl || import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

async function request<T = unknown>(method: string, path: string, body?: RequestBody): Promise<ApiResponse<T>> {
  const response = await fetch(apiBaseUrl + path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof data === 'object' && data && 'message' in data
      ? String((data as { message?: unknown }).message)
      : 'Falha na comunicação com o servidor.';
    throw new Error(message);
  }

  return { data: data as T, status: response.status };
}

export const api = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: RequestBody) => request<T>('POST', path, body),
  put: <T = unknown>(path: string, body?: RequestBody) => request<T>('PUT', path, body),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),
};

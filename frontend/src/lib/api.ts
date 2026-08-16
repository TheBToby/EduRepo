// Dünner API-Client für das Backend. Funktioniert client- und serverseitig.
// Cookies (httpOnly access_token) werden dank credentials: 'include' automatisch mitgesendet.

const isServer = typeof window === 'undefined';

function baseUrl(): string {
  if (isServer) {
    // Innerhalb des Containers (SSR) den internen Hostnamen nutzen
    return process.env.API_INTERNAL_URL || 'http://backend:4000';
  }
  // Client: standardmaessig same-origin ueber den Next.js-Rewrite /api/*
  // (funktioniert mit localhost, lokaler IP und Reverse-Proxy/Coder-URL).
  // NEXT_PUBLIC_API_URL setzt man nur, wenn der Browser das Backend direkt
  // erreichen soll (z. B. http://<ip>:4000 im lokalen Netz).
  return process.env.NEXT_PUBLIC_API_URL || '';
}

type FetchOpts = RequestInit & {
  // Für Datei-Uploads: formData statt JSON
  formData?: FormData;
};

export async function apiFetch<T = any>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { formData, headers, ...rest } = opts;
  // Vollstaendige URLs (z. B. presigned S3-Links) direkt verwenden.
  // Relative Pfade: Server-side direkt ans Backend, Client-side ueber den
  // same-origin Proxy /api/* (Next.js-Rewrite in next.config.mjs).
  let url: string;
  if (path.startsWith('http')) {
    url = path;
  } else if (isServer) {
    url = `${baseUrl()}${path}`;
  } else {
    url = `/api${path.startsWith('/') ? path : `/${path}`}`;
  }

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };
  if (!formData) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: formData ?? (rest.body ? JSON.stringify(rest.body) : undefined),
    credentials: 'include',
    cache: 'no-store',
  });

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? safeJson(text) : undefined;
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || res.statusText;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: any) {
    super(message);
  }
}

// --- Convenience-Methoden ---
export const api = {
  get: <T = any>(path: string, opts?: FetchOpts) => apiFetch<T>(path, { ...(opts || {}), method: 'GET' }),
  post: <T = any>(path: string, body?: any, opts?: FetchOpts) =>
    apiFetch<T>(path, { ...(opts || {}), method: 'POST', body }),
  patch: <T = any>(path: string, body?: any, opts?: FetchOpts) =>
    apiFetch<T>(path, { ...(opts || {}), method: 'PATCH', body }),
  delete: <T = any>(path: string, body?: any, opts?: FetchOpts) =>
    apiFetch<T>(path, { ...(opts || {}), method: 'DELETE', body }),
  upload: <T = any>(path: string, formData: FormData, opts?: FetchOpts) =>
    apiFetch<T>(path, { ...(opts || {}), method: 'POST', formData }),
};
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

type ApiOptions = RequestInit & {
  token?: string;
};

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || `Request failed: ${response.status}`);
  }

  return body as T;
}

const API_URL = process.env.NEXT_PUBLIC_CONTROL_URL || "http://localhost:3001";

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("flux_token") : null;
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.method !== "DELETE") {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("flux_token");
      window.location.href = "/login";
    }
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function getStoredToken() {
  return typeof window !== "undefined" ? localStorage.getItem("flux_token") : null;
}

export function getStoredUser() {
  const raw = typeof window !== "undefined" ? localStorage.getItem("flux_user") : null;
  return raw ? JSON.parse(raw) : null;
}

import { useSession } from "next-auth/react";
import { useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_CONTROL_URL || "http://localhost:3001";

// Raw HTTP helper — always reads token from localStorage as fallback
async function request<T = any>(endpoint: string, token: string | null, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.method !== "DELETE") {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Legacy export — reads from localStorage only (kept for backward compat)
export async function fetchApi<T = any>(endpoint: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const token = options.token || (typeof window !== "undefined" ? localStorage.getItem("flux_token") : null);
  return request<T>(endpoint, token, options);
}

export function getStoredToken() {
  return typeof window !== "undefined" ? localStorage.getItem("flux_token") : null;
}

export function getStoredUser() {
  const raw = typeof window !== "undefined" ? localStorage.getItem("flux_user") : null;
  return raw ? JSON.parse(raw) : null;
}

// ─── Central API hook ──────────────────────────────────────────────────────
// Every page should use this instead of calling fetchApi directly.
// Token is resolved once from session → localStorage, injected into every call.
export function useFluxApi(projectId?: string) {
  const { data: session } = useSession();
  const token = useCallback(() => {
    return session?.flux_token || (typeof window !== "undefined" ? localStorage.getItem("flux_token") : null);
  }, [session]);

  return {
    /* Projects */
    getProjects: () => request("/projects", token()),
    seedProject: (id?: string) =>
      request(`/projects/${id ?? projectId}/seed`, token(), { method: "POST" }),

    /* Functions */
    getFunctions: (id?: string) =>
      request(`/functions?project_id=${id ?? projectId}`, token()),
    getFunction: (funcId: string) =>
      request(`/functions/${funcId}`, token()),

    /* Executions */
    getExecutions: (id?: string, extra = "") =>
      request(`/executions?project_id=${id ?? projectId}${extra}`, token()),
    getExecution: (execId: string) =>
      request(`/executions/${execId}`, token()),
    getFunctionExecutions: (funcId: string) =>
      request(`/executions?function_id=${funcId}`, token()),
    replayExecution: (execId: string) =>
      request(`/executions/${execId}/replay`, token(), { method: "POST" }),
    resumeExecution: (execId: string) =>
      request(`/executions/${execId}/resume`, token(), { method: "POST" }),

    /* Stats */
    getProjectStats: (id?: string) =>
      request(`/stats/project?project_id=${id ?? projectId}`, token()).catch(() => null),

    /* Routes */
    getRoutes: (id?: string) =>
      request(`/routes?project_id=${id ?? projectId}`, token()),

    /* Orgs */
    getOrgs: () => request("/orgs", token()),
    getOrgMembers: (orgId: string) => request(`/orgs/${orgId}/members`, token()),
  };
}

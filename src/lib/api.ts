import { useCallback, useMemo } from "react";
import type {
  Project,
  Execution,
  ExecutionDetail,
  Function,
  Org,
  OrgMember,
  Route,
  ServiceToken,
} from "@/types/api";
import { useAuth } from "@/components/auth/AuthProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Raw HTTP helper — always reads token from localStorage as fallback
async function request<T = unknown>(
  endpoint: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.method !== "DELETE") {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `Request failed: ${res.status}`,
    );
  }
  return res.json();
}

export async function fetchApi<T = unknown>(
  endpoint: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const token =
    options.token ||
    (typeof window !== "undefined" ? localStorage.getItem("flux_token") : null);
  return request<T>(endpoint, token, options);
}

export function getStoredToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("flux_token")
    : null;
}

export function getStoredUser() {
  const raw =
    typeof window !== "undefined" ? localStorage.getItem("flux_user") : null;
  return raw ? JSON.parse(raw) : null;
}

// ─── Central API hook ──────────────────────────────────────────────────────
export function useFluxApi(projectId?: string) {
  const { session, status } = useAuth();
  const token = useCallback(() => {
    return (
      session?.flux_token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("flux_token")
        : null)
    );
  }, [session]);

  return useMemo(
    () => ({
      status,
      ready: status !== "loading",
      /* General */
      request: <T = unknown>(endpoint: string, options?: RequestInit) =>
        request<T>(endpoint, token(), options),

      /* Projects */
      getProjects: () => request<Project[]>("/projects", token()),
      seedProject: (id?: string) =>
        request<{ success: boolean; projectId: string }>(
          `/projects/${id ?? projectId}/seed`,
          token(),
          { method: "POST" },
        ),

      /* Functions */
      getFunctions: (id?: string) =>
        request<Function[]>(
          `/functions?project_id=${id ?? projectId}`,
          token(),
        ),
      getFunction: (funcId: string) =>
        request<Function>(`/functions/${funcId}`, token()),

      /* Executions */
      getExecutions: (id?: string, extra = "") =>
        request<Execution[]>(
          `/executions?project_id=${id ?? projectId}${extra}`,
          token(),
        ),
      getExecution: (execId: string) =>
        request<ExecutionDetail>(`/executions/${execId}`, token()),
      getFunctionExecutions: (funcId: string) =>
        request<Execution[]>(`/executions?function_id=${funcId}`, token()),
      replayExecution: (execId: string) =>
        request<Execution>(`/executions/${execId}/replay`, token(), {
          method: "POST",
        }),
      resumeExecution: (execId: string) =>
        request<{ success: boolean }>(`/executions/${execId}/resume`, token(), {
          method: "POST",
        }),

      /* Stats */
      getProjectStats: (id?: string) =>
        request<Record<string, unknown>>(
          `/stats/project?project_id=${id ?? projectId}`,
          token(),
        ).catch(() => null),

      /* Routes */
      getRoutes: (id?: string) =>
        request<Route[]>(`/routes?project_id=${id ?? projectId}`, token()),

      /* Orgs */
      getOrgs: () => request<Org[]>("/orgs", token()),
      getOrgMembers: (orgId: string) =>
        request<OrgMember[]>(`/orgs/${orgId}/members`, token()),

      /* Service Tokens */
      getServiceTokens: (id?: string) =>
        request<ServiceToken[]>(
          `/service-tokens?project_id=${id ?? projectId}`,
          token(),
        ),
      createServiceToken: (name: string, id?: string) =>
        request<ServiceToken>("/service-tokens", token(), {
          method: "POST",
          body: JSON.stringify({ project_id: id ?? projectId, name }),
        }),
      revokeServiceToken: (tokenId: string) =>
        request<{ success: boolean }>(`/service-tokens/${tokenId}`, token(), {
          method: "DELETE",
        }),
    }),
    [token, status, projectId],
  );
}

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
  ProjectOverviewResult,
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
      getProjects: (orgId?: string) => 
        request<Project[]>(`/projects${orgId ? `?org_id=${orgId}` : ""}`, token()),
      getProject: (id: string) =>
        request<Project>(`/projects/${id}`, token()),
      createProject: (name: string, org_id: string) =>
        request<Project>("/projects", token(), {
          method: "POST",
          body: JSON.stringify({ name, org_id }),
        }),
      deleteProject: (id: string) =>
        request<{ success: boolean }>(`/projects/${id}`, token(), {
          method: "DELETE",
        }),
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
      deleteFunction: (funcId: string) =>
        request<{ ok: boolean }>(`/functions/${funcId}`, token(), { method: "DELETE" }),

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
      updateFunction: (funcId: string, updates: Partial<{ access_policy: string, rate_limit_rpm: number, max_duration_ms: number, webhook_secret: string, latest_artifact_id: string }>) =>
        request<Function>(`/functions/${funcId}`, token(), {
          method: "PATCH",
          body: JSON.stringify(updates),
        }),
      getProjectOverview: (id?: string) =>
        request<ProjectOverviewResult>(`/overview?project_id=${id ?? projectId}`, token()).catch(() => null),
      getFunctionStats: (funcId: string) =>
        request<any>(`/function/${funcId}/overview`, token()),
      getDeployments: (funcId: string) =>
        request<any[]>(`/functions/${funcId}/deployments`, token()).catch(() => []),

      /* Routes */
      getRoutes: (id?: string) =>
        request<Route[]>(`/routes?project_id=${id ?? projectId}`, token()),
      createRoute: (method: string, path: string, function_id: string, id?: string) =>
        request<Route>("/routes", token(), {
          method: "POST",
          body: JSON.stringify({ project_id: id ?? projectId, method, path, function_id }),
        }),
      updateRoute: (routeId: string, method: string, path: string, function_id: string) =>
        request<Route>(`/routes/${routeId}`, token(), {
          method: "PUT",
          body: JSON.stringify({ method, path, function_id }),
        }),
      deleteRoute: (routeId: string) =>
        request<{ success: boolean }>(`/routes/${routeId}`, token(), {
          method: "DELETE",
        }),

      /* Orgs */
      getOrgs: () => request<Org[]>("/orgs", token()),
      createOrg: (name: string) =>
        request<Org>("/orgs", token(), {
          method: "POST",
          body: JSON.stringify({ name }),
        }),
      getOrgMembers: (orgId: string) =>
        request<OrgMember[]>(`/orgs/${orgId}/members`, token()),

      /* Team management */
      getTeam: (orgId: string) =>
        request<{ members: { id: string; email: string; role: string }[]; pending: { id: string; email: string; role: string; created_at: string }[] }>(
          `/orgs/${orgId}/team`, token()),
      getProjectAccess: (projectId: string) =>
        request<{ members: { user_id: string; email: string; org_role: string; project_role: string | null }[] }>(
          `/projects/${projectId}/access`, token()),
      setProjectAccessRole: (projectId: string, userId: string, role: "engineer" | "viewer") =>
        request<{ ok: boolean }>(`/projects/${projectId}/access/${userId}`, token(), {
          method: "PUT",
          body: JSON.stringify({ role }),
        }),
      removeProjectAccess: (projectId: string, userId: string) =>
        request<{ ok: boolean }>(`/projects/${projectId}/access/${userId}`, token(), {
          method: "DELETE",
        }),
      updateMemberRole: (orgId: string, userId: string, role: string) =>
        request<{ ok: boolean }>(`/orgs/${orgId}/team/${userId}`, token(), {
          method: "PATCH",
          body: JSON.stringify({ role }),
        }),
      removeMember: (orgId: string, userId: string) =>
        request<{ ok: boolean }>(`/orgs/${orgId}/team/${userId}`, token(), { method: "DELETE" }),
      sendInvite: (orgId: string, email: string, role: string) =>
        request<{ ok: boolean; invitation_id: string; email_sent: boolean; email_error: string | null }>(
          `/orgs/${orgId}/invitations`, token(), {
            method: "POST",
            body: JSON.stringify({ email, role }),
          }),
      revokeInvite: (orgId: string, invId: string) =>
        request<{ ok: boolean }>(`/orgs/${orgId}/invitations/${invId}`, token(), { method: "DELETE" }),
      acceptInvitation: (inviteToken: string) =>
        request<{ ok: boolean; org_id: string }>("/invitations/accept", token(), {
          method: "POST",
          body: JSON.stringify({ token: inviteToken }),
        }),
      getInvitation: (inviteToken: string) =>
        request<{ invitation: { id: string; email: string; role: string; org_id: string; org_name: string; org_slug: string; expires_at: string } }>(
          `/invitations/accept?token=${encodeURIComponent(inviteToken)}`, null),
      getMyInvitations: () =>
        request<{ invitations: { id: string; token: string; email: string; role: string; org_id: string; org_name: string; org_slug: string; expires_at: string; created_at: string }[] }>(
          "/me/invitations", token()),

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

      getOrCreateDefaultToken: async (id?: string): Promise<string | null> => {
        const pId = id ?? projectId;
        if (!pId) return null;
        
        try {
          // 1. Fetch existing tokens
          const tokens = await request<ServiceToken[]>(`/service-tokens?project_id=${pId}`, token());
          const existing = tokens.find(t => (t.name === "Default Service Token" || t.name === "CLI Onboarding Token") && !t.revoked);
          
          // 2. Check localStorage
          const storageKey = `flux_sk_${pId}`;
          const cachedToken = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;

          if (existing && cachedToken) {
            return cachedToken;
          } else {
            // Create new or refresh
            const newToken = await request<ServiceToken & { token: string }>("/service-tokens", token(), {
              method: "POST",
              body: JSON.stringify({ project_id: pId, name: "Default Service Token" }),
            });
            if (newToken.token && typeof window !== "undefined") {
              localStorage.setItem(storageKey, newToken.token);
              return newToken.token;
            }
            return newToken.token || null;
          }
        } catch (err) {
          console.error("Failed to get/create default token:", err);
          return null;
        }
      },
    }),
    [token, status, projectId],
  );
}

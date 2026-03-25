export interface Project {
  id: string;
  org_id: string | null;
  name: string;
  base_domain: string | null;
  created_at: string | null;
}

export interface Function {
  id: string;
  project_id: string | null;
  name: string;
  latest_artifact_id: string | null;
  created_at: string | null;
  method?: string;
  path?: string;
}

export interface Execution {
  id: string;
  request_id: string;
  project_id: string | null;
  method: string;
  path: string;
  status: string;
  request: any;
  response: any;
  error: string | null;
  code_sha: string;
  started_at: string;
  duration_ms: number;
}

export interface LogEntry {
  execution_id: string;
  seq: number;
  level: string;
  message: string;
  created_at: string;
  context?: any;
}

export interface ExecutionDetail extends Execution {
  logs?: LogEntry[];
  console_logs?: LogEntry[];
}

export interface Org {
  id: string;
  name: string;
  created_at: string | null;
}

export interface OrgMember {
  user_id: string;
  org_id: string;
  role: string | null;
  email: string; // Patched in by backend
}

export interface Route {
  id: string;
  project_id: string | null;
  method: string;
  path: string;
  function_id: string | null;
  created_at: string | null;
}

export interface Webhook {
  id: string;
  project_id: string | null;
  url: string;
  created_at: string | null;
}

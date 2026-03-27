import type { 
  Execution as BaseExecution, 
  ExecutionConsoleLog, 
  Function as BaseFunction,
  Project as BaseProject,
  Org as BaseOrg,
  Route as BaseRoute,
  Member as BaseMember,
  User as BaseUser,
  Waitlist as BaseWaitlist,
  Webhook as BaseWebhook,
  Checkpoint as BaseCheckpoint
} from "./schema";

export type { ExecutionConsoleLog };
export type Project = BaseProject;
export type Org = BaseOrg;
export type OrgMember = BaseMember & {
  id?: string; // sometimes used as alias for user_id in UI
  email?: string;
};
export type Route = BaseRoute & {
  function_name?: string;
  access_policy?: string;
  rate_limit_rpm?: number;
  max_duration_ms?: number;
};
export type User = BaseUser;
export type Waitlist = BaseWaitlist;
export interface Webhook extends BaseWebhook {
  events?: string[];
  status?: string;
}
export type Checkpoint = BaseCheckpoint & {
  query?: string;
};

export interface FunctionStatsResult {
  stats: {
    total_execs: number;
    errors: number;
    p50: number;
    p95: number;
    p99: number;
  };
  top_issues: {
    id: string;
    title: string;
    fingerprint: string;
    count: number;
    first_seen: string;
    last_seen: string;
  }[];
  timeseries: {
    hour: string;
    total: number;
    errors: number;
  }[];
  root_cause: {
    issue: string;
    impact: string;
    cause: string;
    confidence: number;
    started_at: string;
  } | null;
}

export interface Function extends BaseFunction {
  method?: string;
  path?: string;
  total_execs?: number;
  total_errors?: number;
  p95?: number;
  last_error_at?: string;
  stats?: {
    total_execs: number;
    errors: number;
    avg_duration: number;
  };
  routes?: Route[];
}

export interface Execution extends BaseExecution {
  external_calls?: number;
}

export interface LogEntry extends ExecutionConsoleLog {
  context?: Record<string, unknown>;
  args_json?: string;
}

export interface ExecutionDetail {
  execution: Execution;
  spans: {
    type: string;
    label: string | null;
    start_ms: number;
    duration_ms: number;
  }[];
  logs?: LogEntry[];
}

export interface ServiceToken {
  id: string;
  name?: string;
  scope: string;
  created_at: string;
  last_used_at?: string;
  usage_24h?: number;
  revoked: boolean;
  token?: string; // only present on create
}

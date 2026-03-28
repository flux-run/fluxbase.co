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
    p95_delta?: number;
    p95_baseline?: number;
  };
  top_issues: {
    id: string;
    title: string;
    fingerprint: string;
    error_source?: 'user_code' | 'platform_runtime' | 'platform_executor';
    error_type?: string;
    code_sha: string;
    count: number;
    first_seen: string;
    last_seen: string;
    sample_stack?: string | null;
  }[];
  timeseries: {
    hour: string;
    total: number;
    errors: number;
  }[];
  span_breakdown?: {
    type: string;
    avg_duration: number;
  }[];
  impact_stats?: {
    unique_ips: number;
    unique_uas: number;
  } | null;
  root_cause: {
    issue: string;
    impact: string;
    cause: string;
    confidence: number;
    confidence_reason?: string;
    phase?: string;
    started_at: string;
    suggestion?: string;
    sample_stack?: string;
    impact_count?: number;
    latest_failure?: {
      id: string;
      time: string;
      duration: string;
      error: string;
    } | null;
  } | null;
  health: {
    severity: "critical" | "warning" | "info" | "healthy";
    message: string;
  };
}

export interface Function extends BaseFunction {
  method?: string;
  path?: string;
  total_execs?: number;
  total_errors?: number;
  p95?: number;
  last_error_at?: string;
  severity?: "critical" | "warning" | "healthy";
  status_message?: string;
  status?: string;
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
    metadata?: any;
  }[];
  logs?: LogEntry[];
  narrative?: {
    issue: string;
    cause: string;
    impact: string;
    suggestion: string;
    next_steps: string[];
    classification: 'success' | 'critical_failure' | 'pre_runtime_failure' | 'timeout' | 'anomaly';
    severity: 'critical' | 'high' | 'medium' | 'healthy';
    source: 'user_code' | 'platform_runtime';
    root_cause?: string;
    synthetic_root_cause?: string;
    details?: string;
    phase?: string;
    no_runtime_entry?: boolean;
    confidence: number;
    confidence_reason?: string;
    pattern_history?: {
      count: number;
      window_min: number;
    };
    breakdown: {
      js_ms: number;
      io_ms: number;
      overhead_ms: number;
    };
    anomaly?: {
      avg_duration: number;
      is_abnormal: boolean;
      message: string;
    };
  };
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

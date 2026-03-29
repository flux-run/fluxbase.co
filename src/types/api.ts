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
    /** Backend-computed: true if this fingerprint has appeared in executions
     *  whose code_sha matches the current (latest) deployment's artifact_id. */
    active_in_current_deploy?: boolean;
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
  /** Per-deployment execution stats, computed server-side. */
  deploy_slices?: {
    artifact_id: string;
    total: number;
    errors: number;
    rate: number;
  }[];
  /** Verification state per failure cluster, computed server-side. */
  cluster_verification?: {
    cls: 'infra' | 'external' | 'runtime' | 'user';
    state: 'active' | 'unverified' | 'verified_fixed' | 'regressed';
    confidence: 'high' | 'medium' | 'low';
    execCount: number;
    errorCount: number;
    failureRate: number;
    matchedTotal: number;
    matchedSuccess: number;
    matchedFail: number;
    reason: string;
    isDeterministic: boolean;
    isRegressed: boolean;
    pathsTracked: boolean;
    observationState: 'not_observed' | 'partially_observed' | 'likely_fixed' | 'verified';
    lastMatchedAt: string | null;
    matchingCriteria: {
      codeSha: string | null;
      callSites: string[];
      externalDep: string | null;
      errorType: string | null;
      errorSource: string | null;
      errorSignature: string | null;
    };
    confidenceScore: number;
    verifyMode: 'deterministic' | 'probabilistic' | 'deployment';
    requiredToVerify: number;
    pathCoveredCount: number;
    deployElapsedSec: number | null;
    expectedByNow: number | null;
    isSuspiciouslyLow: boolean;
    lastFailedExecId: string | null;
  }[];
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
  latest_artifact_id: string | null;
  latest_deploy_at?: string | null;
  latest_deploy_status?: string | null;
  stats?: {
    total_execs: number;
    errors: number;
    avg_duration: number;
  };
  routes?: Route[];
}

export interface Execution extends BaseExecution {
  external_calls?: number;
  function_id?: string | null;
  function_name?: string | null;
  actor_name?: string | null;
  actor_type?: 'user' | 'ci' | 'service' | null;
  token_name?: string | null;
  token_tags?: string | null;
}

export interface LogEntry extends ExecutionConsoleLog {
  context?: Record<string, unknown>;
  args_json?: string;
}

export interface ExecutionDetail {
  execution: Execution;
  checkpoints?: Checkpoint[];
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
  created_by?: string; // user email or name
  tags?: string[]; // context tags: ['production', 'github-actions', etc]
}

export interface AlertChannel {
  id: string;
  type: 'webhook' | 'email' | 'slack';
  target: string;
  enabled: boolean;
  label?: string;
  created_at: string;
}

export interface AlertRules {
  high_error_rate: {
    enabled: boolean;
    threshold_pct: number;
    window_min: number;
  };
  new_incident: {
    enabled: boolean;
  };
  failure_spike: {
    enabled: boolean;
    multiplier: number;
    window_min: number;
  };
}

export interface ProjectOverviewResult {
  incidents: {
    id: string;
    title: string;
    errorClass: 'infra' | 'external' | 'runtime' | 'user';
    functionId: string;
    functionName: string;
    failureRatePct: number;
    trafficImpactPct: number;
    totalErrors: number;
    totalExecs: number;
    firstSeen: string;
    lastSeen: string;
    deployId: string | null;
    deployedAt: string | null;
    // causality evidence fields
    errorsAfterDeploy: number;
    errorsBeforeDeploy: number;
    execsAfterDeploy: number;   // total executions after latest deploy (for rate computation)
    execsBeforeDeploy: number;  // total executions before latest deploy (for rate computation)
    allOnlyAfterDeploy: boolean;
    causalityScore: number;   // 0–1 computed from time proximity + before/after evidence
    isRecurring: boolean;     // true = fingerprint also seen in previous deploy (not fixed)
  }[];
  brokenAfterDeploy: {
    functionId: string;
    functionName: string;
    deployId: string | null;
    deployedAt: string;
    deployedAgoSec: number | null;
    prevFailurePct: number;
    currentFailurePct: number;
    prevExecs: number;
    currentExecs: number;
    topIssue: string | null;
  }[];
  verificationQueue: {
    functionId: string;
    functionName: string;
    errorClass: string;
    title: string;
    deployId: string | null;
    deployedAt: string;
    progress: number;
    required: number;
    progressPct: number;
    verifyStatus: 'waiting' | 'partial';
    lastSeenAt: string;
  }[];
  recentFixes: {
    functionId: string;
    functionName: string;
    errorClass: string;
    title: string;
    deployId: string | null;
    deployedAt: string | null;
    lastFailedAt: string;
    execsSinceFix: number;
    confidence: 'high' | 'medium' | 'low';
  }[];
  health: {
    activeIncidents: number;
    functionsFailing: number;
    trafficImpactPct: number;
  };
}

export interface ProjectUsageResult {
  period: 'mtd' | 'lastMonth';
  range: {
    start: string;
    end: string;
  };
  usage: {
    total_executions: number;
    failed_executions: number;
    total_compute_ms: number;
    avg_duration_ms: number;
  };
  top_sources: {
    source: string;
    count: number;
    pct: number;
  }[];
  trend: {
    day: string;
    executions: number;
    compute_ms: number;
  }[];
}

export interface ProjectObservabilityResult {
  health: {
    severity: 'critical' | 'warning' | 'info' | 'healthy';
    error_rate: number;
    message: string;
  };
  last_24h: {
    total: number;
    errors: number;
    p95_duration_ms: number;
    avg_duration_ms: number;
  };
  top_failing_paths: {
    path: string;
    total: number;
    errors: number;
    error_rate: number;
  }[];
  top_issues: {
    title: string;
    fingerprint: string;
    occurrence_count: number;
    last_seen: string;
    function_name: string;
  }[];
}

export type IncidentStatus = 'active' | 'investigating' | 'resolved';

export interface IncidentActivityEvent {
  id: string;
  type: 'system' | 'comment' | 'ai';
  text: string;
  actor?: string;
  actor_id?: string;
  metadata?: {
    command?: string;
    success?: boolean;
    previous_state?: string;
    next_state?: string;
    duration_ms?: number;
  };
  ts: string;
}

export interface IncidentState {
  status: IncidentStatus;
  ownerId?: string;
  owner: string;
  checkedActions: string[];  // action text strings, not indices
  activity: IncidentActivityEvent[];
  commandSequence?: Array<{
    command: 'assign' | 'investigate' | 'resolve' | 'reopen' | 'note';
    ts: string;
    user_id?: string | null;
  }>;
  milestones?: {
    first_assign_at?: string;
    first_investigate_at?: string;
    first_resolve_at?: string;
  };
  signalMetrics?: {
    time_to_assign_sec?: number;
    time_to_investigate_sec?: number;
    time_to_resolve_sec?: number;
  };
  created_at?: string;
  updated_at?: string;
}

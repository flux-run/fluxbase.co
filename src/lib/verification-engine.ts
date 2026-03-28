/**
 * Failure clustering, fingerprinting, and post-deploy verification engine.
 * Pure logic — no React, no side effects. All inputs passed explicitly.
 */

import type { Execution, FunctionStatsResult } from '@/types/api';
import { normalizeErrorSig } from './error-utils';

// ── Error classification ──────────────────────────────────────────────────────

export type ErrorClass = 'infra' | 'external' | 'runtime' | 'user';

export const ERROR_CLASS_META: Record<ErrorClass, {
  label: string; icon: string;
  color: string; bg: string; border: string; dimColor: string;
  description: string;
}> = {
  infra:    { label: 'Infra Failure',    icon: '⚙️', color: 'text-orange-400', dimColor: 'text-orange-400/60', bg: 'bg-orange-950/20', border: 'border-orange-800/50', description: 'Deployment or artifact issue' },
  external: { label: 'External Failure', icon: '🌐', color: 'text-blue-400',   dimColor: 'text-blue-400/60',   bg: 'bg-blue-950/20',   border: 'border-blue-800/50',   description: 'Outside dependency failed' },
  runtime:  { label: 'Runtime Error',    icon: '⚡',  color: 'text-red-400',    dimColor: 'text-red-400/60',    bg: 'bg-red-950/20',    border: 'border-red-800/50',    description: 'JavaScript engine error' },
  user:     { label: 'User Code Error',  icon: '💥', color: 'text-yellow-400', dimColor: 'text-yellow-400/60', bg: 'bg-yellow-950/20', border: 'border-yellow-800/50', description: 'Thrown by your code' },
};

/** Priority order for cause chains: infra → external → runtime → user */
export const CLASS_ORDER: ErrorClass[] = ['infra', 'external', 'runtime', 'user'];

export function classifyError(title: string, errorSource?: string | null, errorType?: string | null): ErrorClass {
  const t    = title.toLowerCase();
  const type = (errorType ?? '').toLowerCase();
  const src  = errorSource ?? '';
  if (type.includes('no_artifact') || t.includes('no_artifact') || src.includes('executor') || t.includes('boot failed')) return 'infra';
  if (t.includes('fetch failed') || t.includes('failed to fetch') || t.includes('dns') ||
      t.includes('connection refused') || t.includes('econnrefused') || t.includes('timeout') ||
      t.includes('certificate') || t.includes('tls') || t.includes('ssl') ||
      src === 'platform_runtime') return 'external';
  if (src === 'user_code') return 'user';
  return 'runtime';
}

export type FailureCluster = {
  cls: ErrorClass;
  totalHits: number;
  issues: FunctionStatsResult['top_issues'];
};

export function buildFailureClusters(issues: FunctionStatsResult['top_issues']): FailureCluster[] {
  return CLASS_ORDER
    .map(cls => {
      const clsIssues = issues.filter(iss => classifyError(iss.title, iss.error_source, iss.error_type) === cls);
      return { cls, totalHits: clsIssues.reduce((s, i) => s + i.count, 0), issues: clsIssues };
    })
    .filter(g => g.issues.length > 0)
    .sort((a, b) => b.totalHits - a.totalHits);
}

// ── Deploy slice ──────────────────────────────────────────────────────────────

export type DeploySlice = {
  total: number;
  errors: number;
  rate: number;
  execs: Execution[];
} | null;

export function computeDeploySlices(
  executions: Execution[],
  latestArtifactId: string | null | undefined,
  prevArtifactId: string | null | undefined,
): { latestSlice: DeploySlice; prevSlice: DeploySlice } {
  const byDeploy = executions.reduce<Record<string, Execution[]>>((acc, e) => {
    const key = e.code_sha ?? '__unknown__';
    (acc[key] ??= []).push(e);
    return acc;
  }, {});
  const makeSlice = (sha: string | null | undefined): DeploySlice => {
    if (!sha) return null;
    const group  = byDeploy[sha] ?? [];
    const total  = group.length;
    const errors = group.filter(e => e.status !== 'ok').length;
    return { total, errors, rate: total > 0 ? errors / total : 0, execs: group };
  };
  return { latestSlice: makeSlice(latestArtifactId), prevSlice: makeSlice(prevArtifactId) };
}

// ── Verification engine ───────────────────────────────────────────────────────

export const VERIFIED_EXEC_MIN  = 20;
export const VERIFIED_EXEC_HIGH = 50;

export type VerifyState = 'active' | 'unverified' | 'verified_fixed' | 'regressed';

export type VerifyContext = {
  latestSlice:     DeploySlice;
  prevSlice:       DeploySlice;
  deployedAt:      number | null;
  /** Raw ISO string from the previous deployment record */
  prevDeployCreatedAt: string | null;
  functionName:    string | null;
  functionPath:    string | null;
  functionMethod:  string | null;
};

export type ClusterFingerprint = {
  errorFingerprints: Set<string>;
  errorTypeSources:  Set<string>;
  paths:             Set<string>;
};

export function extractClusterFingerprint(
  cluster: FailureCluster,
  allExecs: Execution[],
): ClusterFingerprint {
  const errorFingerprints = new Set<string>();
  const errorTypeSources  = new Set<string>();
  const paths             = new Set<string>();

  for (const issue of cluster.issues) {
    if (issue.fingerprint) errorFingerprints.add(issue.fingerprint);
    const ts = [issue.error_type, issue.error_source].filter(Boolean).join('|');
    if (ts) errorTypeSources.add(ts);
  }
  for (const exec of allExecs) {
    if (exec.status === 'ok') continue;
    const fp = exec.error_fingerprint;
    if (fp && errorFingerprints.has(fp)) { if (exec.path) paths.add(exec.path); continue; }
    const ts = [exec.error_type, exec.error_source].filter(Boolean).join('|');
    if (ts && errorTypeSources.has(ts) && exec.path) paths.add(exec.path);
  }
  return { errorFingerprints, errorTypeSources, paths };
}

export function execMatchesFingerprint(exec: Execution, fp: ClusterFingerprint): boolean {
  if (exec.error_fingerprint && fp.errorFingerprints.has(exec.error_fingerprint)) return true;
  const ts = [exec.error_type, exec.error_source].filter(Boolean).join('|');
  return !!(ts && fp.errorTypeSources.has(ts));
}

export type VerifyResult = {
  state:            VerifyState;
  confidence:       'high' | 'medium' | 'low';
  execCount:        number;
  errorCount:       number;
  failureRate:      number;
  matchedTotal:     number;
  matchedSuccess:   number;
  matchedFail:      number;
  reason:           string;
  isDeterministic:  boolean;
  isRegressed:      boolean;
  pathsTracked:     boolean;
  observationState: 'not_observed' | 'partially_observed' | 'likely_fixed' | 'verified';
  lastMatchedAt:    string | null;
  matchingCriteria: {
    codeSha:        string | null;
    callSites:      string[];
    externalDep:    string | null;
    errorType:      string | null;
    errorSource:    string | null;
    errorSignature: string | null;
  };
  confidenceScore:   number;
  verifyMode:        'deterministic' | 'probabilistic' | 'deployment';
  requiredToVerify:  number;
  pathCoveredCount:  number;
  deployElapsedSec:  number | null;
  expectedByNow:     number | null;
  isSuspiciouslyLow: boolean;
  lastFailedExecId:  string | null;
};

export function verifyClusterState(cluster: FailureCluster, ctx: VerifyContext): VerifyResult {
  const { latestSlice, prevSlice, deployedAt, prevDeployCreatedAt, functionName, functionPath, functionMethod } = ctx;

  const allHistoricalExecs = [...(latestSlice?.execs ?? []), ...(prevSlice?.execs ?? [])];
  const fp             = extractClusterFingerprint(cluster, allHistoricalExecs);
  const pathsTracked   = fp.paths.size > 0;
  const activeInCurrentDeploy = cluster.issues.some(i => (i as any).active_in_current_deploy === true);

  const execCount      = latestSlice?.total ?? 0;
  const currentErrors  = latestSlice?.errors ?? 0;
  const failureRate    = execCount > 0 ? Math.round((currentErrors / execCount) * 100) : 0;
  const isDeterministic = execCount >= 5 && failureRate >= 80;

  const currentExecs     = latestSlice?.execs ?? [];
  const pathCoveredExecs = pathsTracked ? currentExecs.filter(e => fp.paths.has(e.path)) : [];
  const matchedFail      = currentExecs.filter(e => e.status !== 'ok' && execMatchesFingerprint(e, fp)).length;
  const matchedSuccess   = pathCoveredExecs.filter(e => e.status === 'ok').length;
  const matchedTotal     = matchedFail + matchedSuccess;

  const prevExecs       = prevSlice?.execs ?? [];
  const prevMatchedFail = prevExecs.filter(e => e.status !== 'ok' && execMatchesFingerprint(e, fp)).length;
  const prevPathCovered = pathsTracked ? prevExecs.filter(e => fp.paths.has(e.path)).length : 0;
  const wasCleanInPrev  = prevMatchedFail === 0 && prevPathCovered >= 3;
  const isActiveNow     = activeInCurrentDeploy || matchedFail > 0 || (!pathsTracked && currentErrors > 0);
  const isRegressed     = wasCleanInPrev && isActiveNow;

  // Expected traffic baseline: extrapolate prev-deploy path-hit rate to current elapsed window
  const prevDeployStartMs    = prevDeployCreatedAt ? new Date(prevDeployCreatedAt).getTime() : null;
  const prevWindowHrs        = (prevDeployStartMs && deployedAt && prevDeployStartMs < deployedAt)
    ? Math.max(0.1, (deployedAt - prevDeployStartMs) / 3_600_000)
    : null;
  const prevPathCoveredPerHr = (prevWindowHrs && prevPathCovered > 0) ? prevPathCovered / prevWindowHrs : null;
  const currWindowHrs        = deployedAt ? (Date.now() - deployedAt) / 3_600_000 : null;
  const expectedByNow        = (prevPathCoveredPerHr !== null && currWindowHrs !== null)
    ? Math.round(prevPathCoveredPerHr * currWindowHrs)
    : null;
  const isSuspiciouslyLow    = expectedByNow !== null && expectedByNow >= 3 && pathCoveredExecs.length === 0;

  // Adaptive verification mode
  const prevFailureRate = (prevSlice?.total ?? 0) > 0
    ? Math.round(((prevSlice?.errors ?? 0) / (prevSlice?.total ?? 1)) * 100) : 0;
  const wasHistoricallyDeterministic = (prevSlice?.total ?? 0) >= 5 && prevFailureRate >= 80;
  const effectiveDeterministic = isDeterministic || wasHistoricallyDeterministic;
  const requiredToVerify = effectiveDeterministic ? 1 : VERIFIED_EXEC_MIN;

  // Observation state: 4 tiers independent of verify state
  const observationState: VerifyResult['observationState'] =
    matchedFail === 0 && (effectiveDeterministic ? matchedSuccess >= 1 : matchedSuccess > 0 && matchedTotal >= 3)
      ? 'verified'
      : matchedFail === 0 && matchedTotal >= 2
      ? 'likely_fixed'
      : matchedTotal === 0
      ? 'not_observed'
      : 'partially_observed';

  const confidenceScore =
    observationState === 'verified'
      ? Math.min(95, 25 + Math.round((matchedSuccess / Math.max(VERIFIED_EXEC_MIN, 1)) * 70))
      : observationState === 'likely_fixed'
      ? Math.min(80, 20 + Math.round((matchedTotal / Math.max(VERIFIED_EXEC_MIN, 1)) * 60))
      : observationState === 'partially_observed' && isActiveNow
      ? Math.min(90, isDeterministic
          ? 60 + Math.round((matchedFail / Math.max(VERIFIED_EXEC_MIN, 1)) * 30)
          : 25 + Math.round((matchedFail / Math.max(VERIFIED_EXEC_MIN, 1)) * 45))
      : observationState === 'partially_observed'
      ? Math.min(50, Math.round((matchedTotal / Math.max(VERIFIED_EXEC_MIN, 1)) * 50))
      : 0;

  const allMatchedExecs = currentExecs.filter(e => execMatchesFingerprint(e, fp));
  const lastMatchedAt = allMatchedExecs.reduce<string | null>(
    (best, e) => e.started_at && (!best || e.started_at > best) ? e.started_at : best, null,
  );
  const lastFailedExec   = allMatchedExecs
    .filter(e => e.status !== 'ok')
    .sort((a, b) => (b.started_at ?? '').localeCompare(a.started_at ?? ''))[0] ?? null;
  const lastFailedExecId = lastFailedExec?.id ?? null;

  // Build matching criteria for UI display
  const matchingCodeSha   = currentExecs.find(e => e.code_sha)?.code_sha?.slice(0, 7) ?? null;
  const matchingCallSites = [...fp.paths].slice(0, 3);
  const extExec           = allMatchedExecs.find(e => e.error_source?.includes('external'));
  let matchingExternalDep: string | null = null;
  if (extExec?.error_message) {
    const m = extExec.error_message.match(/(?:https?:\/\/)?([a-z0-9\-\.]+\.[a-z]{2,}(?::\d+)?)/i);
    matchingExternalDep = m?.[1] ?? null;
  }
  const clusterErrorType      = cluster.issues[0]?.error_type ?? null;
  const clusterErrorSource    = cluster.issues[0]?.error_source ?? null;
  const clusterErrorSignature = normalizeErrorSig(cluster.issues[0]?.title) ?? clusterErrorType ?? null;
  const matchingCriteria = {
    codeSha:        matchingCodeSha,
    callSites:      matchingCallSites,
    externalDep:    matchingExternalDep,
    errorType:      clusterErrorType,
    errorSource:    clusterErrorSource,
    errorSignature: clusterErrorSignature,
  };

  const isInfra          = cluster.cls === 'infra';
  const effectiveVerifyMode: VerifyResult['verifyMode'] =
    isInfra ? 'deployment' : effectiveDeterministic ? 'deterministic' : 'probabilistic';
  const effectiveRequired  = isInfra ? 0 : requiredToVerify;
  const deployElapsedSec   = deployedAt ? Math.floor((Date.now() - deployedAt) / 1000) : null;

  // Base result spread — overrides applied per branch below
  const base: Omit<VerifyResult, 'state' | 'confidence' | 'reason' | 'errorCount' | 'failureRate' | 'matchedFail' | 'isDeterministic' | 'isRegressed'> = {
    execCount, matchedTotal, matchedSuccess, pathsTracked,
    observationState, lastMatchedAt, matchingCriteria, confidenceScore,
    verifyMode: effectiveVerifyMode, requiredToVerify: effectiveRequired,
    pathCoveredCount: pathCoveredExecs.length, deployElapsedSec,
    expectedByNow, isSuspiciouslyLow, lastFailedExecId,
  };

  if (isActiveNow) {
    const confidence: VerifyResult['confidence'] = matchedFail > 0 || activeInCurrentDeploy ? 'high' : 'medium';
    const reason = isRegressed
      ? `Re-emerged after ${prevPathCovered} clean exec${prevPathCovered !== 1 ? 's' : ''} in prev deploy`
      : isDeterministic
      ? `Deterministic — fails ${failureRate}% across ${execCount} exec${execCount !== 1 ? 's' : ''}`
      : `Reproducible · ${execCount} exec${execCount !== 1 ? 's' : ''}, ${failureRate}% failure rate`;
    return { ...base, state: isRegressed ? 'regressed' : 'active', confidence, errorCount: currentErrors, failureRate, matchedFail, reason, isDeterministic, isRegressed };
  }

  if (effectiveDeterministic ? matchedSuccess >= 1 : matchedTotal >= 3) {
    const confidence: VerifyResult['confidence'] = effectiveDeterministic ? 'high' : matchedTotal >= 15 ? 'high' : matchedTotal >= 5 ? 'medium' : 'low';
    return { ...base, state: 'verified_fixed', confidence, errorCount: 0, failureRate: 0, matchedFail: 0,
      reason: `Verified — ${matchedSuccess} exec${matchedSuccess !== 1 ? 's' : ''} on same path, no recurrence`,
      isDeterministic: false, isRegressed: false };
  }
  if (execCount >= VERIFIED_EXEC_HIGH)
    return { ...base, state: 'verified_fixed', confidence: 'medium', errorCount: 0, failureRate: 0, matchedFail: 0,
      reason: `Not reproduced across ${execCount} execs — path not yet exercised`, isDeterministic: false, isRegressed: false };
  if (execCount >= VERIFIED_EXEC_MIN)
    return { ...base, state: 'verified_fixed', confidence: 'low', errorCount: 0, failureRate: 0, matchedFail: 0,
      reason: `Not reproduced across ${execCount} execs — insufficient path coverage`, isDeterministic: false, isRegressed: false };

  return { ...base, state: 'unverified', confidence: 'low', errorCount: 0, failureRate: 0, matchedFail: 0,
    reason: pathsTracked
      ? `Failure path not yet exercised in current deploy (${execCount}/${VERIFIED_EXEC_MIN} execs)`
      : `Only ${execCount} of ${VERIFIED_EXEC_MIN} executions needed to verify`,
    isDeterministic: false, isRegressed: false };
}

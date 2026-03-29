"use client";
import { use, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Info, Zap, Terminal, MessageSquare, Clock, Bot, ChevronDown } from "lucide-react";
import { useFluxApi } from "@/lib/api";
import { ProjectOverviewResult, Execution, IncidentStatus, IncidentActivityEvent } from "@/types/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTeam, avatarColor } from "@/lib/teamStore";

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ErrorClassBadge({ cls }: { cls: string }) {
  const map: Record<string, { color: string; label: string }> = {
    infra:    { color: "text-violet-400 bg-violet-950/50 border-violet-800/50", label: "Infra" },
    external: { color: "text-blue-400 bg-blue-950/50 border-blue-800/50",      label: "External" },
    runtime:  { color: "text-amber-400 bg-amber-950/50 border-amber-800/50",   label: "Runtime" },
    user:     { color: "text-orange-400 bg-orange-950/50 border-orange-800/50", label: "User" },
  };
  const m = map[cls] ?? { color: "text-neutral-400 bg-neutral-900 border-neutral-800", label: cls };
  return (
    <span className={`shrink-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${m.color}`}>
      {m.label}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-neutral-800/40">
        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

type ActivityEvent = IncidentActivityEvent;

/** Generate an AI reply to a user comment based on incident context */
function generateAiReply(
  comment: string,
  errorClass: string,
  deployMode: string | null,
  deployId: string | null,
  title: string,
  rateBeforePct: number | null,
  rateAfterPct: number | null,
  affectedFns: string[],
): string {
  const q = comment.toLowerCase();
  const fn = affectedFns[0] ?? 'the function';

  if (q.includes('why') || q.includes('cause') || q.includes('what happened') || q.includes('root cause')) {
    if (deployMode === 'introduced')
      return `This error first appeared after deploy ${deployId} with no prior failures. It was introduced by that deployment — check what changed in ${fn}.`;
    if (deployMode === 'regressed') {
      const rates = rateBeforePct !== null && rateAfterPct !== null
        ? ` (failure rate went from ${rateBeforePct}% to ${rateAfterPct}%)`
        : '';
      return `Failure rate worsened noticeably after deploy ${deployId}${rates}. The regression is likely related to that deployment. Check the diff in ${fn}.`;
    }
    if (deployMode === 'unchanged')
      return `This appears to be a pre-existing issue — failure rate was already elevated before deploy ${deployId}. Not caused by this deployment.`;
    if (errorClass === 'external')
      return `This is an external dependency failure in ${fn}. The upstream service is likely unavailable or returning errors. Check network egress and the service\'s status page.`;
    if (errorClass === 'infra')
      return `This looks like an infrastructure issue — the function artifact may not have loaded correctly in ${fn}. A re-deploy usually resolves this.`;
    if (errorClass === 'user')
      return `User-thrown error in ${fn} — this is intentional logic-level rejection. Review input validation and business rules to confirm if it\'s expected.`;
    if (errorClass === 'runtime')
      return `Unhandled exception in ${fn}. Review the error stack trace in the execution trace to find where the throw originates.`;
    return `Error class is "${errorClass}" in ${fn}. Check the execution trace for the full stack and confirm whether recent code or config changes introduced this.`;
  }

  if (q.includes('fix') || q.includes('how') || q.includes('resolve') || q.includes('solve')) {
    if (errorClass === 'external')
      return `To fix: add retry with exponential backoff, verify the upstream endpoint is reachable, and consider a fallback path if the service is non-critical.`;
    if (errorClass === 'infra')
      return `To fix: re-deploy ${fn} to force a clean artifact upload. If it persists, check storage bucket permissions and CI/CD artifact integrity.`;
    if (errorClass === 'user')
      return `If this error is unexpected, review the input validation logic and confirm callers are sending the right payload. Add structured error codes to help distinguish cases.`;
    if (errorClass === 'runtime')
      return `Add try/catch around the failing operation, then null-guard any properties you\'re accessing. View the execution trace for the exact throw site.`;
    return `Open the latest execution trace to find the exact throw site, then apply the suggested actions above. Mark the fix deployed once confirmed.`;
  }

  if (q.includes('deploy') || q.includes('rollback') || q.includes('revert')) {
    if (deployMode === 'introduced' || deployMode === 'regressed')
      return `Rollback to the previous version before deploy ${deployId} should stop the regression. After rollback, verify failure rate drops back to baseline before marking resolved.`;
    return `Deploy ${deployId} was analyzed — failure rate ${deployMode === 'unchanged' ? 'did not change' : 'details above'}. A rollback is ${deployMode === 'improved' ? 'not recommended — this deploy improved things' : 'worth considering if the issue is confirmed'}.`;
  }

  if (q.includes('assign') || q.includes('who') || q.includes('owner')) {
    return `Use the "Assign" field in the Incident Status card to set an owner. Once assigned, the assignment is logged in this timeline.`;
  }

  if (q.includes('slack') || q.includes('notify') || q.includes('alert')) {
    return `Slack integration is not yet connected. Once added, you\'ll be able to push incident alerts and resolution summaries directly to your team channel.`;
  }

  // Generic fallback
  return `I\'m tracking this incident in ${fn}. Error class: ${errorClass}${deployId ? `, related deploy: ${deployId}` : ''}. Check the Suggested Actions above for next steps, or ask a more specific question.`;
}

function formatTs(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' +
    d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function generateSuggestedFix(errorClass: string, title: string): { summary: string; causes: string[]; actions: string[] } | null {
  const t = title.toLowerCase();
  if (errorClass === 'external') {
    if (t.includes('dns') || t.includes('enotfound') || t.includes('fetch failed') || t.includes('getaddrinfo')) {
      return {
        summary: 'This error is caused by DNS resolution failure or an unreachable external service.',
        causes: [
          'External API endpoint is unavailable or returning errors',
          'DNS misconfiguration or DNS propagation delay',
          'Network egress blocked by firewall / routing rules',
        ],
        actions: [
          'Verify the external endpoint is reachable from the runtime environment',
          'Check outbound network rules and DNS resolution',
          'Add retry logic with exponential backoff',
          'Add a circuit breaker to fail fast when the service is degraded',
          'Consider a fallback / graceful degradation path',
        ],
      };
    }
    if (t.includes('timeout') || t.includes('timed out') || t.includes('etimedout')) {
      return {
        summary: 'External API call is timing out — the downstream service is slow or unresponsive.',
        causes: [
          'External service responding slowly under load',
          'Request payload too large',
          'Network latency spikes to the external endpoint',
        ],
        actions: [
          'Set an explicit timeout and catch TimeoutError',
          'Add retry with exponential backoff and jitter',
          'Profile the external call for payload size issues',
          'Consider async / queue-based processing instead of synchronous calls',
        ],
      };
    }
    return {
      summary: 'An external service dependency is failing, causing this error.',
      causes: [
        'External API is down or returning unexpected responses',
        'Authentication credentials may have expired or rotated',
        'Rate limiting enforced by the external service',
      ],
      actions: [
        "Check the external service's status page and recent incidents",
        'Review API credentials, token expiry, and rate limits',
        'Add retry logic with exponential backoff',
        'Add a fallback path for when the dependency is unavailable',
      ],
    };
  }
  if (errorClass === 'infra') {
    if (t.includes('no_artifact') || t.includes('artifact')) {
      return {
        summary: 'The function artifact failed to load — this is a deployment or build pipeline issue.',
        causes: [
          'Artifact was not uploaded or was corrupted during upload',
          'Version mismatch between the expected and uploaded artifact',
          'Storage access permission issue preventing the runtime from reading the artifact',
        ],
        actions: [
          'Re-deploy the function to upload a fresh build artifact',
          'Check the build and upload step in your CI/CD pipeline for failures',
          'Verify storage bucket permissions and artifact integrity checksums',
          'Check if the function is stuck in a deploying state',
        ],
      };
    }
    return {
      summary: 'Infrastructure-level failure is preventing function execution.',
      causes: [
        'Runtime environment misconfiguration after a recent deploy',
        'Memory or CPU resource limit exceeded',
        'Infrastructure outage in the execution environment',
      ],
      actions: [
        'Check resource limits (memory, CPU, timeout) in your function config',
        'Review recent infrastructure and configuration changes',
        'Re-deploy the function to force a fresh environment',
        'Check runtime health metrics and escalate if outage suspected',
      ],
    };
  }
  if (errorClass === 'runtime') {
    if (t.includes('unhandled') || t.includes('exception') || t.includes('typeerror') || t.includes('referenceerror')) {
      return {
        summary: 'An unhandled exception was thrown and not caught by your code.',
        causes: [
          'Missing try/catch around an async operation',
          'Unexpected null or undefined value being accessed',
          'Type mismatch between expected and actual data shapes',
        ],
        actions: [
          'Add try/catch around the failing code section',
          'Add null/undefined guards before accessing properties',
          'Enable strict TypeScript types to catch type mismatches at compile time',
          'Add a global unhandledRejection handler as a last-resort catch',
        ],
      };
    }
    return {
      summary: 'A runtime error occurred during function execution.',
      causes: [
        'Uncaught exception or unhandled promise rejection',
        'Logic error leading to an invalid program state',
        'A dependency throwing an unexpected error',
      ],
      actions: [
        'Review the error stack trace to find the root throw site',
        'Add try/catch around the failing operation',
        'Add input validation at the function entry point',
        'Write a regression test for this failure case',
      ],
    };
  }
  if (errorClass === 'user') {
    return {
      summary: 'A user-thrown error indicates intentional logic-level rejection — check if this is expected.',
      causes: [
        'Validation failure — input did not meet expected constraints',
        'Business rule violation — e.g. insufficient balance, wrong state transition',
        'Missing required input that the function depends on',
      ],
      actions: [
        'Review the business logic triggering this error',
        'Check if this error is expected and handled correctly by callers',
        'Add structured error codes to help callers distinguish failure types',
        'Verify the input validation rules are appropriate for production usage patterns',
      ],
    };
  }
  return null;
}

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string; incidentId: string }>;
}) {
  const { id, incidentId } = use(params);
  const title = decodeURIComponent(incidentId);
  const router = useRouter();
  const api = useFluxApi(id);
  const { session } = useAuth();

  const [overview, setOverview] = useState<ProjectOverviewResult | null>(null);
  const [functionStats, setFunctionStats] = useState<any>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [incidentStatus, setIncidentStatus] = useState<IncidentStatus>('active');
  const [checkedActions, setCheckedActions] = useState<Set<string>>(new Set());
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [ownerId, setOwnerIdState] = useState<string>('');
  const [commentDraft, setCommentDraft] = useState('');
  const { users: teamUsers } = useTeam();
  const viewerName = teamUsers[0]?.name || 'You';
  const viewerId = session?.user?.id || teamUsers[0]?.id || null;
  const userIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of teamUsers) {
      map.set(user.name.trim().toLowerCase(), user.id);
    }
    return map;
  }, [teamUsers]);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const ownerDropdownButtonRef = useRef<HTMLButtonElement>(null);
    const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
    const [autocompleteUsers, setAutocompleteUsers] = useState<string[]>([]);
    const [commandInputRef, setCommandInputRef] = useState<HTMLTextAreaElement | null>(null);

  // Compute incident group early so callbacks can reference it
  const userById = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const user of teamUsers) map.set(user.id, { id: user.id, name: user.name });
    return map;
  }, [teamUsers]);

  const ownerName = ownerId ? (userById.get(ownerId)?.name ?? '') : '';

  const group = useMemo(() => {
    if (!overview?.incidents) return null;
    const incs = overview.incidents.filter(i => i.title === title);
    if (!incs.length) return null;
    const topInc = incs.reduce((t, i) => i.trafficImpactPct > t.trafficImpactPct ? i : t, incs[0]);
    const totalErrors = incs.reduce((s, i) => s + i.totalErrors, 0);
    const totalExecs  = incs.reduce((s, i) => s + i.totalExecs, 0);
    const firstSeen   = incs.reduce((t, i) => i.firstSeen < t ? i.firstSeen : t, incs[0].firstSeen);
    const lastSeen    = incs.reduce((t, i) => i.lastSeen > t ? i.lastSeen : t, incs[0].lastSeen);
    const trafficImpactPct = Math.max(...incs.map(i => i.trafficImpactPct));
    const failureRatePct   = totalExecs > 0 ? Math.round((totalErrors / totalExecs) * 100) : topInc.failureRatePct;
    const affectedFns      = [...new Set(incs.map(i => i.functionName))];
    const errorsAfterDeploy  = incs.reduce((s, i) => s + (i.errorsAfterDeploy  ?? 0), 0);
    const errorsBeforeDeploy = incs.reduce((s, i) => s + (i.errorsBeforeDeploy ?? 0), 0);
    const execsAfterDeploy   = incs.reduce((s, i) => s + (i.execsAfterDeploy   ?? 0), 0);
    const execsBeforeDeploy  = incs.reduce((s, i) => s + (i.execsBeforeDeploy  ?? 0), 0);
    const rateAfter   = execsAfterDeploy  > 0 ? errorsAfterDeploy  / execsAfterDeploy  : null;
    const rateBefore  = execsBeforeDeploy > 0 ? errorsBeforeDeploy / execsBeforeDeploy : null;
    const rateAfterPct  = rateAfter  !== null ? Math.round(rateAfter  * 100) : null;
    const rateBeforePct = rateBefore !== null ? Math.round(rateBefore * 100) : null;
    const postDeploySampleLow = execsAfterDeploy > 0 && execsAfterDeploy < 10;
    const deployMode: 'introduced' | 'regressed' | 'improved' | 'unchanged' | null =
      !topInc.deployId ? null
      : errorsAfterDeploy === 0 && errorsBeforeDeploy === 0 ? null
      : errorsBeforeDeploy === 0 ? 'introduced'
      : rateAfter !== null && rateBefore !== null && rateAfter >= rateBefore * 1.25 ? 'regressed'
      : rateAfter !== null && rateBefore !== null && rateAfter <= rateBefore * 0.5  ? 'improved'
      : 'unchanged';
    const deployDeltaMin = topInc.deployedAt && firstSeen
      ? Math.round((new Date(firstSeen).getTime() - new Date(topInc.deployedAt ?? '').getTime()) / 60000)
      : null;
    const confidenceLabel = totalExecs >= 20 ? "High" : totalExecs >= 5 ? "Medium" : "Low";
    const severity: 'High' | 'Medium' | 'Low' =
      failureRatePct > 50 || trafficImpactPct > 25 ? 'High'
      : failureRatePct > 20 || trafficImpactPct > 10 ? 'Medium'
      : 'Low';
    return {
      cls: topInc.errorClass,
      topFunctionId: topInc.functionId,
      allIncidents: incs,
      totalErrors, totalExecs, firstSeen, lastSeen,
      trafficImpactPct, failureRatePct, affectedFns,
      deployId: topInc.deployId,
      deployedAt: topInc.deployedAt,
      deployDeltaMin,
      errorsAfterDeploy, errorsBeforeDeploy,
      execsAfterDeploy, execsBeforeDeploy,
      rateAfterPct, rateBeforePct,
      postDeploySampleLow, deployMode,
      isRecurring: incs.some(i => i.isRecurring),
      confidenceLabel,
      severity,
    };
  }, [overview, title]);

  // Load persisted incident collaboration state from backend.
  useEffect(() => {
    if (!api.ready) return;
    let cancelled = false;

    api
      .getIncidentState(id, title)
      .then((res) => {
        if (cancelled) return;
        const state = res?.state;
        if (state) {
          setIncidentStatus(state.status);
          const persistedOwnerId = typeof state.ownerId === 'string' ? state.ownerId.trim() : '';
          if (persistedOwnerId) {
            setOwnerIdState(persistedOwnerId);
          } else {
            const legacyOwner = typeof state.owner === 'string' ? state.owner.trim() : '';
            const mapped = legacyOwner ? userIdByName.get(legacyOwner.toLowerCase()) ?? '' : '';
            setOwnerIdState(mapped);
          }
          setCheckedActions(new Set((state.checkedActions ?? []).filter((s) => typeof s === 'string')));
          setActivity(Array.isArray(state.activity) ? state.activity : []);
        }
      })
      .catch(() => {
        // Keep UI usable even if persistence temporarily fails.
      });

    return () => {
      cancelled = true;
    };
  }, [api, id, title]);

  const persistActivity = useCallback((events: ActivityEvent[]) => {
    setActivity(events);
  }, []);

  const appendEventsToServer = useCallback((
    events: ActivityEvent[],
    options?: { sourceCommand?: 'assign' | 'investigate' | 'resolve' | 'reopen' | 'note' },
  ) => {
    for (const rawEvent of events) {
      const shouldAttachActorId = !!viewerId && (
        rawEvent.type === 'comment' ||
        (rawEvent.type === 'system' && !!rawEvent.actor && rawEvent.actor.toLowerCase() !== 'system')
      );
      const event = shouldAttachActorId && !rawEvent.actor_id
        ? { ...rawEvent, actor_id: viewerId }
        : rawEvent;
      api.appendIncidentActivity(id, title, event, { sourceCommand: options?.sourceCommand }).catch(() => {
        // Non-blocking collaboration event persistence.
      });
    }
  }, [api, id, title, viewerId]);

  const updateStatus = useCallback((
    s: IncidentStatus,
    currentActivity: ActivityEvent[],
    options?: { sourceCommand?: 'assign' | 'investigate' | 'resolve' | 'reopen' | 'note' },
  ) => {
    const fromLabel = incidentStatus === 'active' ? 'Active' : incidentStatus === 'investigating' ? 'Investigating' : 'Resolved';
    const toLabel   = s   === 'active' ? 'Active' : s   === 'investigating' ? 'Investigating' : 'Resolved';
    const evs: ActivityEvent[] = [{
      id: `system-status-${Date.now()}`,
      type: 'system',
      text: `Status changed: ${fromLabel} → ${toLabel}`,
      actor: viewerName || 'You',
      actor_id: viewerId ?? undefined,
      ts: new Date().toISOString(),
    }];
    if (s === 'resolved' && group) {
      const { failureRatePct, totalErrors, totalExecs, firstSeen, rateBeforePct } = group;
      const durationMin = Math.round(
        (Date.now() - new Date(firstSeen).getTime()) / 60000
      );
      const summary = [
        `Failure rate: ${failureRatePct}%${totalErrors === 0 ? ' → 0% ✓' : ' (still elevated — monitor)'}`,
        `Total errors: ${totalErrors} over ${totalExecs} executions`,
        `Duration: ${durationMin >= 60 ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m` : `${durationMin}m`}`,
        rateBeforePct !== null ? `Baseline: ${rateBeforePct}%` : null,
      ].filter(Boolean).join(' · ');
      evs.push({
        id: `system-resolve-summary-${Date.now()}`,
        type: 'system',
        text: `Resolution summary — ${summary}`,
        ts: new Date(Date.now() + 100).toISOString(),
      });
    }

    setIncidentStatus(s);
    api.updateIncidentStatus(id, title, s, { sourceCommand: options?.sourceCommand }).catch(() => {
      // Non-blocking status persistence.
    });
    persistActivity([...currentActivity, ...evs]);
    appendEventsToServer(evs);
  }, [appendEventsToServer, api, id, title, persistActivity, group, incidentStatus, viewerName, viewerId]);

    const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setCommentDraft(val);
    
      // Detect / commands
      if (val.startsWith('/') && val.length < 20) {
        setShowCommandSuggestions(true);
      } else {
        setShowCommandSuggestions(false);
      }
    
      // Detect @user mentions
      const atMatch = val.match(/@(\w*)$/);
      if (atMatch) {
        const query = atMatch[1].toLowerCase();
        const matches = teamUsers
          .map(u => u.name.toLowerCase())
          .filter(name => name.includes(query))
          .slice(0, 5);
        setAutocompleteUsers(matches);
      } else {
        setAutocompleteUsers([]);
      }
    }, [teamUsers]);
  const assignOwner = useCallback((
    nextOwnerId: string,
    currentActivity: ActivityEvent[],
    options?: { sourceCommand?: 'assign' | 'investigate' | 'resolve' | 'reopen' | 'note' },
  ) => {
    const normalizedOwnerId = nextOwnerId.trim();
    const previousOwnerId = ownerId.trim() || null;
    const previousOwnerName = previousOwnerId ? (userById.get(previousOwnerId)?.name ?? 'owner') : 'owner';
    const nextOwnerName = normalizedOwnerId ? (userById.get(normalizedOwnerId)?.name ?? normalizedOwnerId) : '';
    const actor = 'You';
    setOwnerIdState(normalizedOwnerId);
    api.updateIncidentOwner(id, title, normalizedOwnerId, { sourceCommand: options?.sourceCommand }).catch(() => {
      // Non-blocking owner persistence.
    });
    if (!normalizedOwnerId) {
      const removedSelf = !!previousOwnerId && !!viewerId && previousOwnerId === viewerId;
      const unassignEv: ActivityEvent = {
        id: `system-unassign-${Date.now()}`,
        type: 'system',
        text: removedSelf
          ? 'removed yourself'
          : previousOwnerId
            ? `removed ${previousOwnerName}`
            : 'removed owner',
        actor,
        ts: new Date().toISOString(),
      };
      persistActivity([...currentActivity, unassignEv]);
      appendEventsToServer([unassignEv]);
      return;
    }
    const ev: ActivityEvent = {
      id: `system-owner-${Date.now()}`,
      type: 'system',
      text: `assigned to ${nextOwnerName}`,
      actor,
      ts: new Date().toISOString(),
    };
    persistActivity([...currentActivity, ev]);
    appendEventsToServer([ev]);
  }, [appendEventsToServer, api, id, title, persistActivity, ownerId, userById, viewerId]);

  const addComment = useCallback((text: string, currentActivity: ActivityEvent[]) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // --- Slash commands ---
    const slashAssign      = trimmed.match(/^\/assign\s+@?(.+)/i);
    const slashResolve     = /^\/resolve\b/i.test(trimmed);
    const slashInvestigate = /^\/invest(igate)?\b/i.test(trimmed);
    const slashReopen      = /^\/reopen\b/i.test(trimmed);
    const slashNote        = trimmed.match(/^\/note\s+(.+)/i);

    if (slashAssign) {
      const assignee = slashAssign[1].trim();
      const assigneeId = userIdByName.get(assignee.toLowerCase()) ?? '';
      if (!assigneeId) {
        const ev: ActivityEvent = {
          id: `assign-not-found-${Date.now()}`,
          type: 'system',
          text: `could not assign: user '${assignee}' not found`,
          actor: 'System',
          ts: new Date().toISOString(),
        };
        persistActivity([...currentActivity, ev]);
        appendEventsToServer([ev]);
        setCommentDraft('');
        return;
      }
      assignOwner(assigneeId, currentActivity, { sourceCommand: 'assign' });
      setCommentDraft('');
      return;
    }
    if (slashResolve) {
      updateStatus('resolved', currentActivity, { sourceCommand: 'resolve' });
      setCommentDraft('');
      return;
    }
    if (slashInvestigate) {
      updateStatus('investigating', currentActivity, { sourceCommand: 'investigate' });
      setCommentDraft('');
      return;
    }
    if (slashReopen) {
      updateStatus('active', currentActivity, { sourceCommand: 'reopen' });
      setCommentDraft('');
      return;
    }
    if (slashNote) {
      const noteText = slashNote[1].trim();
      const ev: ActivityEvent = {
        id: `note-${Date.now()}`,
        type: 'system',
        text: `noted: ${noteText}`,
        actor: viewerName || 'You',
        actor_id: viewerId ?? undefined,
        ts: new Date().toISOString(),
      };
      persistActivity([...currentActivity, ev]);
      appendEventsToServer([ev], { sourceCommand: 'note' });
      setCommentDraft('');
      return;
    }

    // --- Regular comment — AI reply only when it's a question ---
    const commentEv: ActivityEvent = {
      id: `comment-${Date.now()}`,
      type: 'comment',
      text: trimmed,
      actor: viewerName || 'You', // user's actual name or 'You'
      actor_id: viewerId ?? undefined,
      ts: new Date().toISOString(),
    };
    const isQuestion = /\?|^why|^how|^what|^when|^explain|^is |^does /i.test(trimmed);
    if (isQuestion) {
      const aiText = generateAiReply(
        trimmed,
        group?.cls ?? '',
        group?.deployMode ?? null,
        group?.deployId ?? null,
        title,
        group?.rateBeforePct ?? null,
        group?.rateAfterPct ?? null,
        group?.affectedFns ?? [],
      );
      const aiEv: ActivityEvent = {
        id: `ai-${Date.now() + 1}`,
        type: 'ai',
        text: aiText,
        ts: new Date(Date.now() + 500).toISOString(),
      };
      persistActivity([...currentActivity, commentEv, aiEv]);
    } else {
      persistActivity([...currentActivity, commentEv]);
    }
    setCommentDraft('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerName, viewerId, persistActivity, group, title, assignOwner, updateStatus, appendEventsToServer, userIdByName]);

  const toggleAction = useCallback((actionText: string) => {
    setCheckedActions(prev => {
      const next = new Set(prev);
      next.has(actionText) ? next.delete(actionText) : next.add(actionText);
      api.updateIncidentChecklist(id, title, [...next]).catch(() => {
        // Non-blocking checklist persistence.
      });
      return next;
    });
  }, [api, id, title]);

  const pinToTimeline = useCallback((text: string, currentActivity: ActivityEvent[]) => {
    const ev: ActivityEvent = {
      id: `pin-${Date.now()}`,
      type: 'system',
      text: text,
      ts: new Date().toISOString(),
    };
    persistActivity([...currentActivity, ev]);
    appendEventsToServer([ev]);
  }, [appendEventsToServer, persistActivity]);

  useEffect(() => {
    if (!api.ready) return;
    api.getProjectOverview(id).then(async d => {
      if (!d) { setLoading(false); return; }
      setOverview(d);
      const matching = d.incidents.filter(i => i.title === title);
      if (!matching.length) { setNotFound(true); setLoading(false); return; }
      const topFnId = matching.reduce((t, i) => i.trafficImpactPct > t.trafficImpactPct ? i : t, matching[0]).functionId;
      const [stats, execs] = await Promise.all([
        api.getFunctionStats(topFnId).catch(() => null),
        api.getFunctionExecutions(topFnId).catch(() => []),
      ]);
      if (stats) setFunctionStats(stats);
      const failing = ((execs as Execution[]) || [])
        .filter(e => e.status !== 'ok')
        .sort((a, b) => new Date(b.started_at ?? '').getTime() - new Date(a.started_at ?? '').getTime())
        .slice(0, 8);
      setExecutions(failing);
      setLoading(false);
    });
  }, [api.ready, id, title]);

  // Seed activity once first-seen is known (after group is computed)
  // Also seed system intelligence events deduped by id
  useEffect(() => {
    if (!group) return;
    const { firstSeen, deployId, deployMode, rateBeforePct, rateAfterPct, postDeploySampleLow } = group;
    setActivity(prev => {
      const ids = new Set(prev.map(e => e.id));
      const toAdd: ActivityEvent[] = [];

      if (!ids.has('system-started')) {
        toAdd.push({ id: 'system-started', type: 'system', text: 'Incident detected', ts: firstSeen });
      }

      if (deployId && !ids.has('system-deploy-verdict')) {
        const text =
          deployMode === 'introduced' ? `Regression introduced by deploy ${deployId}`
          : deployMode === 'regressed'
            ? `Regression detected after deploy ${deployId}${
                rateBeforePct !== null && rateAfterPct !== null
                  ? ` — failure rate ${rateBeforePct}% → ${rateAfterPct}%`
                  : ''
              }${postDeploySampleLow ? ' (low sample)' : ''}`
          : deployMode === 'improved'  ? `Failure rate improved after deploy ${deployId}`
          : deployMode === 'unchanged' ? `Pre-existing failure — not caused by deploy ${deployId}`
          : `Active around deploy ${deployId}`;
        toAdd.push({ id: 'system-deploy-verdict', type: 'system', text, ts: firstSeen });
      }

      const sugFix = generateSuggestedFix(group.cls, title);
      if (sugFix && !ids.has('system-suggested-fix')) {
        toAdd.push({
          id: 'system-suggested-fix',
          type: 'system',
          text: `Suggested fix generated · ${sugFix.actions.length} recommended actions`,
          ts: firstSeen,
        });
      }

      if (!toAdd.length) return prev;
      appendEventsToServer(toAdd);
      return [...toAdd, ...prev].sort(
        (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
      );
    });
  }, [group, title, appendEventsToServer]);

  if (loading) {
    return (
      <div className="py-6 space-y-4 animate-in fade-in duration-300">
        <div className="h-5 w-24 bg-neutral-900 rounded animate-pulse" />
        <div className="h-32 bg-red-950/20 rounded-xl border border-red-900/30 animate-pulse" />
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3 space-y-3">
            <div className="h-48 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
            <div className="h-40 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
          </div>
          <div className="col-span-2 space-y-3">
            <div className="h-28 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
            <div className="h-28 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !group) {
    return (
      <div className="py-6">
        <button
          onClick={() => router.push(`/project/${id}/incidents`)}
          className="flex items-center gap-1.5 text-[10px] text-neutral-500 hover:text-neutral-300 font-mono transition-colors mb-6"
        >
          <ArrowLeft className="w-3 h-3" />
          All incidents
        </button>
        <div className="flex flex-col items-center justify-center py-24 text-center border border-neutral-800/40 rounded-xl">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-3" />
          <p className="text-sm font-bold text-neutral-300">Incident resolved or not found</p>
          <p className="text-[11px] text-neutral-600 mt-1">{title}</p>
        </div>
      </div>
    );
  }

  const {
    cls, topFunctionId, allIncidents, totalErrors, totalExecs, firstSeen, lastSeen,
    trafficImpactPct, failureRatePct, affectedFns, deployId, deployedAt, deployDeltaMin,
    errorsAfterDeploy, errorsBeforeDeploy, execsAfterDeploy, execsBeforeDeploy,
    rateAfterPct, rateBeforePct, postDeploySampleLow, deployMode, isRecurring, confidenceLabel, severity,
  } = group;

  const suggestedFix = generateSuggestedFix(cls, title);

  const deployVerdict = !deployId ? null : (() => {
    const delta = rateAfterPct !== null && rateBeforePct !== null
      ? `${rateBeforePct}% → ${rateAfterPct}%`
      : null;
    const deltaNum = rateAfterPct !== null && rateBeforePct !== null
      ? rateAfterPct - rateBeforePct
      : null;
    if (deployMode === 'introduced') return {
      headline: `Regression introduced by deploy ${deployId}`,
      sub: 'No failures before this deploy — failures started immediately after',
      delta: null, deltaNum: null, tone: 'danger' as const, confidence: 'High',
    };
    if (deployMode === 'regressed') return {
      headline: postDeploySampleLow
        ? `Possible regression after deploy ${deployId}`
        : `Regression detected after deploy ${deployId}`,
      sub: delta ? `Failure rate: ${delta}${deltaNum !== null ? ` (Δ +${deltaNum}%)` : ''}` : 'Failure rate worsened after deploy',
      delta, deltaNum, tone: 'danger' as const,
      confidence: postDeploySampleLow ? 'Low' : 'Medium',
    };
    if (deployMode === 'improved') return {
      headline: `Failure rate improved after deploy ${deployId}`,
      sub: delta ? `Failure rate: ${delta}` : 'Failure rate decreased after deploy',
      delta, deltaNum, tone: 'good' as const, confidence: 'Medium',
    };
    if (deployMode === 'unchanged') return {
      headline: `Not caused by deploy ${deployId}`,
      sub: 'Failure rate unchanged before and after this deployment',
      delta, deltaNum, tone: 'neutral' as const, confidence: 'Medium',
    };
    return {
      headline: `Active around deploy ${deployId}`,
      sub: 'Temporal correlation detected — deploy may be related',
      delta: null, deltaNum: null, tone: 'neutral' as const, confidence: 'Low',
    };
  })();

  return (
    <div className="py-4 space-y-4 animate-in fade-in duration-300 pb-16">
      {/* Back nav */}
      <button
        onClick={() => router.push(`/project/${id}/incidents`)}
        className="flex items-center gap-1.5 text-[10px] text-neutral-500 hover:text-neutral-300 font-mono transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        All incidents
      </button>

      {/* Header card */}
      <div className="relative rounded-xl border border-red-800/50 bg-gradient-to-b from-red-950/40 to-red-950/10 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-red-500 via-orange-500/60 to-transparent" />
        <div className="px-5 pt-4 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <ErrorClassBadge cls={cls} />
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${
                  incidentStatus === 'resolved'
                    ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40'
                    : incidentStatus === 'investigating'
                    ? 'text-amber-400 bg-amber-950/60 border-amber-800/40'
                    : 'text-red-400 bg-red-950/60 border-red-800/40'
                }`}>
                  {incidentStatus}
                </span>
                {isRecurring && (
                  <span className="text-[8px] font-black text-amber-400 bg-amber-950/50 border border-amber-800/50 px-1.5 py-0.5 rounded uppercase tracking-widest">
                    Recurring
                  </span>
                )}
              </div>
              <h1 className="text-xl font-black text-white font-mono tracking-tight break-all leading-tight">{title}</h1>
              <p className="text-[10px] text-neutral-500 font-mono mt-2">
                started {timeAgo(firstSeen)} · last seen {timeAgo(lastSeen)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-4xl font-black tabular-nums text-red-400 leading-none">{trafficImpactPct}%</div>
              <div className="text-[9px] text-neutral-500 mt-1">of traffic</div>
            </div>
          </div>
          {/* Scope row */}
          <div className="mt-4 flex items-center gap-3 flex-wrap border-t border-red-900/20 pt-3">
            <span className="text-[10px] font-black text-red-400">{failureRatePct}% failure rate</span>
            <span className="text-[10px] text-neutral-700">·</span>
            <span className="text-[10px] text-neutral-400 font-mono">{totalErrors}/{totalExecs} executions</span>
            <span className="text-[10px] text-neutral-700">·</span>
            <span className="text-[10px] text-neutral-400 font-mono">
              {affectedFns.length} function{affectedFns.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Deploy Verdict — strong binary verdict */}
      {deployVerdict && (
        <div className={`rounded-xl border overflow-hidden ${
          deployVerdict.tone === 'danger' ? 'border-orange-700/50 bg-orange-950/20'
          : deployVerdict.tone === 'good'  ? 'border-emerald-700/50 bg-emerald-950/15'
          : 'border-neutral-700/50 bg-neutral-900/30'
        }`}>
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {deployVerdict.tone === 'danger' ? (
                <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
              ) : deployVerdict.tone === 'good' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <Info className="w-5 h-5 text-neutral-400 shrink-0" />
              )}
              <div>
                <p className={`text-base font-black ${
                  deployVerdict.tone === 'danger' ? 'text-orange-200'
                  : deployVerdict.tone === 'good'  ? 'text-emerald-200'
                  : 'text-neutral-200'
                }`}>{deployVerdict.headline}</p>
                <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                  {deployVerdict.sub}
                  {deployedAt && <span className="text-neutral-600 ml-2">· {timeAgo(deployedAt)}</span>}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className={`text-xs font-black px-2 py-1 rounded border ${
                deployVerdict.confidence === 'High'   ? 'text-red-400 bg-red-950/40 border-red-800/40'
                : deployVerdict.confidence === 'Medium' ? 'text-orange-400 bg-orange-950/40 border-orange-800/40'
                : 'text-neutral-500 bg-neutral-900/40 border-neutral-800/40'
              }`}>{deployVerdict.confidence} confidence</span>
            </div>
          </div>
        </div>
      )}

      {/* Next Step CTAs */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mr-1">Next step</span>
        {executions.length > 0 && (
          <button
            onClick={() => router.push(`/project/${id}/executions/${executions[0].id}`)}
            className="flex items-center gap-1.5 text-[10px] font-black text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-500 rounded-lg px-3 py-1.5 transition-all"
          >
            <Terminal className="w-3 h-3" /> Debug latest failure
          </button>
        )}
        <button
          onClick={() => router.push(`/project/${id}/executions`)}
          className="flex items-center gap-1.5 text-[10px] font-black text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-1.5 transition-all"
        >
          <ArrowRight className="w-3 h-3" /> View all executions
        </button>
        {incidentStatus === 'active' && (
          <button
            onClick={() => updateStatus('investigating', activity)}
            className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 hover:text-amber-300 border border-amber-900/50 hover:border-amber-700/60 rounded-lg px-3 py-1.5 transition-all"
          >
            <Zap className="w-3 h-3" /> Mark investigating
          </button>
        )}
        {incidentStatus === 'investigating' && (
          <button
            onClick={() => updateStatus('resolved', activity)}
            className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 hover:text-emerald-300 border border-emerald-900/50 hover:border-emerald-700/60 rounded-lg px-3 py-1.5 transition-all"
          >
            <CheckCircle2 className="w-3 h-3" /> Mark resolved
          </button>
        )}
      </div>

      {/* Resolution Validation banner */}
      {incidentStatus === 'resolved' && (
        <div className={`rounded-xl border overflow-hidden ${
          totalErrors === 0
            ? 'border-emerald-700/50 bg-emerald-950/15'
            : 'border-amber-700/50 bg-amber-950/15'
        }`}>
          <div className="px-5 py-3 flex items-center gap-3">
            {totalErrors === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-black ${
                totalErrors === 0 ? 'text-emerald-200' : 'text-amber-200'
              }`}>
                {totalErrors === 0
                  ? 'No errors recorded — resolution looks valid'
                  : `⚠ Errors still occurring (${totalErrors} total) — verify the fix is deployed`}
              </p>
              <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                {failureRatePct > 0
                  ? `Current failure rate: ${failureRatePct}% (${totalErrors}/${totalExecs} execs)`
                  : `Failure rate: 0% across ${totalExecs} executions`}
                {rateBeforePct !== null && rateAfterPct !== null && (
                  <span className="ml-2 text-neutral-600">
                    · was {rateBeforePct}% before deploy
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => updateStatus('active', activity)}
              className="shrink-0 text-[9px] font-black text-neutral-500 hover:text-neutral-300 border border-neutral-800/60 hover:border-neutral-600 rounded-lg px-2.5 py-1.5 transition-all"
            >
              Reopen
            </button>
          </div>
        </div>
      )}

      {/* Impact Summary — decision-grade metrics */}
      <div className="grid grid-cols-4 gap-2">
        {[
          {
            label: 'Traffic Affected',
            value: `${trafficImpactPct}%`,
            sub: 'of all requests',
            color: trafficImpactPct > 20 ? 'text-red-400' : trafficImpactPct > 5 ? 'text-orange-400' : 'text-amber-400',
          },
          {
            label: 'Failure Rate',
            value: `${failureRatePct}%`,
            sub: `${totalErrors}/${totalExecs} execs`,
            color: failureRatePct > 50 ? 'text-red-400' : failureRatePct > 20 ? 'text-orange-400' : 'text-amber-400',
          },
          {
            label: 'Scope',
            value: `${affectedFns.length} fn${affectedFns.length !== 1 ? 's' : ''}`,
            sub: affectedFns.slice(0, 2).join(', ') + (affectedFns.length > 2 ? ` +${affectedFns.length - 2}` : ''),
            color: 'text-neutral-300',
          },
          {
            label: 'Severity',
            value: severity,
            sub: 'based on rate · scope',
            color: severity === 'High' ? 'text-red-400' : severity === 'Medium' ? 'text-orange-400' : 'text-amber-400',
          },
        ].map(m => (
          <div key={m.label} className="rounded-xl border border-neutral-800/50 bg-neutral-900/40 px-3 py-3">
            <p className={`text-xl font-black tabular-nums leading-none ${m.color}`}>{m.value}</p>
            <p className="text-[9px] text-neutral-500 font-mono mt-1.5">{m.label}</p>
            <p className="text-[8px] text-neutral-700 font-mono truncate mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-5 gap-3 items-start">

        {/* LEFT col */}
        <div className="col-span-3 space-y-3">

          {/* Suggested Fix — top of stack, above the fold */}
          {suggestedFix && (
            <div className="rounded-xl border border-cyan-900/50 bg-cyan-950/10 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-cyan-900/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-cyan-500">Suggested Actions</span>
                </div>
                <div className="flex items-center gap-3">
                  {checkedActions.size > 0 && (
                    <span className="text-[8px] font-black text-cyan-600">
                      {checkedActions.size}/{suggestedFix.actions.length} done
                    </span>
                  )}
                  <button
                    onClick={() => pinToTimeline(`Suggested fix pinned — ${suggestedFix.summary.slice(0, 80)}`, activity)}
                    className="flex items-center gap-1 text-[8px] font-black text-neutral-600 hover:text-cyan-400 transition-colors"
                    title="Pin to timeline"
                  >
                    📌 Pin
                  </button>
                </div>
              </div>
              <div className="px-4 py-3 space-y-3">
                <p className="text-[10px] text-neutral-400 font-mono leading-relaxed">{suggestedFix.summary}</p>
                {/* Checklist actions */}
                <div className="space-y-1">
                  {suggestedFix.actions.map((a) => (
                    <button
                      key={a}
                      onClick={() => toggleAction(a)}
                      className={`w-full flex items-start gap-2.5 text-left px-2.5 py-2 rounded-lg transition-colors ${
                        checkedActions.has(a)
                          ? 'bg-cyan-950/30 hover:bg-cyan-950/50'
                          : 'hover:bg-neutral-900/60'
                      }`}
                    >
                      <span className={`mt-0.5 shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                        checkedActions.has(a)
                          ? 'bg-cyan-600 border-cyan-500'
                          : 'border-neutral-700 bg-transparent'
                      }`}>
                        {checkedActions.has(a) && (
                          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8">
                            <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className={`text-[10px] font-mono leading-relaxed transition-colors ${
                        checkedActions.has(a) ? 'text-neutral-600 line-through' : 'text-neutral-300'
                      }`}>{a}</span>
                    </button>
                  ))}
                </div>
                {/* Causes disclosure */}
                <details className="group">
                  <summary className="text-[8px] font-black uppercase tracking-widest text-neutral-700 cursor-pointer hover:text-neutral-500 select-none transition-colors list-none flex items-center gap-1">
                    <span className="group-open:rotate-90 transition-transform inline-block">›</span> Likely causes
                  </summary>
                  <ul className="mt-1.5 space-y-1 pl-3">
                    {suggestedFix.causes.map((c, i) => (
                      <li key={i} className="text-[9px] text-neutral-500 font-mono flex gap-1.5">
                        <span className="text-neutral-700 shrink-0">–</span>{c}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </div>
          )}

          {/* Deploy Analysis — compressed signal table */}
          {deployId && (
            <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-neutral-800/40 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Deploy Signal</span>
                <button
                  onClick={() => pinToTimeline(`Deploy ${deployId} — ${deployMode === 'introduced' ? 'introduced failures' : deployMode === 'regressed' ? `rate ${rateBeforePct}% → ${rateAfterPct}%` : deployMode === 'improved' ? 'improvement' : 'unchanged'} (pinned)`, activity)}
                  className="flex items-center gap-1 text-[8px] font-black text-neutral-600 hover:text-orange-400 transition-colors"
                  title="Pin to timeline"
                >
                  📌 Pin
                </button>
              </div>
              <div className="px-4 py-3 space-y-3">
                {/* Before / After table */}
                {(execsBeforeDeploy > 0 || execsAfterDeploy > 0) && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label: 'Before deploy',
                        rate: rateBeforePct !== null ? `${rateBeforePct}%` : '—',
                        detail: execsBeforeDeploy > 0 ? `${errorsBeforeDeploy}/${execsBeforeDeploy} execs` : 'no data',
                        color: rateBeforePct !== null && rateBeforePct > 0 ? 'text-orange-400' : 'text-neutral-400',
                      },
                      {
                        label: 'After deploy',
                        rate: rateAfterPct !== null ? `${rateAfterPct}%` : '—',
                        detail: execsAfterDeploy > 0 ? `${errorsAfterDeploy}/${execsAfterDeploy} execs` : 'no data',
                        color: rateAfterPct !== null && rateAfterPct > 0 ? 'text-red-400' : 'text-emerald-400',
                      },
                      {
                        label: 'Delta',
                        rate: rateAfterPct !== null && rateBeforePct !== null
                          ? `${rateAfterPct - rateBeforePct > 0 ? '+' : ''}${rateAfterPct - rateBeforePct}%`
                          : deployMode === 'introduced' ? '+100%' : '—',
                        detail: deployMode === 'introduced' ? 'new failure'
                          : deployMode === 'regressed'  ? 'regression'
                          : deployMode === 'improved'   ? 'improvement'
                          : deployMode === 'unchanged'  ? 'no change'
                          : 'unknown',
                        color: deployMode === 'regressed' || deployMode === 'introduced' ? 'text-red-400'
                          : deployMode === 'improved' ? 'text-emerald-400'
                          : 'text-neutral-400',
                      },
                    ].map(col => (
                      <div key={col.label} className="bg-neutral-900/40 rounded-lg px-3 py-2">
                        <p className={`text-base font-black tabular-nums leading-none ${col.color}`}>{col.rate}</p>
                        <p className="text-[8px] text-neutral-600 font-mono mt-1">{col.label}</p>
                        <p className="text-[8px] text-neutral-700 font-mono mt-0.5 truncate">{col.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
                {/* Single verdict line */}
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-neutral-700">›</span>
                  <span className={`text-[10px] font-black ${
                    deployMode === 'introduced' || deployMode === 'regressed' ? 'text-orange-300'
                    : deployMode === 'improved' ? 'text-emerald-300'
                    : 'text-neutral-400'
                  }`}>
                    {deployMode === 'introduced' ? 'Failures introduced by this deploy'
                    : deployMode === 'regressed'  ? postDeploySampleLow ? 'Worsened after deploy (low sample)' : 'Worsened by this deploy'
                    : deployMode === 'improved'   ? 'Improved by this deploy'
                    : deployMode === 'unchanged'  ? 'Pre-existing failure — deploy not the cause'
                    : 'Active around this deploy'}
                  </span>
                  {deployDeltaMin !== null && deployDeltaMin > 0 && (
                    <span className="text-[9px] text-neutral-600 ml-auto shrink-0">+{deployDeltaMin}m after deploy</span>
                  )}
                </div>
                {postDeploySampleLow && (
                  <p className="text-[9px] text-neutral-600 font-mono">
                    ⚠ only {execsAfterDeploy} executions after deploy — confidence limited
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Recent failing executions */}
          <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-800/40 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Recent Failures</span>
              <button
                onClick={() => router.push(`/project/${id}/executions`)}
                className="text-[9px] text-neutral-600 hover:text-neutral-400 font-mono flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
            {executions.length === 0 ? (
              <p className="px-4 py-4 text-[10px] text-neutral-600 font-mono">No recent failures found</p>
            ) : (
              <div className="divide-y divide-neutral-800/30">
                {executions.map(exec => (
                  <div
                    key={exec.id}
                    onClick={() => router.push(`/project/${id}/executions/${exec.id}`)}
                    className="group px-4 py-2.5 cursor-pointer hover:bg-neutral-900/40 transition-colors flex items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-mono text-neutral-300 truncate">
                        {exec.error_message ?? exec.error ?? 'Execution failed'}
                      </p>
                      <p className="text-[9px] text-neutral-600 font-mono mt-0.5">
                        {exec.started_at ? timeAgo(exec.started_at) : '—'}
                        {exec.duration_ms != null && (
                          <span className="ml-2">{exec.duration_ms}ms</span>
                        )}
                      </p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-neutral-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Debug entry point */}
          {executions.length > 0 && (
            <div className="rounded-xl border border-neutral-800/50 bg-neutral-900/20 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Terminal className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-neutral-300">Reproduce this failure</p>
                    <p className="text-[9px] text-neutral-600 font-mono mt-0.5">
                      {executions[0].started_at ? `last failed ${timeAgo(executions[0].started_at)}` : 'view execution trace'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    pinToTimeline(`started reproduction — tracing execution ${executions[0].id.slice(0, 8)}`, activity);
                    router.push(`/project/${id}/executions/${executions[0].id}`);
                  }}
                  className="flex items-center gap-1.5 text-[9px] font-black text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-1.5 transition-all shrink-0"
                >
                  View trace <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Root cause from function stats */}
          {functionStats?.root_cause && (
            <SectionCard title="Root Cause">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-neutral-200">{functionStats.root_cause.issue}</p>
                {functionStats.root_cause.cause && (
                  <p className="text-[10px] text-neutral-500 font-mono">{functionStats.root_cause.cause}</p>
                )}
                {functionStats.root_cause.suggestion && (
                  <p className="text-[10px] text-neutral-400 font-mono mt-2 pt-2 border-t border-neutral-800/40">
                    → {functionStats.root_cause.suggestion}
                  </p>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        {/* RIGHT col: status, confidence, affected functions */}
        <div className="col-span-2 space-y-3">

          {/* Ownership + Status */}
          <SectionCard title="Incident Status">
            <div className="space-y-3">
              {/* Status machine */}
              <div className="flex gap-1">
                {(['active', 'investigating', 'resolved'] as IncidentStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s, activity)}
                    className={`flex-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-1.5 rounded border transition-all ${
                      incidentStatus === s
                        ? s === 'active'       ? 'bg-red-950/60 border-red-800/60 text-red-400'
                          : s === 'investigating' ? 'bg-amber-950/60 border-amber-800/60 text-amber-400'
                          : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                        : 'bg-transparent border-neutral-800/40 text-neutral-600 hover:text-neutral-400 hover:border-neutral-700/60'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* Ownership */}
              <div className="space-y-2 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] text-neutral-600 font-mono shrink-0">Owner</span>
                  <div className="relative overflow-visible">
                    <button
                      ref={ownerDropdownButtonRef}
                      onClick={() => setOwnerDropdownOpen(o => !o)}
                      className="flex items-center gap-1.5 group"
                    >
                      {ownerName ? (
                        <>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[7px] font-black ${avatarColor(ownerName)}`}>
                            {ownerName[0]?.toUpperCase()}
                          </div>
                          <span className="text-[9px] font-bold text-neutral-300 font-mono">{ownerName}</span>
                          <ChevronDown className="w-2.5 h-2.5 text-neutral-600" />
                        </>
                      ) : (
                        <span className="text-[9px] text-neutral-600 font-mono group-hover:text-neutral-400 transition-colors">Unassigned · assign →</span>
                      )}
                    </button>
                    {ownerDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOwnerDropdownOpen(false)} />
                        <div 
                          className="fixed z-20 w-48 rounded-xl border border-neutral-800 bg-neutral-950 shadow-xl overflow-hidden"
                          style={ownerDropdownButtonRef.current ? {
                            top: `${ownerDropdownButtonRef.current.getBoundingClientRect().bottom + 4}px`,
                            right: `${window.innerWidth - ownerDropdownButtonRef.current.getBoundingClientRect().right}px`,
                          } : {}}
                        >
                          {teamUsers.map(u => (
                            <button
                              key={u.id}
                              onClick={() => { assignOwner(u.id, activity); setOwnerDropdownOpen(false); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-neutral-900 transition-colors ${ownerId === u.id ? 'bg-neutral-900/60' : ''}`}
                            >
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[8px] font-black ${avatarColor(u.name)}`}>
                                {u.name[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-neutral-200 truncate">{u.name}</p>
                                <p className="text-[8px] text-neutral-600 font-mono truncate">{u.role}</p>
                              </div>
                              {ownerId === u.id && <span className="text-[8px] text-blue-400 font-black">✓</span>}
                            </button>
                          ))}
                          {ownerId && (
                            <button
                              onClick={() => { assignOwner('', activity); setOwnerDropdownOpen(false); }}
                              className="w-full text-left px-3 py-2 text-[9px] text-neutral-600 hover:text-red-400 font-mono border-t border-neutral-800/60 transition-colors"
                            >
                              Remove owner
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-neutral-600 font-mono">Service</span>
                  <span className="text-[9px] text-neutral-400 font-mono truncate max-w-[120px]">
                    {affectedFns[0] ?? '—'}
                  </span>
                </div>
                {deployId && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-neutral-600 font-mono">Triggered after</span>
                    <span className="text-[9px] text-neutral-400 font-mono">deploy {deployId}</span>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Confidence */}
          <SectionCard title="Confidence">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-neutral-500 font-mono">Signal</span>
                <span className={`text-[9px] font-black ${
                  confidenceLabel === 'High' ? 'text-emerald-500'
                  : confidenceLabel === 'Medium' ? 'text-amber-400'
                  : 'text-neutral-500'
                }`}>{confidenceLabel}</span>
              </div>
              {deployId && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-neutral-500 font-mono">Impact</span>
                    <span className={`text-[9px] font-black ${
                      postDeploySampleLow ? 'text-neutral-500'
                      : deployMode === 'introduced' ? 'text-emerald-500'
                      : 'text-amber-400'
                    }`}>
                      {postDeploySampleLow ? 'Low' : deployMode === 'introduced' ? 'High' : 'Medium'}
                    </span>
                  </div>
                  {postDeploySampleLow && (
                    <p className="text-[9px] text-neutral-600 font-mono pt-0.5">
                      limited post-deploy data ({execsAfterDeploy} executions)
                    </p>
                  )}
                </>
              )}
              {isRecurring && (
                <p className="text-[9px] text-amber-400/80 font-mono mt-1 pt-2 border-t border-neutral-800/40">
                  ⚠ also seen in previous deployment
                </p>
              )}
            </div>
          </SectionCard>

          {/* Affected functions */}
          <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-800/40">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                Affected Functions ({allIncidents.length})
              </span>
            </div>
            <div className="divide-y divide-neutral-800/30">
              {allIncidents.map(inc => (
                <div
                  key={inc.functionId}
                  onClick={() => router.push(`/project/${id}/functions/${inc.functionId}`)}
                  className="group px-4 py-2.5 cursor-pointer hover:bg-neutral-900/40 transition-colors flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-neutral-300 font-mono font-bold truncate">{inc.functionName}</p>
                    <p className="text-[9px] text-neutral-600 font-mono mt-0.5">
                      {inc.totalErrors}/{inc.totalExecs} execs · {inc.failureRatePct}% failure
                    </p>
                  </div>
                  <ArrowRight className="w-3 h-3 text-neutral-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>

          {/* Top issues from function stats */}
          {functionStats?.top_issues?.length > 0 && (
            <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-neutral-800/40">
                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Error Clusters</span>
              </div>
              <div className="divide-y divide-neutral-800/30">
                {functionStats.top_issues.slice(0, 4).map((issue: any) => (
                  <div key={issue.id} className="px-4 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[9px] text-neutral-400 font-mono truncate flex-1">
                        {issue.title.length > 60 ? issue.title.slice(0, 60) + '…' : issue.title}
                      </p>
                      <span className="text-[9px] font-black text-neutral-500 shrink-0">{issue.count}×</span>
                    </div>
                    <p className="text-[8px] text-neutral-700 font-mono mt-0.5">
                      first seen {timeAgo(issue.first_seen)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity & Comments — full width collaboration layer */}
      <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-neutral-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3 h-3 text-neutral-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Activity</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-2.5">
              <span className="flex items-center gap-1 text-[8px] text-neutral-700 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/60 inline-block" />System
              </span>
              <span className="flex items-center gap-1 text-[8px] text-neutral-700 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 inline-block" />Human
              </span>
              <span className="flex items-center gap-1 text-[8px] text-neutral-700 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/60 inline-block" />AI
              </span>
            </div>
            <span className="text-[8px] text-neutral-700 font-mono">{activity.length} event{activity.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="px-4 pt-4 pb-2 space-y-0">
          {activity.length === 0 && (
            <div className="py-6 flex flex-col items-center gap-3 text-center">
              <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-neutral-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-neutral-500">No activity yet</p>
                <p className="text-[9px] text-neutral-700 font-mono mt-1 leading-relaxed">
                  Start by assigning an owner or adding a note.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <button
                  onClick={() => setOwnerDropdownOpen(true)}
                  className="text-[9px] font-black text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-lg px-2.5 py-1 transition-all"
                >
                  Assign owner
                </button>
              </div>
            </div>
          )}
          {[...activity].reverse().map((event, idx, arr) => {
            // is this a human-attributed system event?
            const isHumanAction = event.type === 'system' && !!event.actor;
            const isSystemAuto  = event.type === 'system' && !event.actor;
            const isComment     = event.type === 'comment';
            const isAi          = event.type === 'ai';
            const actorLabel = event.actor === 'You' ? viewerName : (event.actor ?? '?');
            const actorInitial  = actorLabel[0]?.toUpperCase() ?? '?';

            return (
              <div key={event.id} className="flex gap-3 relative">
                {/* connector line */}
                {idx < arr.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-0 w-px bg-neutral-800/50" />
                )}
                {/* avatar / dot */}
                {(isHumanAction || isComment) ? (
                  <div className={`mt-0.5 shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center z-10 text-[8px] font-black ${
                    event.actor ? avatarColor(actorLabel) : 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300'
                  }`}>
                    {actorInitial}
                  </div>
                ) : isAi ? (
                  <div className="mt-0.5 shrink-0 w-[22px] h-[22px] rounded-full bg-cyan-950/60 border border-cyan-900/50 flex items-center justify-center z-10">
                    <Bot className="w-2.5 h-2.5 text-cyan-400" />
                  </div>
                ) : (
                  <div className="mt-0.5 shrink-0 w-[22px] h-[22px] rounded-full bg-blue-950/30 border border-blue-900/40 flex items-center justify-center z-10">
                    <Clock className="w-2.5 h-2.5 text-blue-500/70" />
                  </div>
                )}

                {/* content */}
                <div className={`flex-1 pb-4 min-w-0 ${isAi ? 'bg-cyan-950/10 border border-cyan-900/20 rounded-lg px-3 py-2 -ml-1 mb-3' : isSystemAuto ? 'bg-neutral-900/20 border border-neutral-800/20 rounded-lg px-3 py-2 -ml-1 mb-2' : ''}`}>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    {/* actor name */}
                    {(isHumanAction || isComment) && event.actor && (
                      <span className={`text-[10px] font-black ${isComment ? 'text-emerald-300' : 'text-white'}`}>
                        {actorLabel}
                      </span>
                    )}
                    {isSystemAuto && (
                      <span className="text-[10px] font-black text-neutral-500">System</span>
                    )}
                    {isAi && (
                      <span className="text-[10px] font-black text-cyan-400">Flux AI</span>
                    )}
                    {/* action separator for system events */}
                    {(isSystemAuto || isHumanAction) && (
                      <span className={`text-[9px] ${isSystemAuto ? 'text-neutral-700' : 'text-neutral-600'}`}>—</span>
                    )}
                    {/* event text */}
                    <span className={`text-[10px] font-mono leading-relaxed ${
                      isSystemAuto  ? 'text-neutral-500'
                      : isHumanAction ? 'text-neutral-300'
                      : isComment ? 'text-neutral-200'
                      : isAi          ? 'text-neutral-300'
                      : 'text-neutral-300'
                    }`}>{event.text}</span>
                    {/* timestamp */}
                    <span className={`text-[9px] font-mono shrink-0 ml-auto ${isSystemAuto ? 'text-neutral-700' : 'text-neutral-700'}`}>{formatTs(event.ts)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comment input + quick actions */}
        <div className="px-4 pb-4 pt-2 border-t border-neutral-800/40 space-y-2">
          {/* Quick action buttons — always visible */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[8px] font-black uppercase tracking-widest text-neutral-700 mr-1">Actions</span>
            {incidentStatus !== 'investigating' && (
              <button
                onClick={() => updateStatus('investigating', activity)}
                className="text-[9px] font-black text-amber-400 hover:text-amber-300 border border-amber-900/50 hover:border-amber-700 rounded-md px-2.5 py-1 transition-all"
              >
                Mark investigating
              </button>
            )}
            {incidentStatus === 'investigating' && (
              <button
                onClick={() => updateStatus('resolved', activity)}
                className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 border border-emerald-900/50 hover:border-emerald-700 rounded-md px-2.5 py-1 transition-all"
              >
                Mark resolved
              </button>
            )}
            {incidentStatus === 'resolved' && (
              <button
                onClick={() => updateStatus('active', activity)}
                className="text-[9px] font-black text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-md px-2.5 py-1 transition-all"
              >
                Reopen
              </button>
            )}
            {!ownerId && (
              <button
                onClick={() => setOwnerDropdownOpen(true)}
                className="text-[9px] font-black text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-md px-2.5 py-1 transition-all"
              >
                Assign owner
              </button>
            )}
          </div>
          {/* Comment box */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <textarea
                value={commentDraft}
                  onChange={handleCommentChange}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addComment(commentDraft, activity);
                  }
                }}
                placeholder={`${ownerName ? `Comment as ${ownerName}` : 'Add note'}… or try /assign @user, /investigate, /resolve`}
                rows={1}
                className="w-full text-[10px] font-mono bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 focus:border-neutral-600 rounded-lg px-3 py-2 text-neutral-300 placeholder-neutral-700 outline-none transition-colors resize-none"
              />
                {/* Command suggestions on / */}
                {showCommandSuggestions && (
                  <div className="mt-1 rounded-lg border border-cyan-900/40 bg-cyan-950/20 overflow-hidden text-[9px]">
                    {[
                      { cmd: '/assign @user', desc: 'Assign incident to user' },
                      { cmd: '/investigate', desc: 'Mark as investigating' },
                      { cmd: '/resolve', desc: 'Mark as resolved' },
                      { cmd: '/reopen', desc: 'Reopen the incident' },
                      { cmd: '/note ...', desc: 'Add a system note' },
                    ].map((c, i) => (
                      <div key={i} className="px-3 py-2 hover:bg-cyan-900/20 transition-colors cursor-pointer border-b border-cyan-900/20 last:border-0 flex items-center justify-between">
                        <span className="font-mono text-cyan-400">{c.cmd}</span>
                        <span className="text-cyan-700">{c.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* User mention suggestions on @ */}
                {autocompleteUsers.length > 0 && (
                  <div className="mt-1 rounded-lg border border-emerald-900/40 bg-emerald-950/20 overflow-hidden text-[9px]">
                    {autocompleteUsers.map((userName, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const beforeAt = commentDraft.lastIndexOf('@');
                          const newDraft = commentDraft.slice(0, beforeAt) + '@' + userName + ' ';
                          setCommentDraft(newDraft);
                          setAutocompleteUsers([]);
                        }}
                        className="w-full px-3 py-2 hover:bg-emerald-900/20 transition-colors text-left border-b border-emerald-900/20 last:border-0 flex items-center gap-2"
                      >
                        <div className={`w-4 h-4 rounded-full text-[7px] font-black flex items-center justify-center ${avatarColor(userName)}`}>
                          {userName[0]?.toUpperCase()}
                        </div>
                        <span className="text-emerald-300">{userName}</span>
                      </button>
                    ))}
                  </div>
                )}
            </div>
            <button
              onClick={() => addComment(commentDraft, activity)}
              disabled={!commentDraft.trim()}
              className="shrink-0 text-[9px] font-black text-neutral-400 hover:text-white disabled:text-neutral-700 disabled:cursor-not-allowed border border-neutral-800 hover:border-neutral-600 disabled:border-neutral-800/40 rounded-lg px-3 py-2 transition-all"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

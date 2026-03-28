"use client";
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { Checkpoint, ExecutionConsoleLog } from "@/types/api";
import type { Execution } from "@/types/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimelineEvent {
  key: string;
  kind: "request" | "log" | "http" | "postgres" | "redis" | "tcp" | "timer" | "performance.now" | "other" | "response" | "error";
  index: number; // call_index for checkpoints, seq for logs, synthetic for request/response
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  durationMs?: number;
  isError?: boolean;
  detail?: React.ReactNode;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJson(v: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!v) return {};
  return v as Record<string, unknown>;
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function statusColor(status: number) {
  if (status >= 500) return "text-red-400";
  if (status >= 400) return "text-orange-400";
  if (status >= 300) return "text-yellow-400";
  return "text-green-400";
}

function methodColor(method: string) {
  switch (method?.toUpperCase()) {
    case "GET": return "text-green-400";
    case "POST": return "text-blue-400";
    case "PUT": case "PATCH": return "text-yellow-400";
    case "DELETE": return "text-red-400";
    default: return "text-neutral-400";
  }
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="text-[10px] font-mono text-neutral-400 bg-black/60 rounded p-3 overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-neutral-800 leading-relaxed">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ── Checkpoint → TimelineEvent ────────────────────────────────────────────────

function checkpointToEvent(cp: Checkpoint): TimelineEvent {
  const req = parseJson(cp.request);
  // response can be a raw number for performance.now checkpoints
  const rawRes: unknown = cp.response;
  const res = parseJson(cp.response);
  const dur = cp.duration_ms ?? 0;

  switch (cp.boundary) {
    case "http": {
      const url = (req.url as string) || (req.resolved_url as string) || "";
      const method = (req.method as string) || "GET";
      const status = (res.status as number) || 0;
      const shortUrl = (() => {
        try { return new URL(url).pathname || url; } catch { return url; }
      })();
      const cached = !!(res.cache as Record<string,unknown>)?.hit;
      return {
        key: `cp-${cp.call_index}`,
        kind: "http",
        index: cp.call_index,
        label: `${method.toUpperCase()} ${truncate(shortUrl, 60)}`,
        badge: status ? String(status) : undefined,
        badgeColor: status ? statusColor(status) : undefined,
        sublabel: cached ? "cache hit" : undefined,
        durationMs: dur,
        detail: (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Request</div>
              <JsonBlock data={req} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Response</div>
              <JsonBlock data={res} />
            </div>
          </div>
        ),
      };
    }

    case "postgres": {
      const sql = (req.sql as string) || "";
      const rowCount = (res.row_count as number) ?? 0;
      const host = (req.host as string) || "";
      const port = (req.port as number) || 5432;
      const tls = !!(req.tls as boolean);
      const sqlPreview = truncate(sql.replace(/\s+/g, " ").trim(), 80);
      return {
        key: `cp-${cp.call_index}`,
        kind: "postgres",
        index: cp.call_index,
        label: sqlPreview || "SQL query",
        sublabel: `${host}:${port}${tls ? " TLS" : ""}`,
        badge: `${rowCount} row${rowCount !== 1 ? "s" : ""}`,
        badgeColor: "text-purple-400",
        durationMs: dur,
        detail: (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Query</div>
              <pre className="text-[10px] font-mono text-neutral-300 bg-black/60 rounded p-3 overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-neutral-800 leading-relaxed whitespace-pre-wrap">{sql}</pre>
            </div>
            <div>
              <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Result ({rowCount} rows)</div>
              <JsonBlock data={res} />
            </div>
          </div>
        ),
      };
    }

    case "redis": {
      const command = (req.command as string) || "CMD";
      const args = (req.args as string[]) || [];
      const argsPreview = args.slice(0, 2).join(" ");
      return {
        key: `cp-${cp.call_index}`,
        kind: "redis",
        index: cp.call_index,
        label: `${command}${argsPreview ? ` ${truncate(argsPreview, 50)}` : ""}`,
        durationMs: dur,
        detail: (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Command</div>
              <JsonBlock data={req} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Result</div>
              <JsonBlock data={res} />
            </div>
          </div>
        ),
      };
    }

    case "tcp": {
      const host = (req.host as string) || "unknown";
      const port = (req.port as number) || 0;
      const tls = !!(req.tls as boolean);
      const bytesRead = (res.bytes_read as number) || 0;
      return {
        key: `cp-${cp.call_index}`,
        kind: "tcp",
        index: cp.call_index,
        label: `${host}:${port}${tls ? " TLS" : ""}`,
        badge: bytesRead ? `${bytesRead}B` : undefined,
        badgeColor: "text-cyan-400",
        durationMs: dur,
        detail: (
          <div className="space-y-3">
            <div><div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Request</div><JsonBlock data={req} /></div>
            <div><div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Response</div><JsonBlock data={res} /></div>
          </div>
        ),
      };
    }

    case "timer": {
      const requested = (req.requested_delay_ms as number) || 0;
      const effective = (res.effective_delay_ms as number) || requested;
      return {
        key: `cp-${cp.call_index}`,
        kind: "timer",
        index: cp.call_index,
        label: `setTimeout(${requested}ms)`,
        badge: effective !== requested ? `effective ${effective}ms` : undefined,
        badgeColor: "text-neutral-400",
        durationMs: effective,
      };
    }

    case "performance.now": {
      const elapsed = typeof rawRes === "number" ? rawRes : null;
      return {
        key: `cp-${cp.call_index}`,
        kind: "performance.now",
        index: cp.call_index,
        label: `performance.now()`,
        badge: elapsed !== null ? `${(elapsed as number).toFixed(2)}ms` : undefined,
        badgeColor: "text-neutral-500",
      };
    }

    default: {
      const url = (req.url as string) || "";
      const status = (res.status as number) || 0;
      return {
        key: `cp-${cp.call_index}`,
        kind: "other",
        index: cp.call_index,
        label: url ? truncate(url, 70) : cp.boundary,
        badge: status ? String(status) : undefined,
        badgeColor: status ? statusColor(status) : undefined,
        durationMs: dur,
        detail: (
          <div className="space-y-3">
            <div><div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Request</div><JsonBlock data={req} /></div>
            <div><div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Response</div><JsonBlock data={res} /></div>
          </div>
        ),
      };
    }
  }
}

// ── Kind metadata ─────────────────────────────────────────────────────────────

const KIND_META: Record<TimelineEvent["kind"], { icon: string; color: string; bg: string; label: string }> = {
  request:         { icon: "→",  color: "text-neutral-400", bg: "bg-neutral-800",  label: "REQ" },
  log:             { icon: "›",  color: "text-neutral-500", bg: "bg-neutral-900",  label: "LOG" },
  http:            { icon: "🌐", color: "text-orange-400",  bg: "bg-orange-950/40", label: "HTTP" },
  postgres:        { icon: "🗄", color: "text-purple-400",  bg: "bg-purple-950/40", label: "DB" },
  redis:           { icon: "⚡", color: "text-red-400",     bg: "bg-red-950/40",   label: "KV" },
  tcp:             { icon: "⟷",  color: "text-cyan-400",    bg: "bg-cyan-950/40",  label: "TCP" },
  timer:           { icon: "⏱",  color: "text-neutral-400", bg: "bg-neutral-900",  label: "TIMER" },
  "performance.now": { icon: "⏱", color: "text-neutral-600", bg: "bg-neutral-900", label: "PERF" },
  other:           { icon: "·",  color: "text-neutral-500", bg: "bg-neutral-900",  label: "IO" },
  response:        { icon: "←",  color: "text-neutral-400", bg: "bg-neutral-800",  label: "RES" },
  error:           { icon: "✗",  color: "text-red-400",     bg: "bg-red-950/40",   label: "ERR" },
};

// ── EventRow ──────────────────────────────────────────────────────────────────

function EventRow({ event, seq }: { event: TimelineEvent; seq: number }) {
  const [open, setOpen] = useState(false);
  const meta = KIND_META[event.kind];
  const hasDetail = !!event.detail;

  return (
    <div className="group">
      <div
        className={`flex items-start gap-3 px-4 py-2.5 rounded-lg transition-colors ${
          hasDetail ? "cursor-pointer hover:bg-neutral-900/60" : ""
        } ${event.isError ? "bg-red-950/20 hover:bg-red-950/30" : ""}`}
        onClick={() => hasDetail && setOpen((o) => !o)}
      >
        {/* seq number */}
        <span className="shrink-0 w-5 text-right text-[10px] font-mono text-neutral-700 mt-0.5 select-none">
          {seq}
        </span>

        {/* kind badge */}
        <span className={`shrink-0 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} uppercase tracking-widest mt-0.5`}>
          {meta.label}
        </span>

        {/* icon + label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-[11px] font-mono ${event.isError ? "text-red-300" : "text-neutral-200"} break-all`}>
              {event.label}
            </span>
            {event.badge && (
              <span className={`text-[10px] font-mono ${event.badgeColor || "text-neutral-500"} shrink-0`}>
                {event.badge}
              </span>
            )}
            {event.sublabel && (
              <span className="text-[10px] font-mono text-neutral-600 shrink-0">{event.sublabel}</span>
            )}
          </div>
        </div>

        {/* duration + expand */}
        <div className="shrink-0 flex items-center gap-2 ml-auto">
          {event.durationMs != null && event.durationMs > 0 && (
            <span className="text-[10px] font-mono text-neutral-600">{event.durationMs}ms</span>
          )}
          {hasDetail && (
            <span className="text-neutral-700 group-hover:text-neutral-500 transition-colors">
              {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>
          )}
        </div>
      </div>

      {/* expanded detail */}
      {open && event.detail && (
        <div className="mx-4 mb-2 mt-0.5 pl-12">
          {event.detail}
        </div>
      )}
    </div>
  );
}

// ── ExecutionTimeline (public) ────────────────────────────────────────────────

interface ExecutionTimelineProps {
  execution: Execution;
  checkpoints?: Checkpoint[];
  logs?: ExecutionConsoleLog[];
}

export function ExecutionTimeline({ execution, checkpoints = [], logs = [] }: ExecutionTimelineProps) {
  const events: TimelineEvent[] = [];

  // [0] Request received
  events.push({
    key: "request",
    kind: "request",
    index: -2,
    label: `${execution.request_method || execution.method} ${execution.path}`,
    badge: execution.client_ip || undefined,
    badgeColor: "text-neutral-600",
    detail: execution.request_headers || execution.request_body ? (
      <div className="space-y-3">
        {execution.request_headers && (
          <div>
            <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Headers</div>
            <JsonBlock data={execution.request_headers} />
          </div>
        )}
        {execution.request_body && (
          <div>
            <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Body</div>
            <pre className="text-[10px] font-mono text-neutral-400 bg-black/60 rounded p-3 overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-neutral-800 whitespace-pre-wrap">{execution.request_body}</pre>
          </div>
        )}
      </div>
    ) : undefined,
  });

  // Logs (by seq) and checkpoints (by call_index) are already in order.
  // Merge them: logs interleave by seq position, checkpoints by call_index.
  // Since we don't have a unified global timestamp, output logs first
  // then checkpoints — they represent the actual execution sequence.
  // console logs are recorded before/during IO boundaries, so emit them
  // in seq order, interleaved with checkpoints by approximating position.

  // Build log events — seq IS the call_index (same shared counter as IO ops)
  const logEvents: TimelineEvent[] = logs.map((log) => ({
    key: `log-${log.seq}`,
    kind: "log" as const,
    index: log.seq,
    label: log.message,
    badge: log.level !== "log" && log.level !== "info" ? log.level.toUpperCase() : undefined,
    badgeColor: log.level === "error" ? "text-red-400" : log.level === "warn" ? "text-yellow-400" : undefined,
    isError: log.level === "error",
  }));

  // Build checkpoint events
  const cpEvents: TimelineEvent[] = checkpoints
    .filter((cp) => cp.boundary !== "performance.now") // hide perf.now noise by default
    .map(checkpointToEvent);

  // Exact merge: logs and IO checkpoints share the same call_index counter,
  // so sorting by index gives the precise order events occurred in execution.
  const merged = [...logEvents, ...cpEvents].sort((a, b) => a.index - b.index);
  events.push(...merged);

  // Response / error at the end
  if (execution.status === "error") {
    const errMsg = execution.error_message || execution.error || "Unhandled exception";
    const errName = execution.error_name;
    events.push({
      key: "error",
      kind: "error",
      index: 99999,
      label: errName ? `${errName}: ${errMsg}` : errMsg,
      isError: true,
      detail: execution.error_stack ? (
        <pre className="text-[10px] font-mono text-red-400/80 bg-black/60 rounded p-3 overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-neutral-800 leading-snug whitespace-pre-wrap">{execution.error_stack}</pre>
      ) : undefined,
    });
  } else if (execution.response_status) {
    events.push({
      key: "response",
      kind: "response",
      index: 99999,
      label: execution.response_body ? truncate(execution.response_body, 100) : "Response sent",
      badge: String(execution.response_status),
      badgeColor: statusColor(execution.response_status),
      detail: execution.response_body ? (
        <pre className="text-[10px] font-mono text-neutral-400 bg-black/60 rounded p-3 overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-neutral-800  whitespace-pre-wrap">{execution.response_body}</pre>
      ) : undefined,
    });
  }

  if (events.length <= 2 && checkpoints.length === 0 && logs.length === 0) {
    return (
      <p className="text-[11px] font-mono text-neutral-600 px-1">No trace data recorded for this execution.</p>
    );
  }

  return (
    <div className="space-y-0.5">
      {events.map((event, i) => (
        <EventRow key={event.key} event={event} seq={i + 1} />
      ))}
    </div>
  );
}

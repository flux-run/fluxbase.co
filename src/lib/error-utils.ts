/**
 * Pure helpers for formatting and classifying error data.
 * No React, no side effects — safe to use in any context.
 */

export function formatErrorHeadline(
  errorName?: string | null,
  errorMessage?: string | null,
  fallback?: string | null,
  errorStack?: string | null,
): string {
  const name = errorName?.trim();
  const message = errorMessage?.trim();
  const fallbackMessage = fallback?.trim();
  const stackLine = errorStack
    ?.split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('at '))
    ?.replace(/^Uncaught\s+/, '')
    ?.trim();

  const isGeneric = (value?: string | null) => {
    const normalized = value?.trim().toLowerCase();
    return !normalized ||
      normalized === 'unhandled exception' ||
      normalized === 'unknown runtime error' ||
      normalized === 'unknown error' ||
      normalized === 'runtime error' ||
      normalized === 'exception' ||
      normalized === 'error';
  };

  if (name && message) {
    return message.startsWith(`${name}:`) ? message : `${name}: ${message}`;
  }
  if (stackLine && !isGeneric(stackLine)) return stackLine;
  if (message && !isGeneric(message)) return message;
  if (fallbackMessage && !isGeneric(fallbackMessage)) return fallbackMessage;
  if (stackLine) return stackLine;
  if (message) return message;
  if (fallbackMessage) return fallbackMessage;
  return 'Unhandled exception';
}

export function choosePreferredErrorHeadline(...candidates: Array<string | null | undefined>): string {
  const isGeneric = (value?: string | null) => {
    const normalized = value?.trim().toLowerCase();
    return !normalized ||
      normalized === 'unhandled exception' ||
      normalized === 'unknown runtime error' ||
      normalized === 'unknown error' ||
      normalized === 'runtime error' ||
      normalized === 'exception' ||
      normalized === 'error';
  };

  for (const candidate of candidates) {
    const normalized = candidate?.trim();
    if (normalized && !isGeneric(normalized)) return normalized;
  }
  for (const candidate of candidates) {
    const normalized = candidate?.trim();
    if (normalized) return normalized;
  }
  return 'Unhandled exception';
}

export function errorTypeToFix(issue: string): string | null {
  const key = issue.toLowerCase();
  if (key.includes('no_artifact_loaded') || key.includes('no artifact')) {
    return 'Function has no deployed artifact. Run `flux deploy` to upload a build, then retry.';
  }
  if (key.includes('referenceerror') || key.includes('is not defined')) {
    return 'A variable or import is used before it is defined. Check spelling, import paths, and initialization order.';
  }
  if (key.includes('typeerror') || key.includes('is not a function') || key.includes('cannot read')) {
    return 'A value is used where a different type is expected. Add null/undefined guards or validate incoming data shape.';
  }
  if (key.includes('syntaxerror')) {
    return 'The function source contains a syntax error. Check for unbalanced brackets or TypeScript type mismatches.';
  }
  if (key.includes('timeout') || key.includes('timed out')) {
    return 'Execution exceeded the timeout limit. Reduce blocking I/O or increase the timeout in Function Settings.';
  }
  if (key.includes('unhandled exception') || key.includes('unknown runtime error') || key.includes('unknown error')) {
    return 'Wrap your handler in try/catch to surface the real error type and message.';
  }
  return null;
}

export function confidenceLabel(confidence?: number): string {
  if ((confidence ?? 0) >= 0.85) return 'High';
  if ((confidence ?? 0) >= 0.65) return 'Medium';
  return 'Low';
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function compactIssueLabel(title: string, errorSource?: string | null): string {
  const raw = title.trim();
  const msg = raw.toLowerCase();
  if (msg.includes('fetch failed') || msg.includes('failed to fetch')) {
    const urlMatch = raw.match(/https?:\/\/([^/\s:]+)/);
    const domain = urlMatch ? urlMatch[1] : null;
    const hint = msg.includes('dns') || msg.includes('resolve') ? ' (DNS failed)'
      : msg.includes('timeout') ? ' (timeout)'
      : msg.includes('refused') || msg.includes('econnrefused') ? ' (connection refused)'
      : msg.includes('certificate') || msg.includes('ssl') || msg.includes('tls') ? ' (TLS error)'
      : '';
    return domain ? `fetch → ${domain}${hint}` : `fetch failed${hint}`;
  }
  if (msg.includes('dns') || (msg.includes('resolve') && !msg.includes('promise'))) return 'DNS lookup failed';
  if (msg.includes('timeout')) return 'Request timed out';
  if (msg.includes('connection refused') || msg.includes('econnrefused')) return 'Connection refused';
  if (msg.includes('certificate') || (msg.includes('ssl') && !msg.includes('ssl_')) || msg.includes(' tls ')) return 'TLS / certificate error';
  const namedErr = raw.match(/^(ReferenceError|TypeError|SyntaxError|RangeError|URIError|EvalError):\s*(.+)/);
  if (namedErr) {
    const short = namedErr[2].length > 60 ? namedErr[2].slice(0, 60) + '…' : namedErr[2];
    const src = errorSource === 'user_code' ? ' (user code)' : errorSource === 'platform_runtime' ? ' (runtime)' : '';
    return `${namedErr[1]}: ${short}${src}`;
  }
  return raw.length > 80 ? raw.slice(0, 80) + '…' : raw;
}

export function isInternalFrame(file: string): boolean {
  return file.includes('ext:') || file.includes('deno:') || file.includes('node:') ||
    file.includes('internal/') || file.startsWith('flux:');
}

export function parseStackFrames(stack?: string | null): { fn: string; file: string; line: string; col: string }[] {
  if (!stack) return [];
  return stack.split('\n')
    .filter(line => line.trim().startsWith('at '))
    .map(line => {
      const clean = line.trim().replace(/^at\s+/, '');
      const full = clean.match(/^(.+?)\s+\((.+?):(\d+):(\d+)\)$/);
      if (full) return { fn: full[1], file: full[2], line: full[3], col: full[4] };
      const bare = clean.match(/^(.+?):(\d+):(\d+)$/);
      if (bare) return { fn: '<anonymous>', file: bare[1], line: bare[2], col: bare[3] };
      return null;
    })
    .filter(Boolean) as { fn: string; file: string; line: string; col: string }[];
}

export function frameLabel(
  frame?: { fn?: string; file: string; line: string | number; col?: string | number } | null,
  short = true,
): string | null {
  if (!frame) return null;
  const file = short ? (frame.file.split('/').pop() ?? frame.file) : frame.file;
  const col = !short && frame.col != null && Number(frame.col) > 0 ? `:${frame.col}` : '';
  return `${file}:${frame.line}${col}`;
}

export function topUserFrame(stack?: string | null): { fn: string; file: string; line: string; col: string } | null {
  return parseStackFrames(stack).find(f => !isInternalFrame(f.file)) ?? null;
}

/** Normalise a raw error title into "ErrorType: short-message (context)" for stable display. */
export function normalizeErrorSig(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const colonIdx = raw.indexOf(':');
  if (colonIdx !== -1) {
    const type = raw.slice(0, colonIdx).trim();
    let msg    = raw.slice(colonIdx + 1).trim();
    msg = msg.replace(/\s+at\s+\S+.*$/i, '').replace(/\n.*$/, '').trim();
    const ctxMatch = msg.match(/\(([^)]{4,40})\)/);
    const ctx      = ctxMatch ? ` (${ctxMatch[1]})` : '';
    const short    = msg.replace(/\s*\(.*\)\s*$/, '').slice(0, 40).trim();
    return `${type}: ${short}${ctx}`;
  }
  return raw.slice(0, 55);
}

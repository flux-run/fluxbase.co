import * as Sentry from "@sentry/nextjs";

type MonitoringProvider = "none" | "sentry";
type MonitoringTarget = "server" | "edge" | "browser";
type CaptureContext = {
  category?: string;
  operation?: string;
  tags?: Record<string, string>;
  extras?: Record<string, unknown>;
};

let activeProvider: MonitoringProvider = "none";
let activeService = "web";

function parseProvider(): MonitoringProvider {
  const raw = (
    process.env.NEXT_PUBLIC_MONITORING_PROVIDER ||
    process.env.MONITORING_PROVIDER ||
    "sentry"
  )
    .trim()
    .toLowerCase();

  if (raw === "none" || raw === "off" || raw === "disabled") {
    return "none";
  }
  if (raw !== "sentry") {
    return "none";
  }
  return "sentry";
}

function parseSampleRate(raw: string | undefined): number {
  const value = Number(raw || "0");
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function resolveDsn(target: MonitoringTarget): string {
  if (target === "browser") {
    return process.env.NEXT_PUBLIC_SENTRY_DSN || "";
  }
  return process.env.SENTRY_DSN || "";
}

function resolveEnvironment(target: MonitoringTarget): string {
  if (target === "browser") {
    return (
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      process.env.SENTRY_ENVIRONMENT ||
      process.env.NODE_ENV ||
      "development"
    );
  }

  return process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development";
}

function resolveSampleRate(target: MonitoringTarget): number {
  if (target === "browser") {
    return parseSampleRate(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || process.env.SENTRY_TRACES_SAMPLE_RATE,
    );
  }
  return parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE);
}

export function initMonitoring(target: MonitoringTarget): MonitoringProvider {
  const provider = parseProvider();
  activeProvider = provider;
  activeService = target;

  if (provider !== "sentry") {
    return "none";
  }

  const dsn = resolveDsn(target);
  if (!dsn) {
    activeProvider = "none";
    return "none";
  }

  Sentry.init({
    dsn,
    environment: resolveEnvironment(target),
    tracesSampleRate: resolveSampleRate(target),
    initialScope: {
      tags: {
        service: target,
      },
    },
  });

  return "sentry";
}

export function captureException(error: unknown, context?: CaptureContext): void {
  if (activeProvider !== "sentry") {
    return;
  }

  const category = context?.category || "error";
  const operation = context?.operation || "generic";
  const normalizedError = error instanceof Error ? error : new Error(String(error));

  Sentry.withScope((scope) => {
    scope.setTag("service", activeService);
    scope.setTag("category", category);
    scope.setTag("operation", operation);

    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context?.extras) {
      for (const [key, value] of Object.entries(context.extras)) {
        scope.setExtra(key, value as any);
      }
    }

    scope.setFingerprint(["flux", activeService, category, operation]);
    Sentry.captureException(normalizedError);
  });
}

export function withMonitoringConfig<T>(baseConfig: T): T {
  if (parseProvider() !== "sentry") {
    return baseConfig;
  }
  return Sentry.withSentryConfig(baseConfig as any, { silent: true }) as T;
}

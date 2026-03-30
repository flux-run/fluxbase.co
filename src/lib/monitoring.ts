import * as Sentry from "@sentry/nextjs";

type MonitoringProvider = "none" | "sentry";
type MonitoringTarget = "server" | "edge" | "browser";

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
  if (provider !== "sentry") {
    return "none";
  }

  const dsn = resolveDsn(target);
  if (!dsn) {
    return "none";
  }

  Sentry.init({
    dsn,
    environment: resolveEnvironment(target),
    tracesSampleRate: resolveSampleRate(target),
  });

  return "sentry";
}

export function captureException(error: unknown): void {
  if (parseProvider() === "sentry") {
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  }
}

export function withMonitoringConfig<T>(baseConfig: T): T {
  if (parseProvider() !== "sentry") {
    return baseConfig;
  }
  return Sentry.withSentryConfig(baseConfig as any, { silent: true }) as T;
}

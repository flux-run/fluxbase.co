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
let listenersAttached = false;

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

function isProductionEnvironment(target: MonitoringTarget): boolean {
  if (target === "browser") {
    const env = (
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      process.env.SENTRY_ENVIRONMENT ||
      process.env.NODE_ENV ||
      "development"
    )
      .trim()
      .toLowerCase();
    return env === "production";
  }

  const env = (process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development")
    .trim()
    .toLowerCase();
  return env === "production";
}

function strictModeEnabled(target: MonitoringTarget): boolean {
  const raw = process.env.NEXT_PUBLIC_MONITORING_STRICT_MODE || process.env.MONITORING_STRICT_MODE;
  if (!raw) {
    return isProductionEnvironment(target);
  }
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function attachGlobalHandlers(target: MonitoringTarget): void {
  if (listenersAttached || activeProvider !== "sentry") {
    return;
  }

  if (target === "browser" && typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      captureException((event as ErrorEvent).error || new Error((event as ErrorEvent).message), {
        category: "global",
        operation: "window_error",
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const rejectionEvent = event as PromiseRejectionEvent;
      captureException(rejectionEvent.reason, {
        category: "global",
        operation: "window_unhandled_rejection",
      });
    });

    window.addEventListener("pagehide", () => {
      void flushMonitoring(1500);
    });
  }

  if (target === "server" && typeof process !== "undefined" && typeof process.on === "function") {
    process.on("uncaughtException", (error: Error) => {
      captureException(error, {
        category: "global",
        operation: "uncaught_exception",
      });
      void flushMonitoring(2000);
    });
    process.on("unhandledRejection", (reason: unknown) => {
      captureException(reason, {
        category: "global",
        operation: "unhandled_rejection",
      });
      void flushMonitoring(2000);
    });
    process.on("beforeExit", () => {
      void flushMonitoring(2000);
    });
    process.on("SIGTERM", () => {
      void flushMonitoring(2000);
    });
    process.on("SIGINT", () => {
      void flushMonitoring(2000);
    });
  }

  listenersAttached = true;
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
    const message = `[monitoring] SENTRY_DSN is missing for target '${target}' while MONITORING_PROVIDER=sentry`;
    if (strictModeEnabled(target)) {
      throw new Error(message);
    }
    console.warn(message);
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

  attachGlobalHandlers(target);

  return "sentry";
}

export async function flushMonitoring(timeoutMs = 2000): Promise<boolean> {
  if (activeProvider !== "sentry") {
    return true;
  }
  try {
    return await Sentry.flush(timeoutMs);
  } catch {
    return false;
  }
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

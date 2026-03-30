import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    tracesSampleRate: Math.min(
      1,
      Math.max(0, Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0")),
    ),
  });
}

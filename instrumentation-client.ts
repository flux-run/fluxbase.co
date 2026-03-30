import * as Sentry from "@sentry/nextjs";
import { initMonitoring } from "./src/lib/monitoring";

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

initMonitoring("browser");

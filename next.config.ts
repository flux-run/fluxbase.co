import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Public website — deployed to Vercel.
// No static export; standard Next.js server-side rendering.
const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
	silent: true,
});

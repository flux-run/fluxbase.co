import type { NextConfig } from "next";
import { withMonitoringConfig } from "./src/lib/monitoring";

// Public website — deployed to Vercel.
// No static export; standard Next.js server-side rendering.
const nextConfig: NextConfig = {};

export default withMonitoringConfig(nextConfig);

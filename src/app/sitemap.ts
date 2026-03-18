import type { MetadataRoute } from 'next'

const BASE = 'https://fluxbase.co'

const staticRoutes = [
  '',
  '/product',
  '/how-it-works',
  '/pricing',
  '/cli',
]

const docRoutes = [
  '/docs',
  '/docs/why',
  '/docs/install',
  '/docs/quickstart',
  '/docs/concepts',
  '/docs/execution-record',
  '/docs/tracing-model',
  '/docs/functions',
  '/docs/database',
  '/docs/queue',
  '/docs/observability',
  '/docs/debugging-production',
  '/docs/common-tasks',
  '/docs/debug-incident',
  '/docs/replay-incident',
  '/docs/inspect-mutations',
  '/docs/compare-executions',
  '/docs/find-regression',
  '/docs/cli',
  '/docs/architecture',
  '/docs/server',
  '/docs/runtime',
  '/docs/data-engine',
  '/docs/secrets',
  '/docs/production',
  '/docs/self-hosting',
  '/docs/examples',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [...staticRoutes, ...docRoutes].map((route) => ({
    url: `${BASE}${route}`,
    lastModified: now,
    changeFrequency: route.startsWith('/docs') ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route.startsWith('/docs/quickstart') ? 0.9 : 0.8,
  }))
}

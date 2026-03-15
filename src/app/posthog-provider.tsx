'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ''
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://a.fluxbase.co'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // Respect privacy — don't record sessions by default
      disable_session_recording: true,
      // Capture page views manually via PostHogPageView so Next.js SPA
      // navigations are tracked correctly (hash changes, client-side routing).
      capture_pageview: false,
      // Persist opt-out across page reloads
      persistence: 'localStorage',
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}

/**
 * Drop this once inside a Suspense boundary (it uses `useSearchParams`).
 * Fires a $pageview on every pathname/search change.
 */
export function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ph = usePostHog()
  const lastUrl = useRef<string>('')

  useEffect(() => {
    if (!ph || !pathname) return
    const url = window.origin + pathname + (searchParams.toString() ? `?${searchParams}` : '')
    if (url === lastUrl.current) return
    lastUrl.current = url
    ph.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, ph])

  return null
}

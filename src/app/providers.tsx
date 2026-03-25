'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { PostHogProvider } from './posthog-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 15_000,
          },
        },
      })
  )

  return (
    <SessionProvider>
      <PostHogProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </PostHogProvider>
    </SessionProvider>
  )
}

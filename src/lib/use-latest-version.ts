import { useEffect, useState } from 'react'

// Module-level cache so multiple components share a single fetch
let cached: string | null = null
let promise: Promise<string | null> | null = null

function fetchVersion(): Promise<string | null> {
  if (!promise) {
    promise = fetch('https://api.github.com/repos/flux-run/flux/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((r) => r.json())
      .then((d) => {
        const tag: string = d.tag_name ?? ''
        cached = tag || null
        return cached
      })
      .catch(() => null)
  }
  return promise
}

export function useLatestVersion(): string | null {
  const [version, setVersion] = useState<string | null>(cached)

  useEffect(() => {
    if (cached) return
    fetchVersion().then((v) => {
      if (v) setVersion(v)
    })
  }, [])

  return version
}

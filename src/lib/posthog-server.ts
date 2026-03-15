/**
 * Lightweight server-side PostHog helper.
 *
 * Used in Next.js Route Handlers (edge-compatible, no Node-only APIs).
 * Fires a single capture request to the PostHog ingestion endpoint.
 * All failures are swallowed — analytics must never break the product.
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://a.fluxbase.co';

/**
 * Send a server-side PostHog event.
 * Fire-and-forget: await only if you need the result; normally `void` this.
 */
export async function captureInstallEvent(
  event: string,
  properties: Record<string, string | undefined>,
): Promise<void> {
  if (!POSTHOG_KEY) return;

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        // Use a stable anonymous ID for server-side installs — PostHog requires
        // a distinct_id. We use a fixed string so all install counts are grouped
        // in one profile; individual identity is not meaningful here.
        distinct_id: 'install-script',
        properties: {
          $lib: 'posthog-node-server',
          ...Object.fromEntries(
            Object.entries(properties).filter(([, v]) => v !== undefined),
          ),
        },
      }),
      // 2-second timeout — don't hold up the response
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Never throw — analytics failures must be invisible to users
  }
}

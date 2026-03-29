/**
 * Centralized pricing configuration — single source of truth.
 * All pricing values, limits, and feature gates are defined here.
 * Update this file to change pricing across the entire frontend.
 */

export type PlanId = 'free' | 'builder' | 'startup' | 'enterprise'

export interface PricingFeature {
  label: string
  /** string value like "100K/mo", boolean for yes/no, or null for "Custom" */
  value: string | boolean | null
}

export interface PricingTier {
  id: PlanId
  name: string
  /** Monthly price in USD; null = custom/contact */
  price: number | null
  /** Billing period label */
  period: string
  tagline: string
  /** CTA button label */
  cta: string
  /** CTA link */
  ctaHref: string
  /** Whether this tier is highlighted as "most popular" */
  popular?: boolean
  features: PricingFeature[]
}

// ─── Limits ──────────────────────────────────────────────────────────────────

export const LIMITS = {
  free: {
    executions: 5_000,
    retentionDays: 14,
    projects: 1,
    environments: 1,
    members: 3,
    apiKeys: 2,
    customDomains: 0,
  },
  builder: {
    executions: 1_000_000,
    retentionDays: 30,
    projects: -1,
    environments: -1,
    members: 5,
    apiKeys: 10,
    customDomains: 1,
  },
  startup: {
    executions: 5_000_000,
    retentionDays: 90,
    projects: -1,
    environments: -1,
    members: -1,
    apiKeys: -1,
    customDomains: 5,
  },
  enterprise: {
    executions: -1,
    retentionDays: -1,
    projects: -1,
    environments: -1,
    members: -1,
    apiKeys: -1,
    customDomains: -1,
  },
} satisfies Record<PlanId, Record<string, number>>

// ─── Overage & discounts ────────────────────────────────────────────────────

export const OVERAGE = {
  /** USD per 1 million additional executions ($0.20 per 100K) */
  pricePerMillionExec: 2,
}

export const ANNUAL_DISCOUNT_PERCENT = 20

// ─── Tiers ───────────────────────────────────────────────────────────────────

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '/month',
    tagline: 'Debug your code without paying anything.',
    cta: 'Start free',
    ctaHref: '/login',
    features: [
      { label: 'Executions recorded', value: '5K / mo' },
      { label: 'Trace retention', value: '14 days' },
      { label: 'Projects', value: '1' },
      { label: 'Team members', value: '3' },
      { label: 'Basic incident detection', value: true },
      { label: 'Execution replay', value: 'Limited' },
      { label: 'Advanced insights', value: false },
      { label: 'No credit card required', value: true },
    ],
  },
  {
    id: 'builder',
    name: 'Builder',
    price: 19,
    period: '/month',
    tagline: 'Ship to production with full visibility.',
    cta: 'Get Builder',
    ctaHref: '/login',
    popular: true,
    features: [
      { label: 'Executions recorded', value: '1M / mo' },
      { label: 'Trace retention', value: '30 days' },
      { label: 'Projects', value: 'Unlimited' },
      { label: 'Team members', value: '5' },
      { label: 'Full execution replay', value: true },
      { label: 'Root cause analysis', value: true },
      { label: 'Basic alerts', value: true },
      { label: 'Usage predictions', value: true },
    ],
  },
  {
    id: 'startup',
    name: 'Pro',
    price: 49,
    period: '/month',
    tagline: 'For teams that rely on debugging in production.',
    cta: 'Get Pro',
    ctaHref: '/login',
    features: [
      { label: 'Executions recorded', value: '5M / mo' },
      { label: 'Trace retention', value: '90 days' },
      { label: 'Projects', value: 'Unlimited' },
      { label: 'Team members', value: 'Unlimited' },
      { label: 'Advanced incident grouping', value: true },
      { label: 'Slack + webhook alerts', value: true },
      { label: 'Detailed usage analytics', value: true },
      { label: 'API access', value: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    period: '',
    tagline: 'Dedicated infrastructure, custom retention, and compliance.',
    cta: 'Contact sales',
    ctaHref: 'mailto:team@fluxbase.co',
    features: [
      { label: 'Executions recorded', value: 'Unlimited' },
      { label: 'Trace retention', value: 'Custom' },
      { label: 'Dedicated region / infra', value: true },
      { label: 'SLA + support', value: true },
      { label: 'SSO / RBAC', value: true },
      { label: 'Custom onboarding', value: true },
      { label: 'Volume pricing', value: true },
      { label: 'Security review', value: true },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a limit value: -1 → "Unlimited", numbers → locale string */
export function formatLimit(n: number): string {
  if (n === -1) return 'Unlimited'
  if (n >= 1_000_000) return `${n / 1_000_000}M`
  if (n >= 1_000) return `${n / 1_000}K`
  return n.toString()
}

/** Format a price value for display. null → "Custom" */
export function formatPrice(price: number | null): string {
  if (price === null) return 'Custom'
  if (price === 0) return '$0'
  return `$${price}`
}

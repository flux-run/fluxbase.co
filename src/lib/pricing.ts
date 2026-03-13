/**
 * Centralized pricing configuration — single source of truth.
 * All pricing values, limits, and feature gates are defined here.
 * Update this file to change pricing across the entire frontend.
 */

export type PlanId = 'free' | 'builder' | 'startup' | 'scale' | 'enterprise'

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
    executions: 250_000,         // per month
    retentionDays: 14,
    projects: -1,                // unlimited
    environments: 1,
    members: 1,
    apiKeys: 2,
    customDomains: 0,
  },
  builder: {
    executions: 1_000_000,
    retentionDays: 30,
    projects: -1,                // unlimited
    environments: -1,
    members: 3,
    apiKeys: 10,
    customDomains: 1,
  },
  startup: {
    executions: 10_000_000,
    retentionDays: 30,
    projects: -1,                // unlimited
    environments: -1,
    members: 10,
    apiKeys: -1,
    customDomains: 5,
  },
  scale: {
    executions: 50_000_000,
    retentionDays: 60,
    projects: -1,
    environments: -1,
    members: 25,
    apiKeys: -1,
    customDomains: -1,
  },
  enterprise: {
    executions: -1,              // unlimited
    retentionDays: -1,           // custom
    projects: -1,
    environments: -1,
    members: -1,
    apiKeys: -1,
    customDomains: -1,
  },
} satisfies Record<PlanId, Record<string, number>>

// ─── Overage & discounts ────────────────────────────────────────────────────

export const OVERAGE = {
  /** USD per 1 million additional executions */
  pricePerMillionExec: 5,
}

export const ANNUAL_DISCOUNT_PERCENT = 20

// ─── Tiers ───────────────────────────────────────────────────────────────────

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '/month',
    tagline: 'Experiment freely — full execution history, no card required.',
    cta: 'Start for free',
    ctaHref: '/dashboard',
    features: [
      { label: 'Executions recorded', value: '250K / mo' },
      { label: 'Trace retention', value: '14 days' },
      { label: 'Projects', value: 'Unlimited' },
      { label: 'Environments', value: '1' },
      { label: 'Team members', value: '1' },
      { label: 'API keys', value: '2' },
      { label: 'Custom domains', value: false },
      { label: 'SSO / SAML', value: false },
      { label: 'SLA', value: false },
    ],
  },
  {
    id: 'builder',
    name: 'Builder',
    price: 19,
    period: '/month',
    tagline: 'Ship to production with full execution history and replay.',
    cta: 'Get Builder',
    ctaHref: '/dashboard',
    popular: true,
    features: [
      { label: 'Executions recorded', value: '1M / mo' },
      { label: 'Trace retention', value: '30 days' },
      { label: 'Projects', value: 'Unlimited' },
      { label: 'Environments', value: 'Unlimited' },
      { label: 'Team members', value: '3' },
      { label: 'API keys', value: '10' },
      { label: 'Custom domains', value: '1' },
      { label: 'SSO / SAML', value: false },
      { label: 'SLA', value: false },
    ],
  },
  {
    id: 'startup',
    name: 'Startup',
    price: 79,
    period: '/month',
    tagline: 'Scale a real product with deeper history and a growing team.',
    cta: 'Get Startup',
    ctaHref: '/dashboard',
    features: [
      { label: 'Executions recorded', value: '10M / mo' },
      { label: 'Trace retention', value: '30 days' },
      { label: 'Projects', value: 'Unlimited' },
      { label: 'Environments', value: 'Unlimited' },
      { label: 'Team members', value: '10' },
      { label: 'API keys', value: 'Unlimited' },
      { label: 'Custom domains', value: '5' },
      { label: 'SSO / SAML', value: false },
      { label: 'SLA', value: false },
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 249,
    period: '/month',
    tagline: 'High-volume systems with 60-day history and advanced replay.',
    cta: 'Get Scale',
    ctaHref: '/dashboard',
    features: [
      { label: 'Executions recorded', value: '50M / mo' },
      { label: 'Trace retention', value: '60 days' },
      { label: 'Projects', value: 'Unlimited' },
      { label: 'Environments', value: 'Unlimited' },
      { label: 'Team members', value: '25' },
      { label: 'API keys', value: 'Unlimited' },
      { label: 'Custom domains', value: 'Unlimited' },
      { label: 'SSO / SAML', value: false },
      { label: 'SLA', value: '99.9% uptime SLA' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    period: '',
    tagline: 'Dedicated infrastructure, custom retention, and compliance.',
    cta: 'Contact us',
    ctaHref: 'mailto:team@fluxbase.co',
    features: [
      { label: 'Executions recorded', value: 'Unlimited' },
      { label: 'Trace retention', value: 'Custom' },
      { label: 'Projects', value: 'Unlimited' },
      { label: 'Environments', value: 'Unlimited' },
      { label: 'Team members', value: 'Unlimited' },
      { label: 'API keys', value: 'Unlimited' },
      { label: 'Custom domains', value: 'Unlimited' },
      { label: 'SSO / SAML', value: true },
      { label: 'SLA', value: 'Custom SLA + dedicated support' },
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

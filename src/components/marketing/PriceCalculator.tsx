'use client'

import { useState } from 'react'
import { OVERAGE } from '@/lib/pricing'

const STEPS = [
  1_000,
  5_000,
  50_000,
  250_000,
  1_000_000,
  2_500_000,
  5_000_000,
  10_000_000,
  20_000_000,
]

function formatExec(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

function recommend(executions: number): { plan: string; price: number; overage: number } {
  if (executions <= 5_000) return { plan: 'Free', price: 0, overage: 0 }
  if (executions <= 1_000_000) return { plan: 'Builder', price: 19, overage: 0 }
  if (executions <= 5_000_000) return { plan: 'Pro', price: 49, overage: 0 }
  const overageUnits = Math.ceil((executions - 5_000_000) / 1_000_000)
  return { plan: 'Pro', price: 49, overage: overageUnits * OVERAGE.pricePerMillionExec }
}

const PLAN_COLORS: Record<string, string> = {
  Free: 'var(--mg-muted)',
  Builder: 'var(--mg-accent)',
  Pro: '#10b981',
}

export function PriceCalculator() {
  const [stepIdx, setStepIdx] = useState(4) // default: 1M
  const executions = STEPS[stepIdx]
  const { plan, price, overage } = recommend(executions)
  const total = price + overage

  return (
    <div style={{
      background: 'var(--mg-bg-surface)',
      border: '1px solid var(--mg-border)',
      borderRadius: 14,
      padding: '32px 36px',
      maxWidth: 680,
      margin: '0 auto',
    }}>
      <div style={{ marginBottom: 6, fontSize: '.7rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mg-muted)' }}>
        Interactive cost estimator
      </div>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 4, color: 'var(--mg-text)' }}>
        How much will my app cost?
      </h3>
      <p style={{ fontSize: '.82rem', color: 'var(--mg-muted)', marginBottom: 28, margin: '0 0 28px' }}>
        Drag the slider to estimate your monthly executions.
      </p>

      {/* Slider */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '.75rem', color: 'var(--mg-muted)' }}>1K</span>
          <span style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--mg-text)' }}>
            {formatExec(executions)} executions / mo
          </span>
          <span style={{ fontSize: '.75rem', color: 'var(--mg-muted)' }}>20M</span>
        </div>
        <input
          type="range"
          min={0}
          max={STEPS.length - 1}
          step={1}
          value={stepIdx}
          onChange={(e) => setStepIdx(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--mg-accent)', cursor: 'pointer' }}
        />
      </div>

      {/* Result */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--mg-bg-elevated)',
        border: '1px solid var(--mg-border)',
        borderRadius: 10,
        padding: '18px 24px',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: '.72rem', color: 'var(--mg-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Recommended plan
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: PLAN_COLORS[plan] ?? 'var(--mg-text)' }}>
            {plan}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '.72rem', color: 'var(--mg-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Estimated monthly cost
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--mg-text)' }}>
              {total === 0 ? '$0' : `$${total}`}
            </span>
            <span style={{ fontSize: '.8rem', color: 'var(--mg-muted)' }}>/mo</span>
          </div>
          {overage > 0 && (
            <div style={{ fontSize: '.72rem', color: 'var(--mg-muted)', marginTop: 2 }}>
              includes ${overage} overage
            </div>
          )}
        </div>
      </div>

      {/* Pricing clarification */}
      {plan === 'Free' && (
        <p style={{ fontSize: '.78rem', color: 'var(--mg-muted)', marginTop: 14, margin: '14px 0 0' }}>
          Free forever — no credit card required up to 5K executions/mo.
        </p>
      )}
      {plan !== 'Free' && overage === 0 && (
        <p style={{ fontSize: '.78rem', color: 'var(--mg-muted)', marginTop: 14, margin: '14px 0 0' }}>
          Flat-rate until your plan limit. Overage only starts above the included execution volume.
        </p>
      )}
      {overage > 0 && (
        <p style={{ fontSize: '.78rem', color: 'var(--mg-muted)', marginTop: 14, margin: '14px 0 0' }}>
          You stay on Pro and pay soft overage instead of getting hard-blocked.
        </p>
      )}
    </div>
  )
}

"use client";
import Link from "next/link";
import { ArrowRight, Check, X, Zap, Database, Clock, ShieldCheck } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PriceCalculator } from "@/components/marketing/PriceCalculator";
import { OVERAGE, PRICING_TIERS, formatPrice } from "@/lib/pricing";

function FeatureValue({ value }: { value: string | boolean | null }) {
  if (value === true) {
    return <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  }
  if (value === false) {
    return <X className="w-3.5 h-3.5 text-neutral-700 shrink-0" />;
  }
  if (value === null) {
    return <span className="text-[10px] font-mono text-neutral-500">Custom</span>;
  }
  return <span className="text-[10px] font-mono text-neutral-300 text-right">{value}</span>;
}

export default function PricingPage() {
  return (
    <MarketingLayout>
      <main className="px-6 sm:px-10 lg:px-14 py-16 sm:py-20 space-y-16 max-w-7xl mx-auto">
        <section className="space-y-6 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-blue-400">
            <Zap className="w-3 h-3" />
            Simple, usage-based pricing
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[0.95]">
            Pay for execution time and storage.
            <br />
            Nothing else.
          </h1>
          <p className="text-lg sm:text-2xl font-semibold text-neutral-300 leading-snug">
            See exactly what happened in every execution.
          </p>
          <p className="text-base sm:text-lg text-neutral-500 font-medium leading-relaxed max-w-3xl mx-auto">
            You only pay for what actually runs, not noisy logs. Start free, keep team collaboration available, and upgrade only when debugging becomes mission-critical.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/login" className="bg-white text-black text-[11px] font-black uppercase tracking-[0.18em] px-6 py-3 rounded-sm hover:bg-neutral-200 transition-colors">
              Start free (no credit card)
            </Link>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-700">
            Used by teams debugging production systems
          </p>
        </section>

        {/* Killer example strip */}
        <section className="rounded-2xl border border-neutral-800 bg-[#0D0D0D] px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-6 max-w-5xl mx-auto w-full">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-600">How it works</p>
            <p className="text-lg sm:text-xl font-black text-white leading-snug">
              One API call failed — see input, output, and exact failure instantly.
            </p>
            <p className="text-[11px] text-neutral-500 font-medium">Replay any failed execution with full context in seconds. No log grepping.</p>
          </div>
          <Link
            href="/login"
            className="shrink-0 flex items-center gap-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.18em] px-5 py-3 rounded-lg hover:bg-blue-500 transition-colors"
          >
            Get your first replay in minutes
            <ArrowRight className="w-3 h-3" />
          </Link>
        </section>

        {/* "Not logs. Not metrics." category positioning */}
        <section className="text-center max-w-3xl mx-auto space-y-2 -mt-8">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-600">
            Not logs. Not metrics. Not traces.
          </p>
          <p className="text-sm font-semibold text-neutral-500">Execution-level debugging — the layer between your code and your incidents.</p>
        </section>

        {/* "Built for debugging" qualifier — shown before tier cards */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-6 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full -mt-8">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-[11px] font-medium text-neutral-400">
            <span className="text-white font-black">Built for debugging, not full backend hosting.</span>{" "}
            Shaped for critical-path replay and incident response — not replacing your runtime.
          </p>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-stretch">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl border overflow-hidden ${
                tier.popular
                  ? "border-blue-500/40 bg-blue-500/[0.07] shadow-[0_0_40px_rgba(59,130,246,0.08)]"
                  : "border-neutral-800 bg-[#0D0D0D]"
              }`}
            >
              {tier.popular && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-transparent" />
              )}
              <div className="p-6 sm:p-7 h-full flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <p className="text-lg font-black text-white tracking-tight">{tier.name}</p>
                    <p className="text-[10px] text-neutral-500 font-mono mt-1 leading-relaxed max-w-[18ch]">{tier.tagline}</p>
                  </div>
                  {tier.popular && (
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-300 border border-blue-500/30 rounded-full px-2 py-1">
                      Most popular
                    </span>
                  )}
                </div>

                <div className="mb-6">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-white leading-none">{formatPrice(tier.price)}</span>
                    {tier.price !== null && <span className="text-sm font-bold text-neutral-500 mb-1">{tier.period}</span>}
                  </div>
                </div>

                <Link
                  href={tier.ctaHref}
                  className={`mb-6 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                    tier.popular
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : tier.id === "free"
                      ? "bg-white text-black hover:bg-neutral-200"
                      : "bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-700"
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="w-3 h-3" />
                </Link>

                <div className="space-y-2.5 flex-1">
                  {tier.features.map((feature) => (
                    <div key={`${tier.id}-${feature.label}`} className="flex items-center justify-between gap-3 border-b border-neutral-900/70 pb-2 last:border-0">
                      <span className="text-[10px] text-neutral-500 font-medium">{feature.label}</span>
                      <FeatureValue value={feature.value} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.1fr,0.9fr] gap-6">
          <div className="rounded-2xl border border-neutral-900 bg-[#0D0D0D] p-8 sm:p-10 space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-600 mb-3">How billing works</p>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">What you pay for</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: Zap,
                  title: "Executions",
                  text: "Count the real runs that matter, not every noisy event.",
                },
                {
                  icon: Clock,
                  title: "Compute time",
                  text: "Measure actual runtime, so cost tracks useful work.",
                },
                {
                  icon: Database,
                  title: "Storage retained",
                  text: "Pay for the execution history you keep available.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-neutral-900 bg-black/40 p-4">
                  <item.icon className="w-4 h-4 text-blue-400 mb-3" />
                  <p className="text-sm font-black text-white">{item.title}</p>
                  <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-neutral-900 bg-black/40 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-3">Soft overage</p>
              <div className="space-y-2 text-sm font-medium text-neutral-300">
                <div className="flex items-center justify-between gap-4">
                  <span>Additional executions</span>
                  <span className="font-mono text-white">$0.20 / 100K</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Storage retained</span>
                  <span className="font-mono text-neutral-400">~$0.05 / GB·mo</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Compute time</span>
                  <span className="font-mono text-neutral-400">usage-based (runtime)</span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-4 leading-relaxed">
                No hard block when you grow. Flux keeps your debugging workflow running and adds predictable overage instead of shutting you off.
              </p>
              <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <p className="text-[11px] font-semibold text-emerald-300">
                  No surprise billing. You always see usage before you pay.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-black/40 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-3">Unlike traditional tools</p>
              <ul className="space-y-2.5">
                {[
                  "No per-event pricing",
                  "No noisy logs billing",
                  "Only real execution cost",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-[11px] font-medium text-neutral-400">
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-neutral-600 mt-3 font-medium">Simple, predictable pricing as you scale.</p>
            </div>
          </div>

          <div className="space-y-6">
            <PriceCalculator />

            <div className="rounded-2xl border border-neutral-900 bg-[#0D0D0D] p-8 space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-600 mb-3">Example</p>
                <h3 className="text-2xl font-black text-white tracking-tight">What does usage look like?</h3>
              </div>
              <div className="space-y-3 text-sm text-neutral-400 font-medium">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">Typical usage: 10K – 500K executions / month</p>
                <p>If you run 100K executions in a month, you stay comfortably inside Builder with full replay and 30-day retention.</p>
                <p>If you grow past Pro, overage starts at <span className="text-white font-mono">${(OVERAGE.pricePerMillionExec / 10).toFixed(2)} / 100K</span> instead of interrupting your team.</p>
                <p>That keeps pricing fair, predictable, and aligned with how much real debugging value you are getting.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-900 bg-[#0D0D0D] p-8 sm:p-10 text-center space-y-5">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-600">Start without friction</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Get your first replay in under 2 minutes.</h2>
          <p className="text-base text-neutral-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Install the CLI, capture one execution, and see it in the dashboard — before you ever think about billing.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <Link href="/login" className="bg-white text-black text-[11px] font-black uppercase tracking-[0.18em] px-6 py-3 rounded-sm hover:bg-neutral-200 transition-colors">
              Start free
            </Link>
            <Link href="/docs/quickstart" className="text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500 hover:text-white transition-colors">
              Read quickstart
            </Link>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}

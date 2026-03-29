"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLatestVersion } from '@/lib/use-latest-version';

function GitHubStarButton() {
  const [count, setCount] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://api.github.com/repos/flux-run/flux')
      .then((r) => r.json())
      .then((d) => {
        const n: number = d.stargazers_count;
        if (!n) return;
        setCount(n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex items-center overflow-hidden rounded-sm border border-white/5 text-[11px] font-black uppercase tracking-widest transition-all hover:border-white/10">
      <Link
        href="https://github.com/flux-run/flux"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-neutral-500 hover:text-white transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.873 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
        </svg>
        Star
      </Link>
      {count !== null && (
        <Link
          href="https://github.com/flux-run/flux/stargazers"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 bg-white/[0.02] border-l border-white/5 text-neutral-600 hover:text-white transition-colors"
        >
          {count}
        </Link>
      )}
    </div>
  );
}

const LINKS = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
  { href: '/docs/cli', label: 'CLI' },
  { href: '/docs/quickstart', label: 'Quickstart' },
];

export function NavBar() {
  const pathname = usePathname();
  const version = useLatestVersion();

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 sm:px-12 z-[100]">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <span className="text-xl font-black tracking-tighter text-white">flux</span>
        </Link>
        
        {version && (
          <Link
            href="https://github.com/flux-run/flux/releases/latest"
            target="_blank"
            className="hidden sm:flex items-center px-1.5 py-0.5 rounded-full bg-neutral-900 border border-white/5 text-[9px] font-black tracking-widest text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            {version}
          </Link>
        )}
      </div>

      <div className="hidden md:flex items-center gap-10">
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
              pathname === href || (href !== '/' && pathname?.startsWith(href))
                ? 'text-white'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="hidden xs:block">
          <GitHubStarButton />
        </div>
        <Link 
          href="/login" 
          className="bg-white text-black text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] px-4 py-2 sm:px-6 sm:py-2.5 rounded-sm hover:bg-neutral-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          Get Started →
        </Link>
      </div>
    </nav>
  );
}

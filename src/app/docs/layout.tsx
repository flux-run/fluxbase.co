"use client";
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { NavBar } from '@/components/marketing/NavBar';
import { DocsSidebar } from '@/components/docs/DocsSidebar';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-blue-500/30 selection:text-white">
      <NavBar />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-[39] bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* Mobile top bar with hamburger */}
      <div className="lg:hidden fixed top-14 left-0 right-0 h-12 bg-[#0C0C0C] border-b border-white/5 flex items-center px-6 z-[38]">
        <button
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-2 text-neutral-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          Menu
        </button>
      </div>

      <div className="flex pt-14 lg:pt-14">
        <DocsSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 min-w-0 pt-12 lg:pt-0 lg:ml-64">
          <div className="max-w-4xl mx-auto px-6 py-12 lg:px-16 lg:py-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

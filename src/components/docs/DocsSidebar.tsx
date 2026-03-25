"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLatestVersion } from '@/lib/use-latest-version';

const NAV = [
  {
    title: 'Getting Started',
    links: [
      { href: '/docs',              label: 'Introduction'   },
      { href: '/docs/install',      label: 'Install'        },
      { href: '/docs/quickstart',   label: 'Quickstart'     },
    ],
  },
  {
    title: 'CLI Commands',
    links: [
      { href: '/docs/cli',          label: 'CLI Reference'  },
    ],
  },
  {
    title: 'Runtime',
    links: [
      { href: '/docs/compatibility', label: 'Compatibility' },
      { href: '/docs/architecture',  label: 'Architecture'  },
    ],
  },
];

interface DocsSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function DocsSidebar({ isOpen, onClose }: DocsSidebarProps) {
  const pathname = usePathname();
  const version = useLatestVersion();

  const isActive = (href: string) =>
    href === '/docs' ? pathname === '/docs' : pathname === href;

  return (
    <nav
      className={`fixed top-14 left-0 bottom-0 w-64 border-r border-white/5 bg-[#0A0A0A] overflow-y-auto px-4 py-8 z-[40] transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Search Placeholder */}
      <div className="mb-10 px-2 group">
        <div className="flex items-center gap-3 px-3 py-2 bg-neutral-900 border border-white/5 rounded-sm text-neutral-500 text-[11px] font-bold uppercase tracking-widest cursor-not-allowed group-hover:border-white/10 transition-colors">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 opacity-50">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
          </svg>
          <span>Search</span>
          <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 opacity-60">
            SOON
          </span>
        </div>
      </div>

      <div className="space-y-10">
        {NAV.map((group) => (
          <div key={group.title} className="space-y-3">
            <h4 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-700">
              {group.title}
            </h4>
            <div className="space-y-1">
              {group.links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`block px-3 py-2 text-sm font-bold tracking-tight rounded-sm transition-all duration-200 ${
                    isActive(href)
                      ? 'text-white bg-white/5 border-l-2 border-blue-600'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 pt-10 border-t border-white/5 px-2 pb-12">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-700">Community</span>
          {version && (
             <span className="text-[10px] font-black tracking-widest text-neutral-500 opacity-50">{version}</span>
          )}
        </div>
        
        <div className="space-y-4">
          <Link
            href="https://github.com/flux-run/flux"
            target="_blank"
            className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
          >
            <GitHubIcon className="w-4 h-4 opacity-50" />
            GitHub Repo
          </Link>
          <Link
            href="https://github.com/flux-run/flux/issues"
            target="_blank"
            className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
          >
             <svg className="w-4 h-4 opacity-50" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
              </svg>
            Report Issue
          </Link>
        </div>
      </div>
    </nav>
  );
}

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
  );
}

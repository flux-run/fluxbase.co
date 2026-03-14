'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    title: 'Getting Started',
    links: [
      { href: '/docs',                      label: 'Introduction'          },
      { href: '/docs/why',                  label: 'Why Flux'              },
      { href: '/docs/install',              label: 'Install CLI'           },
      { href: '/docs/quickstart',           label: 'Quickstart'            },
      { href: '/docs/concepts',             label: 'Core Concepts'         },
      { href: '/docs/execution-record',     label: 'Execution Record'      },
      { href: '/docs/tracing-model',        label: 'Tracing Model'         },
    ],
  },
  {
    title: 'Primitives',
    links: [
      { href: '/docs/functions',            label: 'Functions'             },
      { href: '/docs/database',             label: 'Database'              },
      { href: '/docs/queue',                label: 'Queue & Async Jobs'    },
      { href: '/docs/cron',                 label: 'Cron'                  },
      { href: '/docs/wasm',                 label: 'WebAssembly'           },
    ],
  },
  {
    title: 'Debugging',
    links: [
      { href: '/docs/debugging-production', label: 'Production Debugging'  },
      { href: '/docs/observability',        label: 'Observability'         },
      { href: '/docs/common-tasks',         label: 'Common Tasks'          },
      { href: '/docs/debug-incident',       label: 'Debug an incident'     },
      { href: '/docs/replay-incident',      label: 'Replay a request'      },
      { href: '/docs/inspect-mutations',    label: 'Inspect mutations'     },
      { href: '/docs/compare-executions',   label: 'Compare executions'    },
      { href: '/docs/find-regression',      label: 'Find a regression'     },
      { href: '/docs/cli',                  label: 'CLI Reference'         },
    ],
  },
  {
    title: 'Architecture',
    links: [
      { href: '/docs/architecture',         label: 'Architecture'          },
      { href: '/docs/gateway',              label: 'API Gateway'           },
      { href: '/docs/runtime',              label: 'Runtime'               },
      { href: '/docs/data-engine',          label: 'Data Engine'           },
      { href: '/docs/secrets',              label: 'Secrets'               },
    ],
  },
  {
    title: 'Production',
    links: [
      { href: '/docs/production',           label: 'Production Guide'      },
      { href: '/docs/self-hosting',         label: 'Self-Hosting'          },
      { href: '/docs/examples',             label: 'Examples'              },
    ],
  },
]

export function DocsSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/docs' ? pathname === '/docs' : pathname === href

  return (
    <nav style={{
      width: 240,
      flexShrink: 0,
      position: 'fixed',
      top: 56,
      left: 0,
      bottom: 0,
      overflowY: 'auto',
      padding: '28px 0 48px',
      borderRight: '1px solid var(--mg-border)',
      background: 'var(--mg-bg-surface)',
    }}>
      {NAV.map((group) => (
        <div key={group.title} style={{ marginBottom: 28, padding: '0 16px' }}>
          <div style={{
            fontSize: '.68rem',
            fontWeight: 700,
            letterSpacing: '.09em',
            textTransform: 'uppercase',
            color: 'var(--mg-muted)',
            marginBottom: 8,
            padding: '0 8px',
          }}>
            {group.title}
          </div>
          {group.links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '5px 8px',
                fontSize: '.875rem',
                borderRadius: 5,
                textDecoration: 'none',
                transition: 'background .12s, color .12s',
                color: isActive(href) ? 'var(--mg-text)' : 'var(--mg-muted)',
                background: isActive(href) ? 'var(--mg-accent-dim)' : 'transparent',
                fontWeight: isActive(href) ? 500 : 400,
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}

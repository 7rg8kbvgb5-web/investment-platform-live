'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    description: 'Overview and lifecycle',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: '/portfolios',
    label: 'Portfolios',
    description: 'Models, overlays and scenarios',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 14V6l7-3 7 3v8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M10 3v11M3 14l7 3 7-3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/monitoring',
    label: 'Monitoring',
    description: 'Alerts, rules and fund watch',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/research',
    label: 'Research',
    description: 'Inbox and research requests',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 4h12v12H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M7 8h6M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/fund-reviews',
    label: 'Fund Reviews',
    description: 'Decisions and audit trail',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 4h10v12H5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 8h4M8 11h4M8 14h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/investment-committee',
    label: 'Investment Committee',
    description: 'Executive priorities and health',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="13" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.5 16c.8-2.2 2.4-3.5 3.5-3.5S9.7 13.8 10.5 16M10.5 16c.8-2.2 2.4-3.5 3.5-3.5s2.7 1.3 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/governance',
    label: 'Governance',
    description: 'Approvals, deferrals and audit',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3l6 3v5c0 3.5-2.6 5.8-6 7-3.4-1.2-6-3.5-6-7V6l6-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M7.5 10l1.8 1.8L12.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">Investment Strategy Hub</div>
        <p className="brand-tagline">Adviser &amp; committee platform</p>
      </div>

      <nav className="nav" aria-label="Main navigation">
        <p className="nav-section-label">Sections</p>
        {NAV_ITEMS.map(({ href, label, description, icon }) => {
          const active = isNavItemActive(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              className={`nav-link${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="nav-link-icon">{icon}</span>
              <span className="nav-link-text">
                <span className="nav-link-label">{label}</span>
                <span className="nav-link-description">{description}</span>
              </span>
              {active ? <span className="nav-link-indicator" aria-hidden="true" /> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

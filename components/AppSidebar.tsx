'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
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
    description: 'What needs attention today',
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
    description: 'Model, risk profiles, construction, advice',
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
    description: 'Daily scan of model holdings',
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
    description: 'House views, Top Ideas, Approved List',
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
    description: 'Fund manager and structure checks',
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
    description: 'Deep dives and decisions',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="13" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.5 16c.8-2.2 2.4-3.5 3.5-3.5S9.7 13.8 10.5 16M10.5 16c.8-2.2 2.4-3.5 3.5-3.5s2.7 1.3 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/data-analytics',
    label: 'Data Analytics',
    description: 'Live market data and fundamentals',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 16V4M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 13l3-4 3 2 4-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

async function signOut() {
  await supabase.auth.signOut();
  window.location.href = '/login';
}

export default function AppSidebar() {
  const pathname = usePathname();
  if (pathname === '/login') return null;

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

      <button type="button" className="nav-link" onClick={signOut} style={signOutButton}>
        <span className="nav-link-text">
          <span className="nav-link-label">Sign out</span>
        </span>
      </button>
    </aside>
  );
}

const signOutButton = {
  marginTop: 'auto',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  width: '100%',
  textAlign: 'left' as const,
};

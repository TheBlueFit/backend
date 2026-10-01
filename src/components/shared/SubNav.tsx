"use client";
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Settings, Dumbbell, LayoutDashboard, Users, Activity,
  UserPlus, Utensils, CalendarCheck, MessageSquare,
} from 'lucide-react';

// Custom steel weight-plate icon (athlete portal)
const PlateIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22" />
  </svg>
);

const PORTALS = {
  admin: {
    Trigger: Settings,
    items: [
      { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
      { href: '/admin/onboarding', label: 'Onboarding', Icon: UserPlus },
    ],
  },
  coach: {
    Trigger: Dumbbell,
    items: [
      { href: '/coach', label: 'Dashboard', Icon: LayoutDashboard },
      { href: '/coach/clients', label: 'Client Roster', Icon: Users },
      { href: '/coach/templates', label: 'Plan Templates', Icon: Activity },
    ],
  },
  client: {
    Trigger: PlateIcon,
    items: [
      { href: '/client', label: 'Today', Icon: LayoutDashboard },
      { href: '/client/diet', label: 'Diet Plan', Icon: Utensils },
      { href: '/client/check-in', label: 'Check-In', Icon: CalendarCheck },
      { href: '/client/messages', label: 'Messages', Icon: MessageSquare },
    ],
  },
} as const;

export default function SubNav({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const path = usePathname() || '';
  const key = path.startsWith('/admin') ? 'admin'
    : path.startsWith('/coach') ? 'coach'
    : path.startsWith('/client') ? 'client'
    : null;
  if (!key) return null; // no trigger on the root entry page

  const { Trigger, items } = PORTALS[key];

  return (
    <>
      <button
        className={`nav-fab nav-fab-right ${open ? 'active' : ''}`}
        aria-label="Portal tools"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Trigger size={24} />
      </button>

      <nav className={`subnav-stack ${open ? 'open' : ''}`} aria-hidden={!open}>
        {items.map(({ href, label, Icon }, i) => (
          <Link
            key={href}
            href={href}
            tabIndex={open ? 0 : -1}
            style={{ ['--i' as string]: i } as CSSProperties}
            className={`subnav-item ${path === href ? 'current' : ''}`}
            onClick={() => setOpen(false)}
          >
            <Icon size={18} /> {label}
          </Link>
        ))}
      </nav>
    </>
  );
}

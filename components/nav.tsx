'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, FileText, EyeOff, Settings, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/', label: 'Home', icon: Shield },
  { href: '/brief', label: 'Brief', icon: FileText },
  { href: '/quiet', label: 'Quiet Log', icon: EyeOff },
  { href: '/how-it-works', label: 'How it works', icon: HelpCircle },
  { href: '/admin', label: 'Admin', icon: Settings },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-teal-600" />
          <span className="text-sm font-semibold tracking-tight text-neutral-900">
            Portfolio Watchman
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

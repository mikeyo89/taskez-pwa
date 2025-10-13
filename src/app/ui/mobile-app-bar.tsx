'use client';

import { cn } from '@/lib/utils';
import { BarChart2, Folder, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavigationItem = {
  id: 'clients' | 'services' | 'projects' | 'dashboard';
  label: string;
  href: string;
  Icon: typeof Users;
};

const NAV_ITEMS: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/', Icon: BarChart2 },
  { id: 'clients', label: 'Clients', href: '/clients', Icon: Users },
  { id: 'services', label: 'Services', href: '/services', Icon: Settings },
  { id: 'projects', label: 'Projects', href: '/projects', Icon: Folder }
];

export default function MobileAppBar() {
  const pathname = usePathname();

  return (
    <nav
      className='fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 backdrop-blur sm:hidden'
      style={{
        backgroundColor: 'color-mix(in srgb, var(--background) 94%, transparent)'
      }}
    >
      <div
        className='mx-auto flex w-full max-w-5xl items-center justify-between px-3 py-3'
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.75rem)'
        }}
      >
        {NAV_ITEMS.map(({ href, Icon, label }) => {
          const active =
            pathname === href ||
            (href !== '/' && typeof pathname === 'string' && pathname.startsWith(`${href}/`));

          return (
            <Link
              key={href}
              href={href as unknown as object}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-5 py-3 text-[0.6rem] font-medium transition-all duration-200',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
              style={
                active
                  ? {
                      backgroundColor: 'color-mix(in srgb, var(--primary) 18%, transparent)',
                      color: 'var(--primary)'
                    }
                  : {
                      backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)'
                    }
              }
            >
              <Icon className='h-[1rem] w-[1rem]' aria-hidden />
              <span className='leading-none'>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

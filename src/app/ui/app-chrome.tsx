'use client';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { ACCENT_PRESETS } from '@/lib/appearance';
import { cn } from '@/lib/utils';
import { useAppearanceStore } from '@/stores/appearance';
import {
  BarChart2,
  Bell,
  Download,
  LogOut,
  Moon,
  Palette,
  Settings,
  Sun,
  UserRound,
  WifiOff,
  X
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';
import MobileAppBar from './mobile-app-bar';
import { Toaster } from '@/components/ui/sonner';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export default function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className='relative flex min-h-[100svh] flex-col bg-background text-foreground'>
      <Toaster position='top-center' richColors closeButton />
      <InstallBanner />
      <AppHeader />
      <main
        className='flex-1 px-4 pt-4 sm:px-6'
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 5.25rem)'
        }}
      >
        {children}
      </main>
      <MobileAppBar />
    </div>
  );
}

function AppHeader() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header
      className='sticky top-0 z-30 border-b border-border/70 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur'
      style={{
        backgroundColor: 'color-mix(in srgb, var(--background) 93%, transparent)'
      }}
    >
      <div className='flex items-center justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <div className='flex h-9 w-9 items-center justify-center rounded-full border border-border/70'>
            <BarChart2 className='h-4 w-4 text-primary' aria-hidden />
          </div>
          <h1 className='text-xl font-semibold tracking-tight'>Taskez</h1>
        </div>
        <HeaderActions />
      </div>
      {!online && (
        <div
          className='mt-3 flex items-center gap-2 rounded-xl border px-4 py-2 text-sm text-warning'
          style={{
            backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
            borderColor: 'color-mix(in srgb, var(--border) 75%, transparent)'
          }}
        >
          <WifiOff className='h-4 w-4' aria-hidden />
          <span>Offline mode enabled—changes will sync later.</span>
        </div>
      )}
    </header>
  );
}

function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const safari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
    const nav = window.navigator as NavigatorWithStandalone;
    setIosHint(ios && safari && !nav.standalone);

    const onBeforeInstall = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setDeferred(event);
      setDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  if (dismissed || (!deferred && !iosHint)) {
    return null;
  }

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    setDeferred(null);
    setDismissed(true);
  };

  return (
    <div className='pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 flex justify-center px-4'>
      <div
        className='pointer-events-auto w-3/4 max-w-xl rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm'
        style={{
          backgroundColor: 'color-mix(in srgb, var(--background) 94%, transparent)',
          borderColor: 'color-mix(in srgb, var(--border) 80%, transparent)'
        }}
      >
        <div className='flex items-center gap-3'>
          <div className='flex-1 leading-snug text-xs text-muted-foreground'>
            {deferred ? (
              <span>
                Install Taskez for the best offline experience. Your workspace stays just a tap
                away.
              </span>
            ) : (
              <span>
                Add Taskez to your Home Screen via <span className='underline'>Share</span> →{' '}
                <span className='underline'>Add to Home Screen</span>.
              </span>
            )}
          </div>
          {deferred && (
            <Button variant='secondary' size='sm' onClick={handleInstall}>
              <Download className='mr-2 h-4 w-4' /> Install
            </Button>
          )}
          <button
            type='button'
            onClick={() => setDismissed(true)}
            aria-label='Dismiss install banner'
            className='rounded-full border border-transparent p-1 text-muted-foreground transition hover:border-border/70 hover:text-foreground'
          >
            <X className='h-4 w-4' aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function HeaderActions() {
  return (
    <div className='flex items-center gap-2'>
      <ThemeToggleButton />
      <ProfileDrawer />
    </div>
  );
}

function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant='ghost'
      size='icon-lg'
      className='rounded-full border font-medium transition'
      style={{
        borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--background) 88%, transparent)'
      }}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label='Toggle light or dark mode'
      disabled={!mounted}
    >
      {/* Avoid rendering theme-dependent icons until the client has mounted to prevent
          server/client hydration mismatches. Render a size-matched placeholder first. */}
      {!mounted ? (
        <span className='inline-block h-5 w-5' aria-hidden />
      ) : isDark ? (
        <Sun className='h-5 w-5' aria-hidden />
      ) : (
        <Moon className='h-5 w-5' aria-hidden />
      )}
    </Button>
  );
}

type QuickAction = {
  id: string;
  label: string;
  description: string;
  Icon: typeof Settings;
};

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'profile', label: 'Profile', description: 'View and edit your info', Icon: UserRound },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Control alerts and digests',
    Icon: Bell
  }
  // {
  //   id: 'billing',
  //   label: 'Billing',
  //   description: 'Update subscriptions and invoices',
  //   Icon: CreditCard
  // },
  // {
  //   id: 'workspaces',
  //   label: 'Workspaces',
  //   description: 'Switch to another workspace',
  //   Icon: Settings
  // },
  // { id: 'support', label: 'Support', description: 'Get help from the Taskez team', Icon: LifeBuoy }
];

function ProfileDrawer() {
  const accent = useAppearanceStore((state) => state.accent);
  const setAccent = useAppearanceStore((state) => state.setAccent);

  const accentPresets = useMemo(() => ACCENT_PRESETS, []);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant='ghost'
          size='icon-lg'
          className='rounded-full border transition'
          style={{
            borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--background) 88%, transparent)'
          }}
          aria-label='Open account menu'
        >
          <UserRound className='h-5 w-5' aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side='right'
        className='border-border backdrop-blur-sm'
        style={{
          backgroundColor: 'color-mix(in srgb, var(--background) 96%, transparent)'
        }}
      >
        <SheetHeader className='p-4 pb-2 text-left'>
          <SheetTitle className='text-lg'>Account</SheetTitle>
          <SheetDescription>Manage your profile and personalize Taskez.</SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-y-auto px-4 pb-6'>
          <section>
            <h2 className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
              Quick actions
            </h2>
            <div className='mt-3 flex flex-col gap-2'>
              {QUICK_ACTIONS.map(({ id, label, description, Icon }) => (
                <button
                  key={id}
                  type='button'
                  onClick={() => {}}
                  className='flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition'
                  style={{
                    borderColor: 'color-mix(in srgb, var(--border) 65%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--background) 92%, transparent)'
                  }}
                >
                  <span
                    className='flex h-9 w-9 items-center justify-center rounded-full text-accent-foreground'
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--accent) 18%, transparent)'
                    }}
                  >
                    <Icon className='h-4 w-4' aria-hidden />
                  </span>
                  <div className='flex-1'>
                    <p className='text-sm font-medium'>{label}</p>
                    <p className='text-xs text-muted-foreground'>{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className='mt-6'>
            <div className='flex items-center gap-2 text-sm font-medium text-muted-foreground'>
              <Palette className='h-4 w-4' aria-hidden />
              Theme accents
            </div>
            <p className='mt-1 text-xs text-muted-foreground'>
              Choose a highlight color to match your workspace mood.
            </p>
            <div className='mt-4 grid grid-cols-2 gap-2'>
              {accentPresets.map((preset) => {
                const selected = accent === preset.id;
                return (
                  <button
                    key={preset.id}
                    type='button'
                    onClick={() => setAccent(preset.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition',
                      selected ? 'border-primary text-primary-foreground' : 'border-border'
                    )}
                    style={{
                      backgroundColor: selected
                        ? 'color-mix(in srgb, var(--primary) 16%, transparent)'
                        : 'color-mix(in srgb, var(--background) 94%, transparent)',
                      borderColor: selected
                        ? 'color-mix(in srgb, var(--primary) 50%, transparent)'
                        : 'color-mix(in srgb, var(--border) 70%, transparent)'
                    }}
                  >
                    <span
                      className='h-5 w-5 rounded-full border'
                      style={{
                        backgroundColor: preset.swatch,
                        borderColor: 'color-mix(in srgb, currentColor 35%, transparent)'
                      }}
                    />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className='px-4 pb-4'>
          <Button
            variant='destructive'
            className='w-full justify-center gap-2 rounded-2xl'
            onClick={() => {}}
          >
            <LogOut className='h-4 w-4' aria-hidden />
            Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

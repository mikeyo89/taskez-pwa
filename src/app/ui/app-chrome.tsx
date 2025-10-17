'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { ACCENT_PRESETS, type AccentKey, type AccentPreset } from '@/lib/appearance';
import { auth0Config } from '@/lib/auth0';
import type { Profile } from '@/lib/models';
import { cn } from '@/lib/utils';
import { useProfile, useProfileUpdater } from '@/lib/hooks/useProfile';
import { useAppearanceStore } from '@/stores/appearance';
import { useAuth0 } from '@auth0/auth0-react';
import {
  ArrowLeft,
  BarChart2,
  Bell,
  Download,
  LogIn,
  LogOut,
  Moon,
  Pencil,
  Palette,
  Settings,
  Sun,
  UserRound,
  WifiOff,
  X
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import MobileAppBar from './mobile-app-bar';

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
          <h1 className='text-xl font-semibold tracking-tight'>Taskez PM</h1>
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

type DrawerView = 'home' | 'profile';

type ProfileFormState = {
  company_name: string;
  preferred_name: string;
  preferred_email: string;
  preferred_phone: string;
  preferred_color: AccentKey;
};

function createEmptyProfile(accent: AccentKey): ProfileFormState {
  return {
    company_name: '',
    preferred_name: '',
    preferred_email: '',
    preferred_phone: '',
    preferred_color: accent
  };
}

function ProfileDrawer() {
  const accent = useAppearanceStore((state) => state.accent);
  const setAccent = useAppearanceStore((state) => state.setAccent);
  const hydrated = useAppearanceStore((state) => state.hydrated);
  const { profile, loading: profileLoading } = useProfile();
  const { saveProfile } = useProfileUpdater();
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect, logout } = useAuth0();

  const accentPresets = useMemo(() => ACCENT_PRESETS, []);
  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState<DrawerView>('home');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accentUpdating, setAccentUpdating] = useState(false);
  const [formState, setFormState] = useState<ProfileFormState>(() => createEmptyProfile(accent));

  const handleSignIn = useCallback(() => {
    void loginWithRedirect();
  }, [loginWithRedirect]);

  const handleSignOut = useCallback(() => {
    setOpen(false);
    logout({
      logoutParams: {
        returnTo: typeof window !== 'undefined' ? window.location.origin : auth0Config.appUrl
      }
    });
  }, [logout, setOpen]);

  const resetForm = useCallback(() => {
    if (profile) {
      setFormState({
        company_name: profile.company_name,
        preferred_name: profile.preferred_name,
        preferred_email: profile.preferred_email,
        preferred_phone: profile.preferred_phone,
        preferred_color: profile.preferred_color
      });
    } else {
      setFormState(createEmptyProfile(accent));
    }
  }, [profile, accent]);

  useEffect(() => {
    if (!isEditing) {
      resetForm();
    }
  }, [resetForm, isEditing]);

  useEffect(() => {
    if (!open) {
      setActiveView('home');
      setIsEditing(false);
      setError(null);
      resetForm();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (profile?.preferred_color && profile.preferred_color !== accent) {
      setAccent(profile.preferred_color);
    }
  }, [accent, hydrated, profile?.preferred_color, setAccent]);

  const handleFormChange = useCallback(<K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleNavigateProfile = useCallback(() => {
    setActiveView('profile');
  }, []);

  const handleStartEdit = useCallback(() => {
    setError(null);
    setIsEditing(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setError(null);
    resetForm();
  }, [resetForm]);

  const handleBack = useCallback(() => {
    if (isEditing) {
      setIsEditing(false);
      setError(null);
      resetForm();
    }
    setActiveView('home');
  }, [isEditing, resetForm]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await saveProfile(formState);
      setAccent(updated.preferred_color);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save profile', err);
      setError(err instanceof Error ? err.message : 'Unable to save profile');
    } finally {
      setSaving(false);
    }
  }, [formState, saveProfile, setAccent]);

  const handleAccentSelect = useCallback(
    async (nextAccent: AccentKey) => {
      if (nextAccent === accent && profile?.preferred_color === nextAccent) {
        return;
      }
      const previousAccent = accent;
      setAccent(nextAccent);
      setAccentUpdating(true);
      try {
        await saveProfile({ preferred_color: nextAccent });
      } catch (err) {
        console.error('Failed to update preferred color', err);
        setAccent(previousAccent);
      } finally {
        setAccentUpdating(false);
      }
    },
    [accent, profile?.preferred_color, saveProfile, setAccent]
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
        <div className='flex h-full flex-col'>
          {activeView === 'home' ? (
            <SheetHeader className='p-4 pb-2 text-left'>
              <SheetTitle className='text-lg'>Account</SheetTitle>
              <SheetDescription>Manage your profile and personalize Taskez.</SheetDescription>
            </SheetHeader>
          ) : (
            <div className='p-4 pb-2'>
              <div className='flex items-center justify-between gap-2'>
                <button
                  type='button'
                  onClick={handleBack}
                  className='rounded-full border border-border/70 p-2 text-muted-foreground transition hover:border-border hover:text-foreground disabled:opacity-60'
                  aria-label='Back to account overview'
                  disabled={saving}
                >
                  <ArrowLeft className='h-4 w-4' aria-hidden />
                </button>
                {!isEditing && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='rounded-full border border-border/70 text-muted-foreground transition hover:border-border hover:text-foreground'
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)'
                    }}
                    onClick={handleStartEdit}
                    disabled={profileLoading}
                    aria-label='Edit profile details'
                  >
                    <Pencil className='h-4 w-4' aria-hidden />
                  </Button>
                )}
              </div>
              <div className='mt-4 text-left'>
                <SheetTitle className='text-lg leading-tight'>Profile</SheetTitle>
                <SheetDescription className='mt-1'>
                  Keep your workspace details up to date.
                </SheetDescription>
              </div>
            </div>
          )}

          <div className='relative flex-1 overflow-hidden'>
            <div
              className='grid h-full w-[200%] grid-cols-2 transition-transform duration-500 ease-in-out'
              style={{ transform: activeView === 'profile' ? 'translateX(-50%)' : 'translateX(0%)' }}
            >
              <HomePanel
                accent={accent}
                accentPresets={accentPresets}
                onAccentSelect={handleAccentSelect}
                onNavigateProfile={handleNavigateProfile}
                accentUpdating={accentUpdating}
                isAuthenticated={isAuthenticated}
                authLoading={authLoading}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
              />
              <ProfilePanel
                accentPresets={accentPresets}
                formState={formState}
                onFormChange={handleFormChange}
                isEditing={isEditing}
                onCancelEdit={handleCancelEdit}
                onSave={handleSave}
                saving={saving}
                error={error}
                profile={profile}
                loading={profileLoading}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type HomePanelProps = {
  accent: AccentKey;
  accentPresets: AccentPreset[];
  onAccentSelect: (accent: AccentKey) => void | Promise<void>;
  onNavigateProfile: () => void;
  accentUpdating: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
};

function HomePanel({
  accent,
  accentPresets,
  onAccentSelect,
  onNavigateProfile,
  accentUpdating,
  isAuthenticated,
  authLoading,
  onSignIn,
  onSignOut
}: HomePanelProps) {
  return (
    <div className='flex h-full flex-col overflow-y-auto px-4 pb-6 pt-2'>
      <section>
        <h2 className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>Quick actions</h2>
        <div className='mt-3 flex flex-col gap-2'>
          {QUICK_ACTIONS.map(({ id, label, description, Icon }) => {
            const isProfile = id === 'profile';
            return (
              <button
                key={id}
                type='button'
                onClick={isProfile ? onNavigateProfile : undefined}
                className='flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition hover:border-border hover:shadow-sm'
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
            );
          })}
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
        <div className='mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3'>
          {accentPresets.map((preset) => {
            const selected = accent === preset.id;
            return (
              <AccentOptionButton
                key={preset.id}
                preset={preset}
                selected={selected}
                onSelect={onAccentSelect}
                disabled={accentUpdating && !selected}
                trailing={
                  accentUpdating && selected ? (
                    <Spinner className='h-4 w-4 text-current' aria-hidden />
                  ) : null
                }
              />
            );
          })}
        </div>
      </section>

      <div
        className='mt-auto pt-6'
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <Button
          type='button'
          variant={isAuthenticated ? 'destructive' : 'default'}
          className={cn(
            'w-full justify-center gap-2 rounded-2xl text-base font-semibold transition',
            !isAuthenticated && 'hover:opacity-95'
          )}
          style={
            isAuthenticated
              ? undefined
              : {
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-foreground)'
                }
          }
          onClick={isAuthenticated ? onSignOut : onSignIn}
          disabled={authLoading}
          aria-busy={authLoading}
        >
          {authLoading ? (
            <Spinner className='h-4 w-4 text-current' aria-hidden />
          ) : isAuthenticated ? (
            <LogOut className='h-4 w-4' aria-hidden />
          ) : (
            <LogIn className='h-4 w-4' aria-hidden />
          )}
          {authLoading ? 'Please wait…' : isAuthenticated ? 'Sign out' : 'Sign in'}
        </Button>
      </div>
    </div>
  );
}

type AccentOptionButtonProps = {
  preset: AccentPreset;
  selected: boolean;
  onSelect: (accent: AccentKey) => void | Promise<void>;
  disabled?: boolean;
  trailing?: ReactNode;
};

function AccentOptionButton({ preset, selected, onSelect, disabled, trailing }: AccentOptionButtonProps) {
  return (
    <button
      type='button'
      onClick={() => onSelect(preset.id)}
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
      disabled={disabled}
      aria-pressed={selected}
    >
      <span
        className='h-5 w-5 rounded-full border'
        style={{
          backgroundColor: preset.swatch,
          borderColor: 'color-mix(in srgb, currentColor 35%, transparent)'
        }}
      />
      <span className='flex-1 text-left'>{preset.label}</span>
      {trailing}
    </button>
  );
}

type ProfilePanelProps = {
  accentPresets: AccentPreset[];
  formState: ProfileFormState;
  onFormChange: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  profile: Profile | null;
  loading: boolean;
};

function ProfilePanel({
  accentPresets,
  formState,
  onFormChange,
  isEditing,
  onCancelEdit,
  onSave,
  saving,
  error,
  profile,
  loading
}: ProfilePanelProps) {
  const selectedColor = profile?.preferred_color ?? formState.preferred_color;
  const colorPreset = accentPresets.find((preset) => preset.id === selectedColor);

  return (
    <div className='flex h-full flex-col overflow-hidden px-4 pb-6 pt-2'>
      <div className='mt-4 flex-1 overflow-y-auto'>
        {loading ? (
          <div className='flex h-full items-center justify-center'>
            <Spinner className='h-6 w-6 text-muted-foreground' />
          </div>
        ) : isEditing ? (
          <form className='flex flex-col gap-4 pb-2' onSubmit={(event) => event.preventDefault()}>
            <div className='space-y-1'>
              <Label htmlFor='profile-company'>Company name</Label>
              <Input
                id='profile-company'
                value={formState.company_name}
                onChange={(event) => onFormChange('company_name', event.target.value)}
                placeholder='Taskez Inc.'
                autoComplete='organization'
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='profile-preferred-name'>Preferred name</Label>
              <Input
                id='profile-preferred-name'
                value={formState.preferred_name}
                onChange={(event) => onFormChange('preferred_name', event.target.value)}
                placeholder='Jordan'
                autoComplete='name'
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='profile-email'>Preferred email</Label>
              <Input
                id='profile-email'
                type='email'
                value={formState.preferred_email}
                onChange={(event) => onFormChange('preferred_email', event.target.value)}
                placeholder='jordan@taskez.com'
                autoComplete='email'
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='profile-phone'>Preferred phone</Label>
              <Input
                id='profile-phone'
                value={formState.preferred_phone}
                onChange={(event) => onFormChange('preferred_phone', event.target.value)}
                placeholder='(555) 123-4567'
                autoComplete='tel'
              />
            </div>
            <div>
              <p className='text-sm font-medium'>Preferred color</p>
              <p className='text-xs text-muted-foreground'>Used to highlight interface accents.</p>
              <div className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3'>
                {accentPresets.map((preset) => {
                  const selected = formState.preferred_color === preset.id;
                  return (
                    <AccentOptionButton
                      key={preset.id}
                      preset={preset}
                      selected={selected}
                      onSelect={(accentId) => onFormChange('preferred_color', accentId)}
                      trailing={
                        selected ? (
                          <span className='text-xs uppercase tracking-wide text-muted-foreground'>Selected</span>
                        ) : null
                      }
                    />
                  );
                })}
              </div>
            </div>
          </form>
        ) : (
          <div className='flex flex-col gap-5 pb-2'>
            <ProfileField label='Company name'>
              {profile?.company_name ? (
                profile.company_name
              ) : (
                <span className='text-muted-foreground'>Add your company name</span>
              )}
            </ProfileField>
            <ProfileField label='Preferred name'>
              {profile?.preferred_name ? (
                profile.preferred_name
              ) : (
                <span className='text-muted-foreground'>Share what you like to be called</span>
              )}
            </ProfileField>
            <ProfileField label='Preferred email'>
              {profile?.preferred_email ? (
                <a href={`mailto:${profile.preferred_email}`} className='underline-offset-4 hover:underline'>
                  {profile.preferred_email}
                </a>
              ) : (
                <span className='text-muted-foreground'>Add an email for notifications</span>
              )}
            </ProfileField>
            <ProfileField label='Preferred phone'>
              {profile?.preferred_phone ? (
                profile.preferred_phone
              ) : (
                <span className='text-muted-foreground'>Add a phone number</span>
              )}
            </ProfileField>
            <ProfileField label='Preferred color'>
              <div className='flex items-center gap-3'>
                <span
                  className='h-5 w-5 rounded-full border'
                  style={{
                    backgroundColor: colorPreset?.swatch ?? 'var(--accent)',
                    borderColor: 'color-mix(in srgb, currentColor 35%, transparent)'
                  }}
                />
                <span>{colorPreset?.label ?? 'Match workspace accent'}</span>
              </div>
            </ProfileField>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className='mt-4 flex flex-col gap-2'>
          {error ? <p className='text-sm text-destructive'>{error}</p> : null}
          <div className='flex gap-2'>
            <Button variant='outline' className='flex-1' onClick={onCancelEdit} disabled={saving}>
              Cancel
            </Button>
            <Button className='flex-1' onClick={onSave} disabled={saving}>
              {saving ? (
                <span className='flex items-center justify-center gap-2'>
                  <Spinner className='h-4 w-4 text-primary-foreground' />
                  Saving
                </span>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProfileField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>{label}</p>
      <div className='mt-1 text-sm text-foreground'>{children}</div>
    </div>
  );
}

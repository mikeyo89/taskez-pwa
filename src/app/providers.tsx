'use client';

import { Auth0Provider } from '@auth0/auth0-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { auth0Config } from '@/lib/auth0';
import { useAppearanceStore } from '@/stores/appearance';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

function AccentHydrator() {
  const hydrate = useAppearanceStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}

function HashRouterBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { hash, origin } = window.location;
    if (!hash || !hash.startsWith('#/')) return;

    try {
      const targetUrl = new URL(hash.slice(1), origin);
      const targetPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
      const currentSearch = searchParams.toString();
      const currentPath = `${pathname}${currentSearch ? `?${currentSearch}` : ''}`;

      window.history.replaceState(null, '', targetPath);
      if (targetPath !== currentPath) {
        const typedTargetPath = targetPath as Parameters<typeof router.replace>[0];
        router.replace(typedTargetPath);
      }
    } catch (error) {
      console.warn('Failed to process deep-link hash redirect', error);
    }
  }, [pathname, router, searchParams]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const { audience, appUrl, clientId, domain } = auth0Config;
  const [client] = useState(() => new QueryClient());
  const redirectUri = useMemo(
    () => (typeof window !== 'undefined' ? window.location.origin : appUrl),
    [appUrl]
  );

  const authorizationParams = useMemo(() => {
    const params: {
      redirect_uri: string;
      audience?: string;
    } = {
      redirect_uri: redirectUri
    };

    if (audience) {
      params.audience = audience;
    }

    return params;
  }, [audience, redirectUri]);

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={authorizationParams}
      cacheLocation='localstorage'
      useRefreshTokens
    >
      <ThemeProvider attribute='class' defaultTheme='dark' enableSystem disableTransitionOnChange>
        <QueryClientProvider client={client}>
          <Suspense fallback={null}>
            <HashRouterBridge />
          </Suspense>
          <AccentHydrator />
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </Auth0Provider>
  );
}

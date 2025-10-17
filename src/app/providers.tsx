'use client';

import { Auth0Provider } from '@auth0/auth0-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';
import { auth0Config } from '@/lib/auth0';
import { useAppearanceStore } from '@/stores/appearance';

function AccentHydrator() {
  const hydrate = useAppearanceStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
          <AccentHydrator />
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </Auth0Provider>
  );
}

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import { useAppearanceStore } from '@/stores/appearance';

function AccentHydrator() {
  const hydrate = useAppearanceStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute='class' defaultTheme='dark' enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <AccentHydrator />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}

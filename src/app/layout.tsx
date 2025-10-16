import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';
import AppChrome from './ui/app-chrome';
const IS_PROD = process.env.IS_PROD === 'true';

export const metadata: Metadata = {
  title: 'Taskez PM',
  manifest: IS_PROD ? 'app.webmanifest' : '/manifest.json'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0ea5e9'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' data-accent='sky' suppressHydrationWarning>
      <body className='min-h-[100svh] bg-background text-foreground antialiased'>
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}

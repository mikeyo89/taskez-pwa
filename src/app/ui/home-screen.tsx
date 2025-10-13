'use client';

import { motion } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Plus, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function HomeScreen() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return (
    <div className='min-h-[100svh] flex flex-col'>
      <header className='px-4 pt-safe pb-2 sticky top-0 z-10 bg-neutral-950/70 backdrop-blur border-b border-neutral-800'>
        <div className='flex items-center justify-between'>
          <h1 className='text-lg font-semibold tracking-tight'>Taskez</h1>
          <InstallBanner />
        </div>
        {!online && (
          <div className='mt-2 flex items-center gap-2 text-amber-300 text-sm'>
            <WifiOff className='h-4 w-4' />
            <span>Offline mode enabled—changes will sync later.</span>
          </div>
        )}
      </header>

      <main className='flex-1 p-4 grid gap-3'>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className='grid grid-cols-2 gap-3 sm:grid-cols-3'
        >
          <Card className='p-4'>Recent Items</Card>
          <Card className='p-4'>My Tasks</Card>
          <Card className='p-4'>Notifications</Card>
          <Card className='p-4 col-span-2 sm:col-span-1'>Insights</Card>
        </motion.div>
      </main>

      <footer className='pb-safe pt-2 px-4 border-t border-neutral-800 bg-neutral-950'>
        <div className='flex justify-end'>
          <Button className='rounded-full h-12 w-12 p-0'>
            <Plus className='h-5 w-5' />
          </Button>
        </div>
      </footer>
    </div>
  );
}

// Chrome/Edge install prompt + iOS helper
function InstallBanner() {
  const [deferred, setDeferred] = useState<any>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    setIosHint(isIos && isSafari && !('standalone' in navigator && (navigator as any).standalone));

    const onBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  if (deferred) {
    return (
      <Button variant='secondary' size='sm' onClick={() => deferred.prompt()}>
        <Download className='h-4 w-4 mr-2' /> Install
      </Button>
    );
  }

  if (iosHint) {
    return (
      <div className='text-xs text-neutral-300'>
        Add to Home Screen via <span className='underline'>Share</span> →{' '}
        <span className='underline'>Add to Home Screen</span>
      </div>
    );
  }

  return null;
}

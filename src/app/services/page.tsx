'use client';

import { motion } from 'motion/react';

import { useLiveServices } from '@/lib/hooks/useLiveServices';
import { ServicesTable } from './data-table';
import { AddServiceDialog } from './form';

export default function ServicesPage() {
  const { data, loading } = useLiveServices();
  return (
    <div className='flex flex-col gap-6'>
      {/* <section
        className='flex items-center gap-3 rounded-2xl border px-4 py-3'
        style={{
          borderColor: 'color-mix(in srgb, var(--border) 75%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--background) 92%, transparent)'
        }}
      >
        <div
          className='flex h-10 w-10 items-center justify-center rounded-full text-primary-foreground'
          style={{
            backgroundColor: 'color-mix(in srgb, var(--primary) 20%, transparent)'
          }}
        >
          <Settings className='h-5 w-5' aria-hidden />
        </div>
        <div>
          <h1 className='text-lg font-semibold tracking-tight'>Services</h1>
          <p className='text-sm text-muted-foreground'>What makes your clients come back?</p>
        </div>
      </section> */}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className='grid gap-3'
      >
        <ServicesTable data={data} loading={loading} />
        <div className='mt-auto flex justify-end'>
          <AddServiceDialog />
        </div>
      </motion.div>
    </div>
  );
}

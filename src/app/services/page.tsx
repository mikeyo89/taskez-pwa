'use client';

import { Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/card';

export default function ServicesPage() {
  return (
    <div className='flex flex-col gap-6'>
      <section
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
          <p className='text-sm text-muted-foreground'>
            Define offerings and automation workflows.
          </p>
        </div>
      </section>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className='grid gap-3'
      >
        <Card
          className='border border-dashed px-6'
          style={{ borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)' }}
        >
          <div className='text-sm text-muted-foreground'>
            Create reusable playbooks and templates for your team&apos;s client services.
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

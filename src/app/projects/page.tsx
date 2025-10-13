'use client';

import { Folder } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/card';

export default function ProjectsPage() {
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
          <Folder className='h-5 w-5' aria-hidden />
        </div>
        <div>
          <h1 className='text-lg font-semibold tracking-tight'>Projects</h1>
          <p className='text-sm text-muted-foreground'>
            Track execution and delivery milestones.
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
            Projects will populate as soon as you create them from any client record.
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

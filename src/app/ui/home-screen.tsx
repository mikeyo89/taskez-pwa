'use client';

import { motion } from 'motion/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function HomeScreen() {
  return (
    <div className='flex flex-col gap-6'>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className='grid grid-cols-2 gap-3 sm:grid-cols-3'
      >
        <Card className='p-4'>Recent Items</Card>
        <Card className='p-4'>Pinned Projects</Card>
        <Card className='p-4 sm:col-span-1 col-span-2'>Upcoming Deadlines</Card>
      </motion.div>

      <div className='mt-auto flex justify-end'>
        <Button
          variant='default'
          size='icon-lg'
          className='rounded-full shadow-lg'
          style={{
            boxShadow: '0 10px 30px -15px color-mix(in srgb, var(--primary) 55%, transparent)'
          }}
          aria-label='Create new record'
        >
          <Plus className='h-5 w-5' aria-hidden />
        </Button>
      </div>
    </div>
  );
}

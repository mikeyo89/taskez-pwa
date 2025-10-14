'use client';

import { Card } from '@/components/ui/card';
import { motion } from 'motion/react';

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
    </div>
  );
}

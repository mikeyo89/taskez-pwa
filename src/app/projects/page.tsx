'use client';
import { motion } from 'motion/react';

import { useLiveClients } from '@/lib/hooks/useLiveClients';
import { useLiveProjects } from '@/lib/hooks/useLiveProjects';
import { ProjectsTable } from './data-table';
import { AddProjectDialog } from './form';

export default function ProjectsPage() {
  const { data: projects, loading } = useLiveProjects();
  const { data: clients } = useLiveClients();

  return (
    <div className='flex flex-col gap-6 pb-28'>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className='grid gap-3'
      >
        <ProjectsTable data={projects} clients={clients} loading={loading} />
      </motion.div>

      <AddProjectDialog clients={clients} />
    </div>
  );
}

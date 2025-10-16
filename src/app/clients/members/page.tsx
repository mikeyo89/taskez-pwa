'use client';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { getClient } from '@/lib/actions/clients';
import { useClientMembersQuery } from '@/lib/hooks/useClientMembersQuery';
import { useMemberFiltersStore } from '@/stores/member-filters';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { MembersTable } from './data-table';
import { CreateMemberDialog } from './forms';

export default function ClientMembersPage() {
  return (
    <Suspense
      fallback={
        <div className='flex min-h-[60vh] items-center justify-center'>
          <Spinner className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      }
    >
      <ClientMembersContent />
    </Suspense>
  );
}

function ClientMembersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const resetFilters = useMemberFiltersStore((state) => state.reset);

  const clientId = searchParams.get('clientId') ?? '';

  useEffect(() => {
    resetFilters();
    return () => resetFilters();
  }, [clientId, resetFilters]);

  const clientQuery = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId),
    enabled: Boolean(clientId)
  });

  const membersQuery = useClientMembersQuery(clientId);

  if (!clientId) {
    return (
      <div className='flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center'>
        <p className='text-lg font-semibold text-foreground'>Missing client identifier</p>
        <Button variant='outline' onClick={() => router.push('/clients')}>
          Go back to clients
        </Button>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6 pb-32'>
      <header>
        <div
          className='flex items-center gap-3 rounded-2xl border px-4 py-3'
          style={{
            borderColor: 'color-mix(in srgb, var(--border) 75%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--background) 92%, transparent)'
          }}
        >
          <Button
            size='icon'
            onClick={() => router.push('/clients')}
            aria-label='Back to clients'
            className='h-10 w-10 rounded-full text-primary transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
            style={{
              backgroundColor: 'color-mix(in srgb, var(--primary) 20%, transparent)'
            }}
          >
            <ArrowLeft className='h-4 w-4' aria-hidden />
          </Button>
          <div>
            <h1 className='text-lg font-semibold tracking-tight'>
              {clientQuery.isLoading ? (
                <span className='flex items-center gap-2 text-sm font-normal text-muted-foreground'>
                  <Spinner className='h-4 w-4' />
                  Loading…
                </span>
              ) : clientQuery.data ? (
                clientQuery.data.name
              ) : (
                'Client'
              )}
            </h1>
            <p className='text-sm text-muted-foreground'>Manage members for this client.</p>
          </div>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className='grid gap-3'
      >
        <MembersTable data={membersQuery.data ?? []} loading={membersQuery.isLoading} />
      </motion.div>

      <div
        className='fixed z-[45]'
        style={{
          right: 'calc(env(safe-area-inset-right, 0px) + 1.5rem)',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 7rem)'
        }}
      >
        <Button
          size='icon-lg'
          className='rounded-full shadow-lg'
          aria-label='Add member'
          onClick={() => setCreateOpen(true)}
          style={{
            boxShadow: '0 10px 30px -15px color-mix(in srgb, var(--primary) 55%, transparent)'
          }}
        >
          <Plus className='h-5 w-5' aria-hidden />
        </Button>
      </div>

      <CreateMemberDialog clientId={clientId} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

'use client';

import { Loader2 } from 'lucide-react';

import type { ProjectEvent } from '@/lib/models';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

type ProjectEventsTabProps = {
  events: ProjectEvent[];
  loading?: boolean;
};

export function ProjectEventsTab({ events, loading = false }: ProjectEventsTabProps) {
  if (loading) {
    return (
      <div className='flex h-32 items-center justify-center gap-3 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' />
        Loading events…
      </div>
    );
  }

  if (!events.length) {
    return <p className='text-sm text-muted-foreground'>No activity recorded for this project yet.</p>;
  }

  return (
    <ul className='space-y-3'>
      {events.map((event) => (
        <li
          key={event.id}
          className='rounded-lg border border-border/60 bg-card/50 p-3'
          style={{
            borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)'
          }}
        >
          <div className='flex items-center justify-between gap-3'>
            <span className='text-sm font-semibold text-foreground'>{event.reason}</span>
            <time className='text-xs text-muted-foreground'>{formatDate(event.updated_at)}</time>
          </div>
          {event.notes && <p className='mt-2 text-sm text-muted-foreground'>{event.notes}</p>}
        </li>
      ))}
    </ul>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

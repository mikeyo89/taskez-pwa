'use client';

import { Fragment, type ReactNode } from 'react';
import { ArrowLeft, CalendarDays, MoreHorizontal, Pencil, Printer, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import type { ProjectServiceWithChildren } from '@/lib/actions/projects';

import { ProjectServiceUnitsSection } from './project-service-units-section';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const statusLabels: Array<{
  key: 'approved' | 'completed' | 'paid';
  label: string;
  flag: keyof Pick<ProjectServiceWithChildren, 'approved_ind' | 'completed_ind' | 'paid_ind'>;
  date: keyof Pick<ProjectServiceWithChildren, 'approved_date' | 'completed_date' | 'paid_date'>;
}> = [
  { key: 'approved', label: 'Approved', flag: 'approved_ind', date: 'approved_date' },
  { key: 'completed', label: 'Completed', flag: 'completed_ind', date: 'completed_date' },
  { key: 'paid', label: 'Paid', flag: 'paid_ind', date: 'paid_date' }
];

type ProjectServiceDetailPanelProps = {
  service: ProjectServiceWithChildren | null;
  serviceName?: string;
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint?: () => void;
};

export function ProjectServiceDetailPanel({
  service,
  serviceName,
  open,
  loading = false,
  onClose,
  onEdit,
  onDelete,
  onPrint
}: ProjectServiceDetailPanelProps) {
  return (
    <motion.aside
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: open ? 0 : '100%', opacity: open ? 1 : 0 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className='fixed inset-y-0 right-0 z-50 w-full max-w-2xl border-l border-border/60 bg-background shadow-xl'
      role='dialog'
      aria-modal='true'
      aria-labelledby='project-service-detail-title'
    >
      <div className='flex h-full flex-col'>
        <header className='flex items-center justify-between gap-3 border-b border-border/60 px-6 py-4'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='gap-2'
            onClick={onClose}
          >
            <ArrowLeft className='h-4 w-4' />
            Back to services
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className='h-8 w-8'
                aria-label='Service actions'
                disabled={!service}
              >
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' sideOffset={8} className='w-44'>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  if (!service) return;
                  onPrint?.();
                }}
                disabled={!service}
              >
                <Printer className='h-4 w-4' />
                Print
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  if (!service) return;
                  onEdit();
                }}
                disabled={!service}
              >
                <Pencil className='h-4 w-4' />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant='destructive'
                onSelect={(event) => {
                  event.preventDefault();
                  if (!service) return;
                  onDelete();
                }}
                disabled={!service}
              >
                <Trash2 className='h-4 w-4' />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className='flex-1 overflow-y-auto px-6 py-6'>
          {loading ? (
            <div className='flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground'>
              <Spinner className='h-5 w-5 animate-spin text-primary' />
              Loading service…
            </div>
          ) : service ? (
            <div className='space-y-6'>
              <section className='space-y-3'>
                <div className='space-y-1'>
                  <h2 id='project-service-detail-title' className='text-xl font-semibold tracking-tight'>
                    {serviceName ?? 'Service details'}
                  </h2>
                  <p className='text-sm text-muted-foreground'>
                    Review this service&apos;s budget, status and units in one place.
                  </p>
                </div>

                <div className='grid gap-4 rounded-2xl border border-border/60 bg-muted/10 p-4'>
                  <dl className='grid gap-2 text-sm'>
                    <DetailRow label='Budget'>
                      {formatBudget(service.budget_amount, service.budget_type)}
                    </DetailRow>
                    <DetailRow label='Estimated completion'>
                      {formatDate(service.est_completion_date)}
                    </DetailRow>
                    <DetailRow label='Units tracked'>
                      {service.units.length}{' '}
                      unit{service.units.length === 1 ? '' : 's'}
                    </DetailRow>
                  </dl>

                  <Separator />

                  <div className='flex flex-wrap gap-3'>
                    {statusLabels.map((item) => {
                      const enabled = Boolean(service[item.flag]);
                      const dateValue = service[item.date];
                      return (
                        <StatusPill key={item.key} active={enabled} label={item.label} date={dateValue} />
                      );
                    })}
                  </div>
                </div>
              </section>

              <section>
                <ProjectServiceUnitsSection
                  projectServiceId={service.id}
                  serviceName={serviceName ?? undefined}
                />
              </section>
            </div>
          ) : (
            <div className='flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground'>
              We couldn&apos;t find the selected service.
              <Button type='button' variant='ghost' size='sm' onClick={onClose}>
                Go back
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

type DetailRowProps = {
  label: string;
  children: ReactNode;
};

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <Fragment>
      <dt className='text-xs font-semibold uppercase text-muted-foreground'>{label}</dt>
      <dd className='text-sm text-foreground'>{children}</dd>
    </Fragment>
  );
}

type StatusPillProps = {
  active: boolean;
  label: string;
  date?: string;
};

function StatusPill({ active, label, date }: StatusPillProps) {
  return (
    <div
      className='flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-semibold text-muted-foreground'
      data-active={active}
    >
      <span className={active ? 'text-primary' : 'text-muted-foreground/70'}>{label}</span>
      {active && date && (
        <span className='flex items-center gap-1 text-muted-foreground/80'>
          <CalendarDays className='h-3 w-3 opacity-80' />
          {formatDate(date)}
        </span>
      )}
    </div>
  );
}

function formatBudget(amount: number, type: ProjectServiceWithChildren['budget_type']) {
  if (type === 'percent') {
    return `${amount}%`;
  }
  return currencyFormatter.format(amount);
}

function formatDate(value?: string) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

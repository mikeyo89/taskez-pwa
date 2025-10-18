'use client';

import type { ReactNode } from 'react';
import { ArrowLeft, MoreHorizontal, Pencil, Send, Trash2 } from 'lucide-react';
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
import type { ProjectBillableWithUnits } from '@/lib/actions/projects';
import { cn } from '@/lib/utils';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

type ProjectBillableDetailPanelProps = {
  billable: ProjectBillableWithUnits | null;
  serviceLookup: Map<string, string>;
  open: boolean;
  loading?: boolean;
  pending?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSend?: () => void;
};

export function ProjectBillableDetailPanel({
  billable,
  serviceLookup,
  open,
  loading = false,
  pending = false,
  onClose,
  onEdit,
  onDelete,
  onSend
}: ProjectBillableDetailPanelProps) {
  const units = billable?.units ?? [];
  const totalDollarAmount = units
    .filter((unit) => unit.budget_type === 'dollar')
    .reduce((sum, unit) => sum + unit.budget_amount, 0);

  return (
    <motion.aside
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: open ? 0 : '100%', opacity: open ? 1 : 0 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className='fixed inset-y-0 right-0 z-50 w-full max-w-2xl border-l border-border/60 bg-background shadow-xl'
      role='dialog'
      aria-modal='true'
      aria-labelledby='project-billable-detail-title'
    >
      <div className='flex h-full flex-col'>
        <header className='flex items-center justify-between gap-3 border-b border-border/60 px-6 py-4'>
          <Button type='button' variant='ghost' size='sm' className='gap-2' onClick={onClose}>
            <ArrowLeft className='h-4 w-4' />
            Back to billables
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                className='h-8 w-8'
                aria-label='Billable actions'
                disabled={!billable || pending}
              >
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' sideOffset={8} className='w-44'>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  if (!billable || pending) return;
                  onSend?.();
                }}
                className='gap-2'
                disabled={!billable || pending}
              >
                <Send className='h-4 w-4' />
                Send…
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  if (!billable || pending) return;
                  onEdit();
                }}
                className='gap-2'
                disabled={!billable || pending}
              >
                <Pencil className='h-4 w-4' />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant='destructive'
                onSelect={(event) => {
                  event.preventDefault();
                  if (!billable || pending) return;
                  onDelete();
                }}
                className='gap-2'
                disabled={!billable || pending}
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
              Loading billable…
            </div>
          ) : billable ? (
            <div className='space-y-6'>
              <section className='space-y-3'>
                <div className='space-y-1'>
                  <h2 id='project-billable-detail-title' className='text-xl font-semibold tracking-tight capitalize'>
                    {billable.billable_type} details
                  </h2>
                  <p className='text-sm text-muted-foreground'>
                    Review the grouped service units, status, and key dates for this billable.
                  </p>
                </div>

                <div className='grid gap-4 rounded-2xl border border-border/60 bg-muted/10 p-4'>
                  <dl className='grid gap-2 text-sm'>
                    <DetailRow label='Billable type'>
                      <span className='capitalize'>{billable.billable_type}</span>
                    </DetailRow>
                    <DetailRow label='Units included'>
                      {units.length} unit{units.length === 1 ? '' : 's'}
                    </DetailRow>
                    <DetailRow label='Total amount'>
                      {totalDollarAmount > 0 ? currencyFormatter.format(totalDollarAmount) : '—'}
                    </DetailRow>
                    <DetailRow label='Last updated'>
                      {formatDate(billable.updated_at)}
                    </DetailRow>
                  </dl>

                  <Separator />

                  <div className='flex flex-wrap gap-3'>
                    <StatusPill
                      label='Approved'
                      active={billable.approved_ind}
                      date={billable.approved_date}
                    />
                    <StatusPill
                      label='Completed'
                      active={billable.completed_ind}
                      date={billable.completed_date}
                    />
                    <StatusPill label='Paid' active={billable.paid_ind} date={billable.paid_date} />
                  </div>
                </div>
              </section>

              <section className='space-y-3'>
                <div>
                  <h3 className='text-base font-semibold leading-tight'>Included service units</h3>
                  <p className='text-sm text-muted-foreground'>
                    Each unit keeps its original service assignment for billing clarity.
                  </p>
                </div>

                {units.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>
                    No service units are currently assigned to this billable.
                  </p>
                ) : (
                  <ul className='space-y-3'>
                    {units.map((unit) => {
                      const serviceName =
                        unit.service_name ??
                        (unit.service_id ? serviceLookup.get(unit.service_id) ?? 'Service' : 'Service');
                      return (
                        <li
                          key={unit.id}
                          className='rounded-xl border border-border/60 bg-background px-4 py-3 shadow-sm'
                        >
                          <div className='flex flex-col gap-1'>
                            <p className='text-sm font-semibold text-foreground'>{unit.title}</p>
                            <p className='text-xs text-muted-foreground'>
                              {serviceName}
                              {unit.est_completion_date
                                ? ` · Est. due ${formatDate(unit.est_completion_date)}`
                                : ''}
                            </p>
                            <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
                              <DetailChip label='Budget'>
                                {unit.budget_type === 'percent'
                                  ? `${unit.budget_amount}%`
                                  : currencyFormatter.format(unit.budget_amount)}
                              </DetailChip>
                              {unit.approved_ind && (
                                <DetailChip label='Approved'>
                                  {formatDate(unit.approved_date)}
                                </DetailChip>
                              )}
                              {unit.completed_ind && (
                                <DetailChip label='Completed'>
                                  {formatDate(unit.completed_date)}
                                </DetailChip>
                              )}
                              {unit.paid_ind && (
                                <DetailChip label='Paid'>{formatDate(unit.paid_date)}</DetailChip>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          ) : (
            <div className='flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground'>
              We couldn&apos;t find the selected billable.
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
    <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
      <dt className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>{label}</dt>
      <dd className='text-sm text-foreground'>{children}</dd>
    </div>
  );
}

type StatusPillProps = {
  label: string;
  active: boolean;
  date?: string | null;
};

function StatusPill({ label, active, date }: StatusPillProps) {
  const formatted = active && date ? formatDate(date) : null;

  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        active
          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-border/60 bg-muted text-muted-foreground'
      )}
    >
      <span className='flex items-center gap-1'>
        <span className='h-1.5 w-1.5 rounded-full bg-current opacity-70' aria-hidden />
        {label}
      </span>
      {formatted && <span className='text-[11px] font-normal opacity-70'>({formatted})</span>}
    </span>
  );
}

type DetailChipProps = {
  label: string;
  children: ReactNode;
};

function DetailChip({ label, children }: DetailChipProps) {
  return (
    <span className='inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/60 px-2 py-0.5'>
      <span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
        {label}
      </span>
      <span className='text-xs text-foreground'>{children}</span>
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

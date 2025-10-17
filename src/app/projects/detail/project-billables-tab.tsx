'use client';

import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { ProjectBillableWithUnits } from '@/lib/actions/projects';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

type ProjectBillablesTabProps = {
  billables: ProjectBillableWithUnits[];
  serviceLookup: Map<string, string>;
  loading?: boolean;
  onSelect: (billable: ProjectBillableWithUnits) => void;
};

export function ProjectBillablesTab({
  billables,
  serviceLookup,
  loading = false,
  onSelect
}: ProjectBillablesTabProps) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter) return billables;
    const query = filter.toLowerCase();
    return billables.filter((billable) => {
      const units = billable.units ?? [];
      const unitMatch = units.some((unit) =>
        unit.title.toLowerCase().includes(query)
      );
      const serviceMatch = units.some((unit) => {
        const serviceName = unit.service_id ? serviceLookup.get(unit.service_id) : undefined;
        return serviceName?.toLowerCase().includes(query);
      });
      return (
        billable.billable_type.toLowerCase().includes(query) ||
        unitMatch ||
        serviceMatch
      );
    });
  }, [billables, filter, serviceLookup]);

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <Input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder='Search billables…'
          className='h-9'
        />
        <div className='text-xs text-muted-foreground sm:text-sm'>
          {billables.length} billable{billables.length === 1 ? '' : 's'}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='text-xs font-semibold uppercase text-muted-foreground'>
              Billable
            </TableHead>
            <TableHead className='text-xs font-semibold uppercase text-muted-foreground'>
              Status
            </TableHead>
            <TableHead className='text-right text-xs font-semibold uppercase text-muted-foreground'>
              Units
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={3} className='h-24'>
                <div className='flex items-center justify-center gap-3 text-sm text-muted-foreground'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Loading billables…
                </div>
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className='h-24 text-center text-sm text-muted-foreground'>
                {billables.length === 0
                  ? 'No billables yet. Use the + button to group service units for billing.'
                  : 'No billables match your search.'}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((billable) => {
              const units = billable.units ?? [];
              const totalDollarAmount = units
                .filter((unit) => unit.budget_type === 'dollar')
                .reduce((sum, unit) => sum + unit.budget_amount, 0);
              const unitSummary = units
                .map((unit) => {
                  const serviceName = unit.service_id ? serviceLookup.get(unit.service_id) : undefined;
                  return serviceName ? `${serviceName} — ${unit.title}` : unit.title;
                })
                .join(', ');

              return (
                <TableRow
                  key={billable.id}
                  className='cursor-pointer border-b border-border/60 transition hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
                  onClick={() => onSelect(billable)}
                  role='button'
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(billable);
                    }
                  }}
                >
                  <TableCell className='align-middle'>
                    <div className='flex min-w-0 flex-col gap-1'>
                      <span className='text-sm font-semibold capitalize text-foreground'>
                        {billable.billable_type}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        Updated {formatDate(billable.updated_at)}
                      </span>
                      {unitSummary && (
                        <span className='line-clamp-2 break-words text-xs text-muted-foreground'>
                          {unitSummary}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='align-middle'>
                    <div className='flex flex-col gap-1 text-xs text-muted-foreground'>
                      <StatusPill label='Approved' active={billable.approved_ind} />
                      <StatusPill label='Completed' active={billable.completed_ind} />
                      <StatusPill label='Paid' active={billable.paid_ind} />
                    </div>
                  </TableCell>
                  <TableCell className='align-middle text-right text-xs text-muted-foreground'>
                    <div className='flex flex-col items-end gap-1'>
                      <span className='text-sm font-medium text-foreground'>
                        {units.length} unit{units.length === 1 ? '' : 's'}
                      </span>
                      {totalDollarAmount > 0 && (
                        <span>{currencyFormatter.format(totalDollarAmount)}</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

type StatusPillProps = {
  label: string;
  active: boolean;
};

function StatusPill({ label, active }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        active
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground'
      )}
    >
      <span className='h-1.5 w-1.5 rounded-full bg-current opacity-75' aria-hidden />
      {label}
    </span>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return dateFormatter.format(date);
}

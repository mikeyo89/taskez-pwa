'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { ProjectServiceWithChildren } from '@/lib/actions/projects';
import { cn } from '@/lib/utils';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { ChevronsUpDown, Loader2, MoreHorizontal, Pencil, Printer, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

type ProjectServicesTabProps = {
  services: ProjectServiceWithChildren[];
  serviceLookup: Map<string, string>;
  loading?: boolean;
  onSelect: (service: ProjectServiceWithChildren) => void;
  onModify: (service: ProjectServiceWithChildren) => void;
  onDelete: (service: ProjectServiceWithChildren) => void;
};

export function ProjectServicesTab({
  services,
  serviceLookup,
  loading = false,
  onSelect,
  onModify,
  onDelete
}: ProjectServicesTabProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'est_completion_date', desc: false }
  ]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<ProjectServiceWithChildren>[]>(() => {
    return [
      {
        accessorKey: 'service_id',
        header: () => (
          <span className='text-xs font-semibold uppercase text-muted-foreground'>Service</span>
        ),
        cell: ({ row }) => {
          const entity = row.original;
          const serviceName = serviceLookup.get(entity.service_id) ?? 'Unknown service';
          return (
            <div className='flex flex-col gap-1'>
              <span className='text-sm font-semibold leading-tight text-foreground'>
                {serviceName}
              </span>
              <span className='text-xs text-muted-foreground'>
                Budget {formatBudget(entity.budget_amount, entity.budget_type)} ·{' '}
                {entity.units.length} unit{entity.units.length === 1 ? '' : 's'}
              </span>
              <StatusSummary entity={entity} />
            </div>
          );
        },
        meta: { className: 'align-middle' }
      },
      {
        accessorKey: 'est_completion_date',
        header: ({ column }) => (
          <button
            type='button'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='ml-auto flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground'
          >
            Est. Due
            <ChevronsUpDown className='h-3.5 w-3.5 opacity-60' />
          </button>
        ),
        cell: ({ row }) => (
          <span className='text-xs text-muted-foreground'>
            {formatDate(row.original.est_completion_date)}
          </span>
        ),
        sortingFn: (rowA, rowB, columnId) => {
          const a = new Date(rowA.getValue<string>(columnId)).getTime();
          const b = new Date(rowB.getValue<string>(columnId)).getTime();
          return a === b ? 0 : a > b ? 1 : -1;
        },
        meta: { className: 'text-right align-middle' }
      },
      {
        id: 'actions',
        header: () => <span className='sr-only'>Actions</span>,
        cell: ({ row }) => (
          <ProjectServiceActions
            service={row.original}
            onModify={onModify}
            onDelete={onDelete}
          />
        ),
        meta: { className: 'w-0 text-right align-middle' }
      }
    ];
  }, [serviceLookup, onModify, onDelete]);

  const table = useReactTable({
    data: services,
    columns,
    state: {
      sorting,
      globalFilter
    },
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, value) => {
      if (!value) return true;
      const service = row.original;
      const name = (serviceLookup.get(service.service_id) ?? '').toLowerCase();
      const search = String(value).toLowerCase();
      return name.includes(search);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 5 }
    }
  });

  const rows = table.getRowModel().rows;

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <Input
          value={globalFilter}
          onChange={(event) => {
            const value = event.target.value;
            setGlobalFilter(value);
            table.setGlobalFilter(value);
          }}
          placeholder='Search services…'
          className='h-9'
        />
        <div className='text-xs text-muted-foreground sm:text-sm'>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </div>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    'text-xs font-semibold uppercase text-muted-foreground',
                    header.column.columnDef.meta?.className
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className='h-24'>
                <div className='flex items-center justify-center gap-3 text-sm text-muted-foreground'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Loading services…
                </div>
              </TableCell>
            </TableRow>
          ) : rows.length ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className='cursor-pointer border-b border-border/60 transition hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
                onClick={() => onSelect(row.original)}
                role='button'
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(row.original);
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      'py-3 text-sm align-top',
                      cell.column.columnDef.meta?.className
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className='h-24 text-center text-sm text-muted-foreground'
              >
                Link a service to this project to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ProjectServiceActions({
  service,
  onModify,
  onDelete
}: {
  service: ProjectServiceWithChildren;
  onModify: (service: ProjectServiceWithChildren) => void;
  onDelete: (service: ProjectServiceWithChildren) => void;
}) {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  const handleModify = () => {
    closeMenu();
    onModify(service);
  };

  const handleDelete = () => {
    closeMenu();
    onDelete(service);
  };

  const handlePrint = () => {
    closeMenu();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-8 w-8 rounded-full text-muted-foreground hover:text-foreground'
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Open service actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-44'>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            handlePrint();
          }}
          className='gap-2'
        >
          <Printer className='h-4 w-4' />
          Print
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            handleModify();
          }}
          className='gap-2'
        >
          <Pencil className='h-4 w-4' />
          Modify
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            handleDelete();
          }}
          className='gap-2 text-destructive focus:text-destructive'
        >
          <Trash2 className='h-4 w-4' />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatBudget(amount: number, type: ProjectServiceWithChildren['budget_type']) {
  if (type === 'percent') {
    return `${amount}%`;
  }
  return currencyFormatter.format(amount);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function StatusSummary({ entity }: { entity: ProjectServiceWithChildren }) {
  const items: string[] = [];
  if (entity.approved_ind) items.push('Approved');
  if (entity.completed_ind) items.push('Completed');
  if (entity.paid_ind) items.push('Paid');
  if (items.length === 0) {
    return <span className='text-xs text-muted-foreground'>Awaiting approvals</span>;
  }
  return <span className='text-xs text-muted-foreground'>{items.join(' · ')}</span>;
}

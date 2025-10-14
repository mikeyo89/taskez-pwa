'use Service';

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
import { Tooltip } from '@/components/ui/tooltip';
import { deleteService } from '@/lib/actions/services';
import type { Service } from '@/lib/models';
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
import { ChevronLeft, ChevronRight, ChevronsUpDown, Loader2, Pencil, Trash2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { UpdateServiceDialog } from './form';

/* eslint-disable @typescript-eslint/no-unused-vars */
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    className?: string;
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */

type ServicesTableProps = {
  data: Service[];
  loading?: boolean;
};

export function ServicesTable({ data, loading = false }: ServicesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updated_at', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<Service>[]>(() => {
    return [
      {
        accessorKey: 'name',
        header: () => (
          <span className='text-xs font-semibold uppercase text-muted-foreground'>Service</span>
        ),
        cell: ({ row }) => {
          const service = row.original;
          return (
            <div className='flex flex-col gap-1'>
              <Tooltip content={service.name} side='top'>
                <span
                  className='text-sm font-medium text-foreground block max-w-[13rem] truncate'
                  aria-label={service.name}
                >
                  {service.name}
                </span>
              </Tooltip>
              {service.description && (
                <span className='text-xs text-muted-foreground line-clamp-2'>
                  {service.description}
                </span>
              )}
            </div>
          );
        },
        meta: { className: 'align-middle' }
      },
      {
        accessorKey: 'updated_at',
        header: ({ column }) => (
          <button
            type='button'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='ml-auto flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground'
          >
            Updated
            <ChevronsUpDown className='h-3.5 w-3.5 opacity-60' />
          </button>
        ),
        cell: ({ row }) => (
          <span className='block text-xs text-muted-foreground'>
            {formatDate(row.original.updated_at)}
          </span>
        ),
        sortingFn: (rowA, rowB, columnId) => {
          const a = new Date(rowA.getValue<string>(columnId)).getTime();
          const b = new Date(rowB.getValue<string>(columnId)).getTime();
          return a === b ? 0 : a > b ? 1 : -1;
        },
        meta: { className: 'text-right align-middle' }
      }
    ];
  }, []);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter
    },
    onSortingChange: setSorting,
    globalFilterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;
      const value = String(filterValue).toLowerCase();
      const Service = row.original;
      return (
        Service.name.toLowerCase().includes(value) ||
        (Service.description ?? '').toLowerCase().includes(value)
      );
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
    <div
      className='space-y-4 backdrop-blur-sm'
      style={{
        backgroundColor: 'color-mix(in srgb, var(--background) 96%, transparent)'
      }}
    >
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <Input
          value={globalFilter}
          onChange={(event) => {
            const value = event.target.value;
            setGlobalFilter(value);
            table.setGlobalFilter(value);
          }}
          placeholder='Search Services...'
          className='h-9'
        />
        <div className='flex items-center justify-end gap-2 text-xs text-muted-foreground sm:text-sm'>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='icon-sm'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='icon-sm'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
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
                  Loading Services…
                </div>
              </TableCell>
            </TableRow>
          ) : rows.length ? (
            rows.map((row) => (
              <ServiceRowActions key={row.id} Service={row.original}>
                <TableRow
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className='cursor-pointer border-b border-border/60 transition hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn('py-3 text-sm', cell.column.columnDef.meta?.className)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              </ServiceRowActions>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className='h-24 text-center text-sm text-muted-foreground'
              >
                {globalFilter
                  ? 'No Services match your search.'
                  : 'Add your first Service to get started.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function formatDate(input: string) {
  return new Date(input).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function ServiceRowActions({
  Service,
  children
}: {
  Service: Service;
  children: React.ReactElement;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);

  let child;
  if (React.isValidElement(children)) {
    const el = children as React.ReactElement<Record<string, unknown>>;
    child = React.cloneElement(el, {
      role: 'button',
      tabIndex: 0,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setMenuOpen(true);
        }
        if (el.props.onKeyDown) {
          el.props.onKeyDown(event);
        }
      },
      className: cn(
        el.props.className,
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60'
      )
    });
  } else {
    child = children;
  }

  const openUpdateDialog = () => {
    setMenuOpen(false);
    setUpdateOpen(true);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    const confirmed =
      typeof window === 'undefined' ? true : window.confirm('Delete this Service permanently?');
    if (!confirmed) return;
    try {
      await deleteService(Service.id);
      toast.success('Service deleted');
    } catch (error) {
      console.error(error);
      toast.error('Unable to delete Service. Try again.');
    }
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>{child}</DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-48'>
          <DropdownMenuItem onClick={openUpdateDialog} className='gap-2'>
            <Pencil className='h-4 w-4' />
            Update
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            className='gap-2 text-destructive focus:text-destructive'
          >
            <Trash2 className='h-4 w-4' />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <UpdateServiceDialog
        key={`${Service.id}-${Service.updated_at}`}
        Service={Service}
        open={updateOpen}
        onOpenChange={setUpdateOpen}
      />
    </>
  );
}

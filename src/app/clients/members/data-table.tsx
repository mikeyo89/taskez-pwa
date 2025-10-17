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
import { Tooltip } from '@/components/ui/tooltip';
import { deleteMember } from '@/lib/actions/clients';
import type { Member } from '@/lib/models';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ColumnDef,
  SortingState,
  Updater,
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

import { useMemberFiltersStore } from '@/stores/member-filters';
import { UpdateMemberDialog } from './forms';

/* eslint-disable @typescript-eslint/no-unused-vars */
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    className?: string;
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */

type MembersTableProps = {
  data: Member[];
  loading?: boolean;
};

const PAGE_SIZE = 5;

export function MembersTable({ data, loading = false }: MembersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updated_at', desc: true }]);
  const search = useMemberFiltersStore((state) => state.search);
  const setSearch = useMemberFiltersStore((state) => state.setSearch);
  const pageIndex = useMemberFiltersStore((state) => state.pageIndex);
  const setPageIndex = useMemberFiltersStore((state) => state.setPageIndex);

  const columns = useMemo<ColumnDef<Member>[]>(() => {
    return [
      {
        id: 'full_name',
        accessorFn: (row) => `${row.first_name} ${row.last_name}`,
        header: () => (
          <span className='text-xs font-semibold uppercase text-muted-foreground'>Member</span>
        ),
        cell: ({ row }) => {
          const member = row.original;
          const fullName = `${member.first_name} ${member.last_name}`;
          return (
            <div className='flex w-full min-w-0 flex-col gap-1 max-w-[13.5rem] sm:max-w-[15rem] md:max-w-[20rem] lg:max-w-[24rem]'>
              <Tooltip content={fullName} side='top'>
                <span className='block line-clamp-2 break-words text-sm font-medium leading-tight text-foreground hyphens-auto'>
                  {fullName}
                </span>
              </Tooltip>
              <span className='text-xs text-muted-foreground break-all'>{member.email}</span>
              <span className='text-xs text-muted-foreground break-words'>{member.phone ?? '-'}</span>
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

  const handlePaginationChange = (updater: Updater<{ pageIndex: number; pageSize: number }>) => {
    const next =
      typeof updater === 'function' ? updater({ pageIndex, pageSize: PAGE_SIZE }) : updater;
    setPageIndex(next.pageIndex);
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter: search,
      pagination: {
        pageIndex,
        pageSize: PAGE_SIZE
      }
    },
    onSortingChange: setSorting,
    onPaginationChange: handlePaginationChange,
    globalFilterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;
      const value = String(filterValue).toLowerCase();
      const member = row.original;
      const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
      return (
        fullName.includes(value) ||
        member.email.toLowerCase().includes(value) ||
        (member.phone ?? '').toLowerCase().includes(value)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: PAGE_SIZE }
    }
  });

  const rows = table.getRowModel().rows;

  return (
    <div
      className='space-y-4 rounded-2xl border border-dashed border-border/70 bg-background/80 p-4 backdrop-blur-sm'
      style={{
        backgroundColor: 'color-mix(in srgb, var(--background) 96%, transparent)'
      }}
    >
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <Input
          value={search}
          onChange={(event) => {
            const value = event.target.value;
            setSearch(value);
            table.setGlobalFilter(value);
          }}
          placeholder='Search members…'
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
                  Loading members…
                </div>
              </TableCell>
            </TableRow>
          ) : rows.length ? (
            rows.map((row) => (
              <MemberRowActions key={row.id} member={row.original}>
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
              </MemberRowActions>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className='h-24 text-center text-sm text-muted-foreground'
              >
                {search
                  ? 'No members match your search.'
                  : 'Add people to this client to collaborate faster.'}
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

function MemberRowActions({ member, children }: { member: Member; children: React.ReactElement }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () => deleteMember(member.id),
    onSuccess: async () => {
      toast.success('Member removed');
      await queryClient.invalidateQueries({ queryKey: ['clients', member.client_id, 'members'] });
    },
    onError: (error: unknown) => {
      console.error(error);
      toast.error('Unable to delete member. Try again.');
    }
  });

  const handleDelete = async () => {
    setMenuOpen(false);
    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm(`Remove ${member.first_name} ${member.last_name}?`);
    if (!confirmed) return;
    await deleteMutation.mutateAsync();
  };

  const handleEdit = () => {
    setMenuOpen(false);
    setUpdateOpen(true);
  };

  let triggerChild: React.ReactElement = children;
  if (React.isValidElement(children)) {
    const el = children as React.ReactElement<Record<string, unknown>>;
    const existingOnKeyDown = (el.props as unknown as { onKeyDown?: unknown })?.onKeyDown;
    triggerChild = React.cloneElement(el, {
      role: 'button',
      tabIndex: 0,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setMenuOpen(true);
        }
        if (typeof existingOnKeyDown === 'function') {
          existingOnKeyDown(event);
        }
      }
    });
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>{triggerChild}</DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-44'>
          <DropdownMenuItem onClick={handleEdit} className='gap-2'>
            <Pencil className='h-4 w-4' />
            Modify
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className='gap-2 text-destructive focus:text-destructive'
          >
            <Trash2 className='h-4 w-4' />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <UpdateMemberDialog member={member} open={updateOpen} onOpenChange={setUpdateOpen} />
    </>
  );
}

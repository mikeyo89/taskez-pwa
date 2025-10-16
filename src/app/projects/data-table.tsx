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
import type { Client, Project } from '@/lib/models';
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
import {
  CalendarClock,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Trash2
} from 'lucide-react';
import {
  cloneElement,
  isValidElement,
  useMemo,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement
} from 'react';
import { useRouter } from 'next/navigation';

import { DeleteProjectDialog, UpdateProjectDialog } from './form';

type ProjectsTableProps = {
  data: Project[];
  clients: Client[];
  loading?: boolean;
};

/* eslint-disable @typescript-eslint/no-unused-vars */
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    className?: string;
  }
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

export function ProjectsTable({ data, clients, loading = false }: ProjectsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'est_completion_date', desc: false }
  ]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showActive, setShowActive] = useState(false);
  const [showDueSoon, setShowDueSoon] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const clientLookup = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client.name]));
  }, [clients]);

  const filteredData = useMemo(() => {
    let result = data;
    if (showActive) {
      result = result.filter((project) => !project.completed_ind);
    }
    if (showDueSoon) {
      const now = new Date();
      result = result.filter((project) => {
        const date = new Date(project.est_completion_date);
        if (Number.isNaN(date.getTime())) return false;
        const diffMs = date.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      });
    }
    return result;
  }, [data, showActive, showDueSoon]);

  const columns = useMemo<ColumnDef<Project>[]>(() => {
    return [
      {
        accessorKey: 'title',
        header: () => (
          <span className='text-xs font-semibold uppercase text-muted-foreground'>Project</span>
        ),
        cell: ({ row }) => {
          const project = row.original;
          return (
            <div className='flex max-w-[20rem] flex-col gap-1'>
              <span
                className='block max-w-[13rem] truncate text-sm font-semibold text-foreground'
                title={project.title}
              >
                {project.title}
              </span>
              {project.description && (
                <span className='text-xs text-muted-foreground line-clamp-2'>
                  {project.description}
                </span>
              )}
              <span
                className='text-xs text-muted-foreground truncate'
                title={String(project.budget ?? '')}
              >
                {typeof project.budget === 'number'
                  ? currencyFormatter.format(project.budget)
                  : 'Budget pending'}
              </span>
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
      }
    ];
  }, []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter
    },
    onSortingChange: setSorting,
    globalFilterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true;
      const value = String(filterValue).toLowerCase();
      const project = row.original;
      return (
        project.title.toLowerCase().includes(value) ||
        (project.description ?? '').toLowerCase().includes(value)
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

  const openUpdateDialog = (project: Project) => {
    setEditingProject(project);
    setUpdateOpen(true);
  };

  const openDeleteDialog = (project: Project) => {
    setDeleteProject(project);
    setDeleteOpen(true);
  };

  return (
    <>
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
            placeholder='Search projects...'
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

        <div className='text-xs font-semibold uppercase text-muted-foreground'>Quick Filters</div>
        <div className='flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground'>
          <button
            type='button'
            onClick={() => setShowActive((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              showActive
                ? 'border-primary/60 bg-primary/15 text-primary'
                : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted/60'
            )}
          >
            <CheckCheck className='h-3.5 w-3.5' />
            Active
          </button>
          <button
            type='button'
            onClick={() => setShowDueSoon((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              showDueSoon
                ? 'border-primary/60 bg-primary/15 text-primary'
                : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted/60'
            )}
          >
            <CalendarClock className='h-3.5 w-3.5' />
            Due Soon
          </button>
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
                    Loading projects…
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length ? (
              rows.map((row) => (
                <ProjectRowActions
                  key={row.id}
                  project={row.original}
                  clients={clientLookup}
                  onEdit={openUpdateDialog}
                  onDelete={openDeleteDialog}
                >
                  <TableRow
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                    className='cursor-pointer border-b border-border/60 transition hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'py-3 text-sm align-top max-w-[22rem] overflow-hidden',
                          cell.column.columnDef.meta?.className
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                </ProjectRowActions>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center text-sm text-muted-foreground'
                >
                  {globalFilter || showActive || showDueSoon
                    ? 'No projects match your filters.'
                    : 'Create your first project to get started.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {editingProject && (
        <UpdateProjectDialog
          key={`${editingProject.id}-${editingProject.updated_at}`}
          project={editingProject}
          clientName={clientLookup.get(editingProject.client_id)}
          open={updateOpen}
          onOpenChange={(openState) => {
            if (!openState) {
              setEditingProject(null);
            }
            setUpdateOpen(openState);
          }}
        />
      )}

      <DeleteProjectDialog
        project={deleteProject}
        open={deleteOpen}
        onOpenChange={(openState) => {
          if (!openState) {
            setDeleteProject(null);
          }
          setDeleteOpen(openState);
        }}
      />
    </>
  );
}

function ProjectRowActions({
  project,
  clients,
  onEdit,
  onDelete,
  children
}: {
  project: Project;
  clients: Map<string, string>;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  children: ReactElement;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  let child: ReactElement = children;
  if (isValidElement<HTMLAttributes<HTMLTableRowElement>>(children)) {
    const existingOnClick = children.props.onClick;
    child = cloneElement(children, {
      onClick: (event: MouseEvent<HTMLTableRowElement>) => {
        existingOnClick?.(event);
        setMenuOpen(true);
      },
      role: 'button',
      tabIndex: 0,
      onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setMenuOpen(true);
        }
      },
      className: cn(
        children.props.className ?? '',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60'
      )
    });
  }

  const closeMenu = () => setMenuOpen(false);

  const handleUpdate = () => {
    closeMenu();
    onEdit(project);
  };

  const handleDelete = () => {
    closeMenu();
    onDelete(project);
  };

  const handleView = () => {
    closeMenu();
    router.push(`/projects/${project.id}`);
  };

  const handlePrint = () => closeMenu();

  const clientName = clients.get(project.client_id) ?? 'Unknown client';

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>{child}</DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        <div className='px-3 py-2'>
          <p className='text-sm font-semibold leading-tight text-foreground'>{project.title}</p>
          <p className='text-xs text-muted-foreground'>for {clientName}</p>
        </div>
        <DropdownMenuItem onClick={handleView} className='gap-2'>
          <Eye className='h-4 w-4' />
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint} className='gap-2'>
          <FileText className='h-4 w-4' />
          Print
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleUpdate} className='gap-2'>
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
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

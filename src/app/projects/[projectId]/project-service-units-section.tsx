'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  addProjectServiceUnit,
  deleteProjectServiceUnit,
  updateProjectServiceUnit
} from '@/lib/actions/projects';
import { useProjectServiceUnits } from '@/lib/hooks/useProjectServiceUnits';
import type { ProjectServiceUnit } from '@/lib/models';
import { cn } from '@/lib/utils';

type ProjectServiceUnitsSectionProps = {
  projectServiceId?: string;
  serviceName?: string;
};

export function ProjectServiceUnitsSection({
  projectServiceId,
  serviceName
}: ProjectServiceUnitsSectionProps) {
  const unitsQuery = useProjectServiceUnits(projectServiceId);
  const [drawerState, setDrawerState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    unit: ProjectServiceUnit | null;
  }>({ open: false, mode: 'create', unit: null });
  const [deleteState, setDeleteState] = useState<{
    open: boolean;
    unit: ProjectServiceUnit | null;
  }>({ open: false, unit: null });

  useEffect(() => {
    if (!projectServiceId) {
      setDrawerState({ open: false, mode: 'create', unit: null });
      setDeleteState({ open: false, unit: null });
    }
  }, [projectServiceId]);

  if (!projectServiceId) {
    return (
      <div className='rounded-md border border-dashed border-muted-foreground/40 p-6 text-sm text-muted-foreground'>
        Save the project service first to manage units.
      </div>
    );
  }

  const units = unitsQuery.data ?? [];

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='space-y-1.5'>
          <h3 className='text-sm font-semibold text-foreground leading-tight'>
            Units {serviceName ? `for ${serviceName}` : ''}
          </h3>
          <p className='text-xs text-muted-foreground'>
            Track bite-sized work items as they move from approved to paid.
          </p>
        </div>
        <Button
          type='button'
          size='sm'
          className='w-full sm:w-auto'
          onClick={() => setDrawerState({ open: true, mode: 'create', unit: null })}
        >
          <Plus className='mr-2 h-4 w-4' />
          Add Unit
        </Button>
      </div>

      {/* Mobile layout */}
      <div className='grid gap-3 sm:hidden'>
        {unitsQuery.isLoading ? (
          <div className='flex h-16 items-center justify-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground'>
            Loading units…
          </div>
        ) : units.length ? (
          units.map((unit) => (
            <article
              key={unit.id}
              className='rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='space-y-1'>
                  <h4 className='text-sm font-semibold leading-tight text-foreground'>
                    {unit.title}
                  </h4>
                  {unit.description && (
                    <p className='text-xs text-muted-foreground'>{unit.description}</p>
                  )}
                </div>
                <div className='flex shrink-0 items-center gap-1'>
                  <Button
                    type='button'
                    size='icon-sm'
                    variant='ghost'
                    className='h-8 w-8'
                    onClick={() => setDrawerState({ open: true, mode: 'edit', unit })}
                  >
                    <Pencil className='h-3.5 w-3.5' />
                  </Button>
                  <Button
                    type='button'
                    size='icon-sm'
                    variant='ghost'
                    className='h-8 w-8 text-destructive'
                    onClick={() => setDeleteState({ open: true, unit })}
                  >
                    <Trash2 className='h-3.5 w-3.5' />
                  </Button>
                </div>
              </div>
              <dl className='mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground'>
                <div>
                  <dt className='uppercase tracking-wide'>Budget</dt>
                  <dd className='text-foreground'>{formatBudget(unit.budget_amount, unit.budget_type)}</dd>
                </div>
                <div>
                  <dt className='uppercase tracking-wide'>Est. Due</dt>
                  <dd className='text-foreground'>{formatDate(unit.est_completion_date)}</dd>
                </div>
                <div className='col-span-2'>
                  <dt className='uppercase tracking-wide'>Status</dt>
                  <dd>{formatStatus(unit)}</dd>
                </div>
              </dl>
            </article>
          ))
        ) : (
          <div className='rounded-xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground'>
            No units yet. Add your first unit to break down the work.
          </div>
        )}
      </div>

      {/* Desktop/tablet layout */}
      <div className='hidden overflow-x-auto rounded-lg border border-border/60 sm:block'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='text-xs font-semibold uppercase text-muted-foreground'>
                Title
              </TableHead>
              <TableHead className='text-xs font-semibold uppercase text-muted-foreground'>
                Budget
              </TableHead>
              <TableHead className='text-xs font-semibold uppercase text-muted-foreground'>
                Est. Due
              </TableHead>
              <TableHead className='text-xs font-semibold uppercase text-muted-foreground'>
                Status
              </TableHead>
              <TableHead className='text-right text-xs font-semibold uppercase text-muted-foreground'>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unitsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className='h-16 text-center text-sm text-muted-foreground'>
                  Loading units…
                </TableCell>
              </TableRow>
            ) : units.length ? (
              units.map((unit) => (
                <TableRow key={unit.id} className='border-border/60'>
                  <TableCell>
                    <div className='flex flex-col gap-1'>
                      <span className='text-sm font-semibold text-foreground'>{unit.title}</span>
                      {unit.description && (
                        <span className='text-xs text-muted-foreground'>{unit.description}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='text-sm text-muted-foreground'>
                    {formatBudget(unit.budget_amount, unit.budget_type)}
                  </TableCell>
                  <TableCell className='text-sm text-muted-foreground'>
                    {formatDate(unit.est_completion_date)}
                  </TableCell>
                  <TableCell className='text-xs text-muted-foreground'>
                    {formatStatus(unit)}
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-2'>
                      <Button
                        type='button'
                        size='icon-sm'
                        variant='ghost'
                        onClick={() => setDrawerState({ open: true, mode: 'edit', unit })}
                      >
                        <Pencil className='h-4 w-4' />
                      </Button>
                      <Button
                        type='button'
                        size='icon-sm'
                        variant='ghost'
                        className='text-destructive'
                        onClick={() => setDeleteState({ open: true, unit })}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className='h-16 text-center text-sm text-muted-foreground'>
                  No units yet. Add your first unit to break down the work.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ProjectServiceUnitDrawer
        open={drawerState.open}
        mode={drawerState.mode}
        projectServiceId={projectServiceId}
        unit={drawerState.unit}
        onOpenChange={(next) => {
          if (!next) {
            setDrawerState({ open: false, mode: 'create', unit: null });
          } else {
            setDrawerState((prev) => ({ ...prev, open: next }));
          }
        }}
      />

      <ProjectServiceUnitDeleteDialog
        open={deleteState.open}
        unit={deleteState.unit}
        onOpenChange={(next) => {
          if (!next) {
            setDeleteState({ open: false, unit: null });
          } else {
            setDeleteState((prev) => ({ ...prev, open: next }));
          }
        }}
      />
    </div>
  );
}

type ProjectServiceUnitDrawerProps = {
  projectServiceId: string;
  mode: 'create' | 'edit';
  unit: ProjectServiceUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ProjectServiceUnitDrawer({
  projectServiceId,
  mode,
  unit,
  open,
  onOpenChange
}: ProjectServiceUnitDrawerProps) {
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetType, setBudgetType] = useState<'dollar' | 'percent'>('dollar');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [estCompletionDate, setEstCompletionDate] = useState('');
  const [approved, setApproved] = useState(false);
  const [approvedDate, setApprovedDate] = useState('');
  const [completed, setCompleted] = useState(false);
  const [completedDate, setCompletedDate] = useState('');
  const [paid, setPaid] = useState(false);
  const [paidDate, setPaidDate] = useState('');

  useEffect(() => {
    if (open) {
      if (unit) {
        setTitle(unit.title);
        setDescription(unit.description ?? '');
        setBudgetType(unit.budget_type);
        setBudgetAmount(String(unit.budget_amount));
        setEstCompletionDate(normalizeDateForInput(unit.est_completion_date));
        setApproved(Boolean(unit.approved_ind));
        setApprovedDate(normalizeDateForInput(unit.approved_date));
        setCompleted(Boolean(unit.completed_ind));
        setCompletedDate(normalizeDateForInput(unit.completed_date));
        setPaid(Boolean(unit.paid_ind));
        setPaidDate(normalizeDateForInput(unit.paid_date));
      } else {
        setTitle('');
        setDescription('');
        setBudgetType('dollar');
        setBudgetAmount('');
        setEstCompletionDate('');
        setApproved(false);
        setApprovedDate('');
        setCompleted(false);
        setCompletedDate('');
        setPaid(false);
        setPaidDate('');
      }
    }
  }, [open, unit]);

  const handleOpenChange = (next: boolean) => {
    if (!pending) {
      onOpenChange(next);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error('Unit title is required.');
      return;
    }
    if (!estCompletionDate) {
      toast.error('Estimated completion date is required.');
      return;
    }
    const amount = Number(budgetAmount);
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Enter a valid budget amount.');
      return;
    }

    setPending(true);
    try {
      if (mode === 'create' || !unit) {
        await addProjectServiceUnit(projectServiceId, {
          title: title.trim(),
          description: description.trim() || undefined,
          budget_type: budgetType,
          budget_amount: amount,
          est_completion_date: estCompletionDate,
          approved_ind: approved,
          approved_date: normalizedDateForPersistence(approved, approvedDate),
          completed_ind: completed,
          completed_date: normalizedDateForPersistence(completed, completedDate),
          paid_ind: paid,
          paid_date: normalizedDateForPersistence(paid, paidDate)
        });
        toast.success('Unit added');
      } else {
        await updateProjectServiceUnit(unit.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          budget_type: budgetType,
          budget_amount: amount,
          est_completion_date: estCompletionDate,
          approved_ind: approved,
          approved_date: normalizedDateForPersistence(approved, approvedDate),
          completed_ind: completed,
          completed_date: normalizedDateForPersistence(completed, completedDate),
          paid_ind: paid,
          paid_date: normalizedDateForPersistence(paid, paidDate)
        });
        toast.success('Unit updated');
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Unable to save unit. Try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side='right' className='flex w-full flex-col p-0 sm:max-w-xl'>
        <form className='flex h-full flex-col' onSubmit={handleSubmit}>
          <SheetHeader className='relative border-b border-border/70 bg-background/90 px-5 py-4 text-left shadow-sm backdrop-blur'>
            <div className='absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-accent/60 via-accent/20 to-transparent' />
            <SheetTitle className='flex items-center gap-2 text-base font-semibold tracking-tight text-foreground'>
              <span className='flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold uppercase text-accent-foreground'>
                {mode === 'create' ? 'New' : 'Edit'}
              </span>
              {mode === 'create' ? 'Add Unit' : 'Update Unit'}
            </SheetTitle>
          </SheetHeader>

          <div className='flex-1 overflow-y-auto px-5 pb-6 pt-5'>
            <div className='space-y-5'>
              <section className='space-y-4 rounded-2xl border border-border/60 bg-background/90 p-5 shadow-sm backdrop-blur'>
                <div className='grid gap-1.5'>
                  <Label htmlFor='unit-title' className='text-sm font-semibold tracking-tight text-muted-foreground'>
                    Title
                  </Label>
                  <Input
                    id='unit-title'
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className='h-10 text-sm focus-visible:ring-accent/40'
                    required
                  />
                </div>
                <div className='grid gap-1.5'>
                  <Label htmlFor='unit-description' className='text-sm font-semibold tracking-tight text-muted-foreground'>
                    Description
                  </Label>
                  <Input
                    id='unit-description'
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className='h-10 text-sm focus-visible:ring-accent/40'
                    placeholder='Optional details'
                  />
                </div>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='grid gap-1.5'>
                    <Label htmlFor='unit-budget-type' className='text-sm font-semibold tracking-tight text-muted-foreground'>
                      Budget Type
                    </Label>
                    <Select
                      value={budgetType}
                      onValueChange={(value) =>
                        setBudgetType(value as ProjectServiceUnit['budget_type'])
                      }
                    >
                      <SelectTrigger
                        id='unit-budget-type'
                        className='h-10 w-full text-sm focus-visible:ring-accent/40'
                      >
                        <SelectValue placeholder='Select budget type' />
                      </SelectTrigger>
                      <SelectContent side='bottom' align='start'>
                        <SelectItem value='dollar'>$ (Dollar)</SelectItem>
                        <SelectItem value='percent'>% (Percent)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='grid gap-1.5'>
                    <Label htmlFor='unit-budget-amount' className='text-sm font-semibold tracking-tight text-muted-foreground'>
                      Budget Amount
                    </Label>
                    <Input
                      id='unit-budget-amount'
                      type='number'
                      min='0'
                      step='0.01'
                      value={budgetAmount}
                      onChange={(event) => setBudgetAmount(event.target.value)}
                      className='h-10 text-sm focus-visible:ring-accent/40'
                      required
                    />
                  </div>
                </div>
                <div className='grid gap-1.5'>
                  <Label htmlFor='unit-est-completion' className='text-sm font-semibold tracking-tight text-muted-foreground'>
                    Estimated Completion Date
                  </Label>
                  <Input
                    id='unit-est-completion'
                    type='date'
                    value={estCompletionDate}
                    onChange={(event) => setEstCompletionDate(event.target.value)}
                    className='h-10 text-sm focus-visible:ring-accent/40'
                    required
                  />
                </div>
              </section>

              <section className='space-y-3 rounded-2xl border border-accent/30 bg-accent/10 p-5 shadow-sm backdrop-blur'>
                <div className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
                  <h4 className='text-sm font-semibold leading-tight text-accent-foreground'>Status timeline</h4>
                  <p className='text-xs text-accent-foreground/80'>Toggle milestones as they are reached.</p>
                </div>

                <div className='space-y-3'>
                  <UnitStatusRow
                    id='unit-approved'
                    label='Approved?'
                    checked={approved}
                    dateValue={approvedDate}
                    onToggle={(next) => {
                      setApproved(next);
                      if (next && !approvedDate) setApprovedDate(todayInputValue());
                    }}
                    onDateChange={setApprovedDate}
                  />
                  <UnitStatusRow
                    id='unit-completed'
                    label='Completed?'
                    checked={completed}
                    dateValue={completedDate}
                    onToggle={(next) => {
                      setCompleted(next);
                      if (next && !completedDate) setCompletedDate(todayInputValue());
                    }}
                    onDateChange={setCompletedDate}
                  />
                  <UnitStatusRow
                    id='unit-paid'
                    label='Paid?'
                    checked={paid}
                    dateValue={paidDate}
                    onToggle={(next) => {
                      setPaid(next);
                      if (next && !paidDate) setPaidDate(todayInputValue());
                    }}
                    onDateChange={setPaidDate}
                  />
                </div>
              </section>
            </div>
          </div>

          <SheetFooter
            className='flex flex-col gap-3 border-t border-border/60 bg-background/95 px-5 pt-4 shadow-sm backdrop-blur'
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)'
            }}
          >
            <div className='flex justify-between gap-3'>
              <SheetClose asChild>
                <Button
                  type='button'
                  variant='outline'
                  className={cn(
                    'w-full border-border/70 text-sm font-medium shadow-sm transition-transform hover:-translate-y-0.5',
                    'sm:w-auto'
                  )}
                  disabled={pending}
                >
                  Cancel
                </Button>
              </SheetClose>
              <Button
                type='submit'
                className={cn(
                  'w-full bg-accent text-sm font-semibold text-accent-foreground shadow-md transition-transform hover:-translate-y-0.5 hover:bg-accent/90 focus-visible:ring-accent/50',
                  'sm:w-auto'
                )}
                disabled={pending}
              >
                {pending && <Spinner className='mr-2' />}
                {mode === 'create' ? 'Save Unit' : 'Update Unit'}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

type UnitStatusRowProps = {
  id: string;
  label: string;
  checked: boolean;
  dateValue: string;
  onToggle: (value: boolean) => void;
  onDateChange: (value: string) => void;
};

function UnitStatusRow({ id, label, checked, dateValue, onToggle, onDateChange }: UnitStatusRowProps) {
  return (
    <div className='grid gap-3 rounded-xl border border-accent/25 bg-background/90 px-3 py-3 shadow-sm transition-colors sm:grid-cols-[minmax(0,1fr)_200px] sm:items-center'>
      <div className='flex items-center gap-3'>
        <Checkbox
          id={`${id}-checkbox`}
          checked={checked}
          onCheckedChange={(value) => onToggle(value === true)}
          className='h-4 w-4 border-border data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground'
        />
        <Label htmlFor={`${id}-checkbox`} className='text-sm font-medium text-accent-foreground'>
          {label}
        </Label>
      </div>
      <div className='h-10 w-full sm:w-full'>
        <Input
          id={`${id}-date`}
          type='date'
          value={normalizeDateForInput(dateValue)}
          onChange={(event) => onDateChange(event.target.value)}
          className={cn(
            'h-10 w-full text-sm transition-opacity duration-200 ease-in-out focus-visible:ring-accent/40',
            checked ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          tabIndex={checked ? 0 : -1}
          required={checked}
          aria-hidden={!checked}
        />
      </div>
    </div>
  );
}

type ProjectServiceUnitDeleteDialogProps = {
  open: boolean;
  unit: ProjectServiceUnit | null;
  onOpenChange: (open: boolean) => void;
};

function ProjectServiceUnitDeleteDialog({
  open,
  unit,
  onOpenChange
}: ProjectServiceUnitDeleteDialogProps) {
  const [pending, setPending] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!pending) {
      onOpenChange(next);
    }
  };

  const handleDelete = async () => {
    if (!unit) return;
    setPending(true);
    try {
      await deleteProjectServiceUnit(unit.id);
      toast.success('Unit removed');
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Unable to delete unit. Try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-[360px]'>
        <DialogHeader>
          <DialogTitle>Remove Unit?</DialogTitle>
          <DialogDescription>
            {unit
              ? `“${unit.title}” will be removed from this service. This action cannot be undone.`
              : 'This unit will be removed from the service. This action cannot be undone.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className='mt-6'>
          <DialogClose asChild>
            <Button type='button' variant='outline' disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type='button' variant='destructive' onClick={handleDelete} disabled={pending}>
            {pending && <Spinner className='mr-2' />}
            {pending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatBudget(amount: number, type: ProjectServiceUnit['budget_type']) {
  if (type === 'percent') {
    return `${amount}%`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function formatStatus(unit: ProjectServiceUnit) {
  const statuses: string[] = [];
  if (unit.approved_ind) statuses.push('Approved');
  if (unit.completed_ind) statuses.push('Completed');
  if (unit.paid_ind) statuses.push('Paid');
  return statuses.length ? statuses.join(' · ') : 'Pending';
}

function normalizeDateForInput(value?: string) {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
}

function normalizedDateForPersistence(enabled: boolean, value: string) {
  if (!enabled) return '';
  return value ?? '';
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

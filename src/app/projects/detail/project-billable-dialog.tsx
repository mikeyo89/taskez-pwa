'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  createProjectBillable,
  updateProjectBillable,
  type ProjectBillableWithUnits,
  type ProjectServiceWithChildren
} from '@/lib/actions/projects';

import { cn } from '@/lib/utils';
import { MoreHorizontal, Pencil, Send } from 'lucide-react';

const BILLABLE_TYPES: Array<{ value: 'estimate' | 'invoice'; label: string }> = [
  { value: 'estimate', label: 'Estimate' },
  { value: 'invoice', label: 'Invoice' }
];

type ProjectBillableDialogProps = {
  projectId: string;
  services: ProjectServiceWithChildren[];
  serviceLookup: Map<string, string>;
  open: boolean;
  mode: 'create' | 'view' | 'edit';
  onOpenChange: (open: boolean) => void;
  initialBillable?: ProjectBillableWithUnits;
  onModeChange: (mode: 'create' | 'view' | 'edit') => void;
};

type FormState = {
  billableType: 'estimate' | 'invoice';
  selectedUnitIds: string[];
  approved: boolean;
  approvedDate: string;
  completed: boolean;
  completedDate: string;
  paid: boolean;
  paidDate: string;
};

type UnitOption = {
  id: string;
  title: string;
  serviceId: string;
  serviceName: string;
  approved: boolean;
};

export function ProjectBillableDialog({
  projectId,
  services,
  serviceLookup,
  open,
  mode,
  onOpenChange,
  initialBillable,
  onModeChange
}: ProjectBillableDialogProps) {
  const [pending, setPending] = useState(false);
  const [formState, setFormState] = useState<FormState>(() => createDefaultFormState());

  const isReadOnly = mode === 'view';
  const canModifyUnits =
    mode === 'create' || (mode === 'edit' && initialBillable && !initialBillable.approved_ind);

  useEffect(() => {
    if (!open) {
      setPending(false);
      setFormState(createDefaultFormState());
      return;
    }

    if (mode === 'edit' && initialBillable) {
      setFormState(createStateFromBillable(initialBillable));
      return;
    }

    const estimateAvailable = services.some((service) =>
      service.units.some((unit) => !unit.project_billable_id && !unit.approved_ind)
    );
    const invoiceAvailable = services.some((service) =>
      service.units.some((unit) => !unit.project_billable_id && unit.approved_ind)
    );

    const nextState = createDefaultFormState();
    if (!estimateAvailable && invoiceAvailable) {
      nextState.billableType = 'invoice';
      nextState.approved = true;
      nextState.approvedDate = todayInputValue();
    }
    setFormState(nextState);
  }, [open, mode, initialBillable, services]);

  const availableUnits = useMemo<UnitOption[]>(() => {
    if (mode === 'create') {
      return services.flatMap((service) => {
        const serviceName = serviceLookup.get(service.service_id) ?? 'Unnamed service';
        return service.units
          .filter((unit) => {
            if (unit.project_billable_id) return false;
            return formState.billableType === 'estimate' ? !unit.approved_ind : unit.approved_ind;
          })
          .map((unit) => ({
            id: unit.id,
            title: unit.title,
            serviceId: service.service_id,
            serviceName,
            approved: unit.approved_ind
          }));
      });
    }

    if (mode === 'edit' && initialBillable && !initialBillable.approved_ind) {
      const billableId = initialBillable.id;
      return services.flatMap((service) => {
        const serviceName = serviceLookup.get(service.service_id) ?? 'Unnamed service';
        return service.units
          .filter((unit) => {
            const belongsToBillable = unit.project_billable_id === billableId;
            if (!belongsToBillable && unit.project_billable_id) return false;
            if (belongsToBillable) return true;
            return formState.billableType === 'estimate' ? !unit.approved_ind : unit.approved_ind;
          })
          .map((unit) => ({
            id: unit.id,
            title: unit.title,
            serviceId: service.service_id,
            serviceName,
            approved: unit.approved_ind
          }));
      });
    }

    return [];
  }, [mode, services, serviceLookup, formState.billableType, initialBillable]);

  useEffect(() => {
    if (!canModifyUnits) return;
    const validIds = new Set(availableUnits.map((unit) => unit.id));
    setFormState((prev) => {
      if (availableUnits.length === 0 && prev.selectedUnitIds.length > 0) {
        return { ...prev, selectedUnitIds: [] };
      }
      const filteredIds = prev.selectedUnitIds.filter((id) => validIds.has(id));
      if (filteredIds.length === prev.selectedUnitIds.length) return prev;
      return { ...prev, selectedUnitIds: filteredIds };
    });
  }, [availableUnits, canModifyUnits]);

  const handleOpenChange = (next: boolean) => {
    if (!pending) {
      onOpenChange(next);
    }
  };

  const updateFormState = (patch: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
  };

  const handleBillableTypeChange = (value: 'estimate' | 'invoice') => {
    setFormState((prev) => ({
      ...prev,
      billableType: value,
      approved: value === 'invoice',
      approvedDate: value === 'invoice' ? prev.approvedDate || todayInputValue() : '',
      selectedUnitIds: prev.selectedUnitIds
    }));
  };

  const handleSubmit = async () => {
    const normalizedUnitIds = Array.from(new Set(formState.selectedUnitIds));
    if (mode === 'view') {
      return;
    }
    if (canModifyUnits && normalizedUnitIds.length === 0) {
      toast.error('Select at least one service unit.');
      return;
    }

    setPending(true);
    try {
      if (mode === 'create') {
        await createProjectBillable({
          project_id: projectId,
          billable_type: formState.billableType,
          service_unit_ids: normalizedUnitIds,
          approved_ind: formState.approved,
          approved_date: normalizedDateForPersistence(formState.approved, formState.approvedDate),
          completed_ind: formState.completed,
          completed_date: normalizedDateForPersistence(formState.completed, formState.completedDate),
          paid_ind: formState.paid,
          paid_date: normalizedDateForPersistence(formState.paid, formState.paidDate)
        });
        toast.success('Billable created');
      } else if (initialBillable) {
        await updateProjectBillable(initialBillable.id, {
          ...(canModifyUnits ? { service_unit_ids: normalizedUnitIds } : {}),
          approved_ind: formState.approved,
          approved_date: normalizedDateForPersistence(formState.approved, formState.approvedDate),
          completed_ind: formState.completed,
          completed_date: normalizedDateForPersistence(formState.completed, formState.completedDate),
          paid_ind: formState.paid,
          paid_date: normalizedDateForPersistence(formState.paid, formState.paidDate)
        });
        toast.success('Billable updated');
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Unable to save billable. Try again.');
    } finally {
      setPending(false);
    }
  };

  const selectedUnitsForDisplay = useMemo(() => {
    if (!initialBillable) return [] as Array<{
      id: string;
      title: string;
      serviceName: string;
      estCompletionDate?: string;
    }>;
    const ids = new Set(formState.selectedUnitIds);
    const units = initialBillable.units ?? [];
    return units
      .filter((unit) => ids.size === 0 || ids.has(unit.id))
      .map((unit) => {
        const serviceName =
          unit.service_name ??
          (unit.service_id ? serviceLookup.get(unit.service_id) ?? 'Service' : 'Service');
        return {
          id: unit.id,
          title: unit.title,
          serviceName,
          estCompletionDate: unit.est_completion_date
        };
      });
  }, [initialBillable, serviceLookup, formState.selectedUnitIds]);

  const disableSubmit = pending || (canModifyUnits && formState.selectedUnitIds.length === 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-2xl sm:max-h-[85vh] overflow-y-auto'>
        <DialogHeader className='space-y-2'>
          <div className='flex items-start justify-between gap-3'>
            <div className='flex flex-col gap-2'>
              <DialogTitle>
                {mode === 'create'
                  ? 'Create Billable Group'
                  : mode === 'view'
                    ? 'Billable Details'
                    : 'Update Billable'}
              </DialogTitle>
              <DialogDescription>
                Group project service units to prepare estimates or invoices for your client.
              </DialogDescription>
            </div>
            {mode === 'view' && initialBillable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type='button'
                    size='icon-sm'
                    variant='ghost'
                    className='text-muted-foreground hover:text-foreground'
                    aria-label='Billable actions'
                  >
                    <MoreHorizontal className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-36'>
                  <DropdownMenuItem
                    onClick={() => onModeChange('edit')}
                    className='gap-2'
                  >
                    <Pencil className='h-4 w-4' />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className='gap-2 text-muted-foreground'>
                    <Send className='h-4 w-4' />
                    Send…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </DialogHeader>

        <form
          className='grid gap-5'
          onSubmit={(event) => {
            event.preventDefault();
            if (!disableSubmit) {
              void handleSubmit();
            }
          }}
        >
          <div className='grid gap-2'>
            <Label htmlFor='billable-type' className='font-semibold'>
              Billable Type
            </Label>
            <select
              id='billable-type'
              name='billable_type'
              className={cn(
                'h-10 w-full rounded-md border border-input bg-background px-3 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
              )}
              value={formState.billableType}
              onChange={(event) => handleBillableTypeChange(event.target.value as 'estimate' | 'invoice')}
              disabled={mode === 'edit' || isReadOnly || pending}
            >
              {BILLABLE_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {canModifyUnits ? (
            <UnitSelection
              units={availableUnits}
              selectedIds={formState.selectedUnitIds}
              onToggle={(unitId, checked) => {
                updateFormState({
                  selectedUnitIds: checked
                    ? [...formState.selectedUnitIds, unitId]
                    : formState.selectedUnitIds.filter((id) => id !== unitId)
                });
              }}
              billableType={formState.billableType}
              disabled={pending}
            />
          ) : (
            <div className='grid gap-2'>
              <Label className='font-semibold'>Included Units</Label>
              {mode === 'edit' && initialBillable?.approved_ind && (
                <p className='text-xs text-muted-foreground'>
                  Approved billables cannot include additional service units.
                </p>
              )}
              {selectedUnitsForDisplay.length === 0 ? (
                <p className='text-sm text-muted-foreground'>No units assigned to this billable.</p>
              ) : (
                <ul className='max-h-72 space-y-2 overflow-y-auto pr-1 text-sm text-muted-foreground sm:max-h-80'>
                  {selectedUnitsForDisplay.map((unit) => (
                    <li
                      key={unit.id}
                      className='rounded-md border border-dashed border-border/60 px-3 py-2 text-left'
                    >
                      <p className='font-medium text-foreground'>{unit.title}</p>
                      <p className='text-xs'>
                        {unit.serviceName}
                        {unit.estCompletionDate
                          ? ` · Est. due ${unit.estCompletionDate}`
                          : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <StatusRow
            id='billable-approved'
            label='Approved?'
            checked={formState.approved}
            dateValue={formState.approvedDate}
            onToggle={(value) =>
              updateFormState({
                approved: value,
                approvedDate: value ? formState.approvedDate || todayInputValue() : ''
              })
            }
            onDateChange={(value) => updateFormState({ approvedDate: value })}
            disabled={pending || isReadOnly}
          />

          <StatusRow
            id='billable-completed'
            label='Completed?'
            checked={formState.completed}
            dateValue={formState.completedDate}
            onToggle={(value) =>
              updateFormState({
                completed: value,
                completedDate: value ? formState.completedDate || todayInputValue() : ''
              })
            }
            onDateChange={(value) => updateFormState({ completedDate: value })}
            disabled={pending || isReadOnly}
          />

          <StatusRow
            id='billable-paid'
            label='Paid?'
            checked={formState.paid}
            dateValue={formState.paidDate}
            onToggle={(value) =>
              updateFormState({
                paid: value,
                paidDate: value ? formState.paidDate || todayInputValue() : ''
              })
            }
            onDateChange={(value) => updateFormState({ paidDate: value })}
            disabled={pending || isReadOnly}
          />

          {mode === 'create' && availableUnits.length === 0 && (
            <p className='rounded-md border border-dashed border-border/60 p-3 text-sm text-muted-foreground'>
              No service units meet the criteria for this billable type. Adjust the billable type or add more service units.
            </p>
          )}

          <div className='flex justify-end gap-3 pt-2'>
            {isReadOnly ? (
              <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
                Close
              </Button>
            ) : (
              <>
                <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button type='submit' disabled={disableSubmit}>
                  {pending && <Spinner className='mr-2' />}
                  {mode === 'create' ? 'Create billable' : 'Save changes'}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type UnitSelectionProps = {
  units: UnitOption[];
  selectedIds: string[];
  onToggle: (unitId: string, checked: boolean) => void;
  billableType: 'estimate' | 'invoice';
  disabled?: boolean;
};

function UnitSelection({
  units,
  selectedIds,
  onToggle,
  billableType,
  disabled = false
}: UnitSelectionProps) {
  return (
    <div className='grid gap-2'>
      <Label className='font-semibold'>Select service units</Label>
      {units.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          No service units are available for the selected billable type.
        </p>
      ) : (
        <ul className='max-h-72 space-y-2 overflow-y-auto pr-1 sm:max-h-80'>
          {units.map((unit) => {
            const checked = selectedIds.includes(unit.id);
            return (
              <li
                key={unit.id}
                className='flex items-start gap-3 rounded-md border border-border/60 px-3 py-2'
              >
                <Checkbox
                  id={`unit-${unit.id}`}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(value) => onToggle(unit.id, Boolean(value))}
                />
                <label
                  htmlFor={`unit-${unit.id}`}
                  className={cn(
                    'flex flex-col gap-1 text-sm leading-tight',
                    disabled && 'cursor-not-allowed opacity-70'
                  )}
                >
                  <span className='font-medium text-foreground'>{unit.title}</span>
                  <span className='text-xs text-muted-foreground'>
                    {unit.serviceName} · {billableType === 'estimate' ? 'Pending approval' : 'Approved'}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type StatusRowProps = {
  id: string;
  label: string;
  checked: boolean;
  dateValue: string;
  onToggle: (value: boolean) => void;
  onDateChange: (value: string) => void;
  disabled?: boolean;
};

function StatusRow({
  id,
  label,
  checked,
  dateValue,
  onToggle,
  onDateChange,
  disabled = false
}: StatusRowProps) {
  return (
    <div className='flex flex-wrap items-center gap-3'>
      <div className='flex items-center gap-2'>
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => {
            if (disabled) return;
            onToggle(Boolean(value));
          }}
        />
        <label htmlFor={id} className='text-sm font-medium'>
          {label}
        </label>
      </div>
      <Input
        type='date'
        value={dateValue}
        onChange={(event) => onDateChange(event.target.value)}
        className='h-9 w-auto'
        disabled={!checked || disabled}
      />
    </div>
  );
}

function createDefaultFormState(): FormState {
  return {
    billableType: 'estimate',
    selectedUnitIds: [],
    approved: false,
    approvedDate: '',
    completed: false,
    completedDate: '',
    paid: false,
    paidDate: ''
  };
}

function createStateFromBillable(billable: ProjectBillableWithUnits): FormState {
  return {
    billableType: billable.billable_type,
    selectedUnitIds: billable.units?.map((unit) => unit.id) ?? [],
    approved: Boolean(billable.approved_ind),
    approvedDate: normalizeDateForInput(billable.approved_date),
    completed: Boolean(billable.completed_ind),
    completedDate: normalizeDateForInput(billable.completed_date),
    paid: Boolean(billable.paid_ind),
    paidDate: normalizeDateForInput(billable.paid_date)
  };
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

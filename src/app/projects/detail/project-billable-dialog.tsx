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

const BILLABLE_TYPES: Array<{ value: 'estimate' | 'invoice'; label: string }> = [
  { value: 'estimate', label: 'Estimate' },
  { value: 'invoice', label: 'Invoice' }
];

type ProjectBillableDialogProps = {
  projectId: string;
  services: ProjectServiceWithChildren[];
  serviceLookup: Map<string, string>;
  open: boolean;
  mode: 'create' | 'edit';
  onOpenChange: (open: boolean) => void;
  initialBillable?: ProjectBillableWithUnits;
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
  initialBillable
}: ProjectBillableDialogProps) {
  const [pending, setPending] = useState(false);
  const [formState, setFormState] = useState<FormState>(() => createDefaultFormState());

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
    if (mode !== 'create') return [];
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
  }, [mode, services, serviceLookup, formState.billableType]);

  useEffect(() => {
    if (mode !== 'create') return;
    const validIds = new Set(availableUnits.map((unit) => unit.id));
    setFormState((prev) => {
      if (availableUnits.length === 0 && prev.selectedUnitIds.length > 0) {
        return { ...prev, selectedUnitIds: [] };
      }
      const filteredIds = prev.selectedUnitIds.filter((id) => validIds.has(id));
      if (filteredIds.length === prev.selectedUnitIds.length) return prev;
      return { ...prev, selectedUnitIds: filteredIds };
    });
  }, [availableUnits, mode]);

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
    if (mode === 'create' && formState.selectedUnitIds.length === 0) {
      toast.error('Select at least one service unit.');
      return;
    }

    setPending(true);
    try {
      if (mode === 'create') {
        await createProjectBillable({
          project_id: projectId,
          billable_type: formState.billableType,
          service_unit_ids: formState.selectedUnitIds,
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

  const selectedUnitsForEdit = initialBillable?.units ?? [];

  const disableSubmit =
    pending || (mode === 'create' && formState.selectedUnitIds.length === 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader className='space-y-2'>
          <DialogTitle>{mode === 'create' ? 'Create Billable Group' : 'Update Billable'}</DialogTitle>
          <DialogDescription>
            Group project service units to prepare estimates or invoices for your client.
          </DialogDescription>
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
              disabled={mode === 'edit'}
            >
              {BILLABLE_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {mode === 'create' ? (
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
            />
          ) : (
            <div className='grid gap-2'>
              <Label className='font-semibold'>Included Units</Label>
              {selectedUnitsForEdit.length === 0 ? (
                <p className='text-sm text-muted-foreground'>No units assigned to this billable.</p>
              ) : (
                <ul className='space-y-2 text-sm text-muted-foreground'>
                  {selectedUnitsForEdit.map((unit) => {
                    const serviceName = unit.service_id
                      ? serviceLookup.get(unit.service_id) ?? 'Service'
                      : 'Service';
                    return (
                      <li key={unit.id} className='rounded-md border border-dashed border-border/60 px-3 py-2'>
                        <p className='font-medium text-foreground'>{unit.title}</p>
                        <p className='text-xs'>
                          {serviceName} · Est. due {unit.est_completion_date}
                        </p>
                      </li>
                    );
                  })}
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
          />

          {mode === 'create' && availableUnits.length === 0 && (
            <p className='rounded-md border border-dashed border-border/60 p-3 text-sm text-muted-foreground'>
              No service units meet the criteria for this billable type. Adjust the billable type or add more service units.
            </p>
          )}

          <div className='flex justify-end gap-3 pt-2'>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type='submit' disabled={disableSubmit}>
              {pending && <Spinner className='mr-2' />}
              {mode === 'create' ? 'Create billable' : 'Save changes'}
            </Button>
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
};

function UnitSelection({ units, selectedIds, onToggle, billableType }: UnitSelectionProps) {
  return (
    <div className='grid gap-2'>
      <Label className='font-semibold'>Select service units</Label>
      {units.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          No service units are available for the selected billable type.
        </p>
      ) : (
        <ul className='grid gap-2'>
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
                  onCheckedChange={(value) => onToggle(unit.id, Boolean(value))}
                />
                <label htmlFor={`unit-${unit.id}`} className='flex flex-col gap-1 text-sm leading-tight'>
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
};

function StatusRow({ id, label, checked, dateValue, onToggle, onDateChange }: StatusRowProps) {
  return (
    <div className='flex flex-wrap items-center gap-3'>
      <div className='flex items-center gap-2'>
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(value) => onToggle(Boolean(value))}
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
        disabled={!checked}
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

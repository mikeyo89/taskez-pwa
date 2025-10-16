'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  createProjectService,
  updateProjectService,
  type ProjectServiceWithChildren
} from '@/lib/actions/projects';
import type { Service } from '@/lib/models';
import { cn } from '@/lib/utils';

type ProjectServiceDialogProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  serviceOptions: Service[];
  initialService?: ProjectServiceWithChildren;
  onCompleted?: (serviceId: string) => void;
};

type FormState = {
  serviceId: string;
  budgetType: 'dollar' | 'percent';
  budgetAmount: string;
  estCompletionDate: string;
  approved: boolean;
  approvedDate: string;
  completed: boolean;
  completedDate: string;
  paid: boolean;
  paidDate: string;
};

export function ProjectServiceDialog({
  projectId,
  open,
  onOpenChange,
  mode,
  serviceOptions,
  initialService,
  onCompleted
}: ProjectServiceDialogProps) {
  const [pending, setPending] = useState(false);
  const [currentService, setCurrentService] = useState<ProjectServiceWithChildren | null>(null);
  const [formState, setFormState] = useState<FormState>(() => createDefaultFormState());

  useEffect(() => {
    if (!open) {
      setPending(false);
      setCurrentService(null);
      setFormState(createDefaultFormState());
      return;
    }

    if (initialService) {
      setCurrentService(initialService);
      setFormState(createStateFromService(initialService));
    } else {
      setCurrentService(null);
      setFormState(createDefaultFormState());
    }
  }, [initialService, open]);

  const handleOpenChange = (next: boolean) => {
    if (!pending) {
      onOpenChange(next);
    }
  };

  const updateFormState = (patch: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = async () => {
    if (!formState.serviceId) {
      toast.error('Select a service.');
      return;
    }
    if (!formState.estCompletionDate) {
      toast.error('Estimated completion date is required.');
      return;
    }
    const amount = Number(formState.budgetAmount);
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Enter a valid budget amount.');
      return;
    }

    setPending(true);
    try {
      if (!currentService || mode === 'create') {
        const created = await createProjectService({
          project_id: projectId,
          service_id: formState.serviceId,
          budget_type: formState.budgetType,
          budget_amount: amount,
          est_completion_date: formState.estCompletionDate,
          approved_ind: formState.approved,
          approved_date: normalizedDateForPersistence(formState.approved, formState.approvedDate),
          completed_ind: formState.completed,
          completed_date: normalizedDateForPersistence(formState.completed, formState.completedDate),
          paid_ind: formState.paid,
          paid_date: normalizedDateForPersistence(formState.paid, formState.paidDate)
        });
        toast.success('Project service created');
        onCompleted?.(created.id);
      } else {
        const updated = await updateProjectService(currentService.id, {
          project_id: projectId,
          service_id: formState.serviceId,
          budget_type: formState.budgetType,
          budget_amount: amount,
          est_completion_date: formState.estCompletionDate,
          approved_ind: formState.approved,
          approved_date: normalizedDateForPersistence(formState.approved, formState.approvedDate),
          completed_ind: formState.completed,
          completed_date: normalizedDateForPersistence(formState.completed, formState.completedDate),
          paid_ind: formState.paid,
          paid_date: normalizedDateForPersistence(formState.paid, formState.paidDate)
        });
        setCurrentService((prev) =>
          prev ? { ...prev, ...updated } : { ...updated, units: [], extras: [] }
        );
        toast.success('Project service updated');
        onCompleted?.(currentService?.id ?? initialService?.id ?? updated.id);
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Unable to save project service. Try again.');
    } finally {
      setPending(false);
    }
  };

  const handleCancel = () => {
    if (!pending) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader className='space-y-2'>
          <DialogTitle>
            {mode === 'create' ? 'Add Service to Project' : 'Update Project Service'}
          </DialogTitle>
          <DialogDescription>
            Link your services to track budgets, completion, and billing milestones.
          </DialogDescription>
        </DialogHeader>

        <ProjectServiceForm
          mode={mode}
          state={formState}
          serviceOptions={serviceOptions}
          pending={pending}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          updateState={updateFormState}
        />
      </DialogContent>
    </Dialog>
  );
}

type ProjectServiceFormProps = {
  mode: 'create' | 'edit';
  state: FormState;
  updateState: (patch: Partial<FormState>) => void;
  serviceOptions: Service[];
  pending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

function ProjectServiceForm({
  mode,
  state,
  updateState,
  serviceOptions,
  pending,
  onSubmit,
  onCancel
}: ProjectServiceFormProps) {
  return (
    <form
      className='grid gap-4'
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className='grid gap-2'>
        <Label htmlFor='service-select' className='font-semibold'>
          Service
        </Label>
        <select
          id='service-select'
          name='service_id'
          required
          className={cn(
            'h-10 w-full rounded-md border border-input bg-background px-3 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
          )}
          value={state.serviceId}
          onChange={(event) => updateState({ serviceId: event.target.value })}
        >
          <option value='' disabled>
            Select service…
          </option>
          {serviceOptions.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='grid gap-2'>
          <Label htmlFor='budget-type' className='font-semibold'>
            Budget Type
          </Label>
          <select
            id='budget-type'
            name='budget_type'
            className={cn(
              'h-10 w-full rounded-md border border-input bg-background px-3 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
            )}
            value={state.budgetType}
            onChange={(event) =>
              updateState({
                budgetType: event.target.value as FormState['budgetType']
              })
            }
          >
            <option value='dollar'>$ (Dollar)</option>
            <option value='percent'>% (Percent)</option>
          </select>
        </div>
        <div className='grid gap-2'>
          <Label htmlFor='budget-amount' className='font-semibold'>
            Budget Amount
          </Label>
          <Input
            id='budget-amount'
            name='budget_amount'
            type='number'
            min='0'
            step='0.01'
            value={state.budgetAmount}
            onChange={(event) => updateState({ budgetAmount: event.target.value })}
            required
          />
        </div>
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='est-completion' className='font-semibold'>
          Estimated Completion Date
        </Label>
        <Input
          id='est-completion'
          name='est_completion_date'
          type='date'
          value={state.estCompletionDate}
          onChange={(event) => updateState({ estCompletionDate: event.target.value })}
          required
        />
      </div>

      <StatusRow
        id='approved'
        label='Approved?'
        checked={state.approved}
        dateValue={state.approvedDate}
        onToggle={(value) =>
          updateState({
            approved: value,
            approvedDate: value ? state.approvedDate || todayInputValue() : ''
          })
        }
        onDateChange={(value) => updateState({ approvedDate: value })}
      />

      <StatusRow
        id='completed'
        label='Completed?'
        checked={state.completed}
        dateValue={state.completedDate}
        onToggle={(value) =>
          updateState({
            completed: value,
            completedDate: value ? state.completedDate || todayInputValue() : ''
          })
        }
        onDateChange={(value) => updateState({ completedDate: value })}
      />

      <StatusRow
        id='paid'
        label='Paid?'
        checked={state.paid}
        dateValue={state.paidDate}
        onToggle={(value) =>
          updateState({
            paid: value,
            paidDate: value ? state.paidDate || todayInputValue() : ''
          })
        }
        onDateChange={(value) => updateState({ paidDate: value })}
      />

      <p className='text-xs text-muted-foreground'>
        Save the service to manage its units from the detail view.
      </p>

      <div className='flex justify-end gap-3 pt-2'>
        <Button type='button' variant='outline' onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type='submit' disabled={pending}>
          {pending && <Spinner className='mr-2' />}
          {mode === 'create' ? 'Save service' : 'Update service'}
        </Button>
      </div>
    </form>
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
        <input
          id={`${id}-checkbox`}
          type='checkbox'
          checked={checked}
          onChange={(event) => onToggle(event.target.checked)}
          className='h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
        />
        <Label htmlFor={`${id}-checkbox`} className='font-semibold'>
          {label}
        </Label>
      </div>
      {checked && (
        <Input
          id={`${id}-date`}
          type='date'
          value={normalizeDateForInput(dateValue)}
          onChange={(event) => onDateChange(event.target.value)}
          className='max-w-[180px]'
          required
        />
      )}
    </div>
  );
}

function createDefaultFormState(): FormState {
  return {
    serviceId: '',
    budgetType: 'dollar',
    budgetAmount: '',
    estCompletionDate: '',
    approved: false,
    approvedDate: '',
    completed: false,
    completedDate: '',
    paid: false,
    paidDate: ''
  };
}

function createStateFromService(service: ProjectServiceWithChildren): FormState {
  return {
    serviceId: service.service_id,
    budgetType: service.budget_type,
    budgetAmount: String(service.budget_amount),
    estCompletionDate: normalizeDateForInput(service.est_completion_date),
    approved: Boolean(service.approved_ind),
    approvedDate: normalizeDateForInput(service.approved_date),
    completed: Boolean(service.completed_ind),
    completedDate: normalizeDateForInput(service.completed_date),
    paid: Boolean(service.paid_ind),
    paidDate: normalizeDateForInput(service.paid_date)
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

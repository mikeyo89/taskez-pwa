'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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

import { ProjectServiceUnitsSection } from './project-service-units-section';

type StepKey = 'service' | 'units';

type ProjectServiceDialogProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  serviceOptions: Service[];
  initialService?: ProjectServiceWithChildren;
};

type StepOneState = {
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
  initialService
}: ProjectServiceDialogProps) {
  const [activeStep, setActiveStep] = useState<StepKey>('service');
  const [pending, setPending] = useState(false);
  const [currentService, setCurrentService] = useState<ProjectServiceWithChildren | null>(null);
  const [stepState, setStepState] = useState<StepOneState>(() => createDefaultStepState());

  useEffect(() => {
    if (!open) {
      setActiveStep('service');
      setCurrentService(null);
      setStepState(createDefaultStepState());
      setPending(false);
      return;
    }

    if (initialService) {
      setCurrentService(initialService);
      setStepState(createStateFromService(initialService));
    } else {
      setCurrentService(null);
      setStepState(createDefaultStepState());
    }
    setActiveStep('service');
  }, [initialService, open]);

  const serviceNameLookup = useMemo(
    () => new Map(serviceOptions.map((service) => [service.id, service.name])),
    [serviceOptions]
  );

  const handleOpenChange = (next: boolean) => {
    if (!pending) {
      onOpenChange(next);
    }
  };

  const updateStepState = (patch: Partial<StepOneState>) => {
    setStepState((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmitStepOne = async () => {
    if (!stepState.serviceId) {
      toast.error('Select a service.');
      return;
    }
    if (!stepState.estCompletionDate) {
      toast.error('Estimated completion date is required.');
      return;
    }
    const amount = Number(stepState.budgetAmount);
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Enter a valid budget amount.');
      return;
    }

    setPending(true);
    try {
      if (!currentService || mode === 'create') {
        const created = await createProjectService({
          project_id: projectId,
          service_id: stepState.serviceId,
          budget_type: stepState.budgetType,
          budget_amount: amount,
          est_completion_date: stepState.estCompletionDate,
          approved_ind: stepState.approved,
          approved_date: normalizedDateForPersistence(stepState.approved, stepState.approvedDate),
          completed_ind: stepState.completed,
          completed_date: normalizedDateForPersistence(
            stepState.completed,
            stepState.completedDate
          ),
          paid_ind: stepState.paid,
          paid_date: normalizedDateForPersistence(stepState.paid, stepState.paidDate)
        });
        setCurrentService({ ...created, units: [], extras: [] });
        toast.success('Project service created');
      } else {
        const updated = await updateProjectService(currentService.id, {
          project_id: projectId,
          service_id: stepState.serviceId,
          budget_type: stepState.budgetType,
          budget_amount: amount,
          est_completion_date: stepState.estCompletionDate,
          approved_ind: stepState.approved,
          approved_date: normalizedDateForPersistence(stepState.approved, stepState.approvedDate),
          completed_ind: stepState.completed,
          completed_date: normalizedDateForPersistence(
            stepState.completed,
            stepState.completedDate
          ),
          paid_ind: stepState.paid,
          paid_date: normalizedDateForPersistence(stepState.paid, stepState.paidDate)
        });
        setCurrentService((prev) =>
          prev ? { ...prev, ...updated } : { ...updated, units: [], extras: [] }
        );
        toast.success('Project service updated');
      }
      setActiveStep('units');
    } catch (error) {
      console.error(error);
      toast.error('Unable to save project service. Try again.');
    } finally {
      setPending(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const canAccessUnits = Boolean(currentService);

  const serviceName =
    currentService && serviceNameLookup.get(currentService.service_id)
      ? serviceNameLookup.get(currentService.service_id)!
      : undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:min-w-[100vw] max-h-[90vh] overflow-y-scroll'>
        <div className='flex h-full flex-col gap-4 overflow-y-scroll'>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Add Service to Project' : 'Update Project Service'}
            </DialogTitle>
            <DialogDescription>
              Link your services to track budgets, completion, and billing milestones.
            </DialogDescription>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto pr-1'>
            <div className='flex flex-col gap-4 pb-1'>
              <StepperNav
                activeStep={activeStep}
                canAccessUnits={canAccessUnits}
                onSelectStep={(step) => {
                  if (step === 'units' && !canAccessUnits) return;
                  setActiveStep(step);
                }}
                serviceName={serviceName}
              />

              <div className='space-y-3'>
                <StepCard
                  index={1}
                  title='Project Service'
                  description='Define the service and its budget.'
                  active={activeStep === 'service'}
                  completed={canAccessUnits}
                  onSelect={() => setActiveStep('service')}
                >
                  <ProjectServiceStepForm
                    serviceOptions={serviceOptions}
                    state={stepState}
                    updateState={updateStepState}
                    pending={pending}
                    onSubmit={handleSubmitStepOne}
                    onCancel={handleCancel}
                  />
                </StepCard>

                <StepCard
                  index={2}
                  title='Units'
                  description='Break the work into trackable units.'
                  active={activeStep === 'units'}
                  completed={false}
                  disabled={!canAccessUnits}
                  onSelect={() => canAccessUnits && setActiveStep('units')}
                >
                  <ProjectServiceUnitsSection
                    projectServiceId={currentService?.id}
                    serviceName={serviceName}
                  />
                </StepCard>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type StepCardProps = {
  index: number;
  title: string;
  description: string;
  active: boolean;
  completed?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  children: ReactNode;
};

function StepCard({
  index,
  title,
  description,
  active,
  completed = false,
  disabled = false,
  onSelect,
  children
}: StepCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border transition-colors',
        active
          ? 'border-primary/70 bg-primary/10'
          : 'border-border/60 bg-muted/10 hover:border-primary/40',
        disabled && 'opacity-60'
      )}
    >
      <button
        type='button'
        onClick={onSelect}
        disabled={disabled}
        className='flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed'
      >
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
            active || completed
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {completed && !active ? '✓' : index}
        </span>
        <div className='flex flex-1 flex-col'>
          <span className='text-sm font-semibold text-foreground'>{title}</span>
          <span className='text-xs text-muted-foreground'>{description}</span>
        </div>
      </button>
      <div className={cn('grid gap-4 px-4 pb-4', active ? 'pt-2' : 'hidden')}>{children}</div>
    </div>
  );
}

type ProjectServiceStepFormProps = {
  state: StepOneState;
  updateState: (patch: Partial<StepOneState>) => void;
  serviceOptions: Service[];
  pending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

function ProjectServiceStepForm({
  state,
  updateState,
  serviceOptions,
  pending,
  onSubmit,
  onCancel
}: ProjectServiceStepFormProps) {
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
                budgetType: event.target.value as StepOneState['budgetType']
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

      <div className='flex justify-end gap-3 pt-2'>
        <Button type='button' variant='outline' onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type='submit' disabled={pending}>
          {pending && <Spinner className='mr-2' />}
          Save &amp; Next
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

function StepperNav({
  activeStep,
  canAccessUnits,
  onSelectStep,
  serviceName
}: {
  activeStep: StepKey;
  canAccessUnits: boolean;
  onSelectStep: (step: StepKey) => void;
  serviceName?: string;
}) {
  return (
    <nav className='flex items-center gap-3 text-xs font-semibold uppercase text-muted-foreground'>
      <button
        type='button'
        onClick={() => onSelectStep('service')}
        className={cn(
          'rounded-full px-3 py-1 transition-colors',
          activeStep === 'service' ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        Service
      </button>
      <span className='opacity-60'>→</span>
      <button
        type='button'
        onClick={() => (canAccessUnits ? onSelectStep('units') : undefined)}
        className={cn(
          'rounded-full px-3 py-1 transition-colors',
          activeStep === 'units'
            ? 'bg-primary text-primary-foreground'
            : canAccessUnits
            ? 'bg-muted'
            : 'bg-muted/60 cursor-not-allowed'
        )}
        disabled={!canAccessUnits}
      >
        Units {serviceName ? `: ${serviceName}` : ''}
      </button>
    </nav>
  );
}

function createDefaultStepState(): StepOneState {
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

function createStateFromService(service: ProjectServiceWithChildren): StepOneState {
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

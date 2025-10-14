'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import type { Client, Project } from '@/lib/models';
import { cn } from '@/lib/utils';
import { Label } from '@radix-ui/react-label';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { createProject, deleteProject, updateProject } from '@/lib/actions/projects';

type SharedProjectFields = {
  title: string;
  description: string;
  budget: string;
  est_completion_date: string;
};

function normalizeDateForInput(value?: string | null) {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
}

function parseBudget(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
}

function extractSharedFields(form: FormData): SharedProjectFields {
  return {
    title: String(form.get('title') ?? '').trim(),
    description: String(form.get('description') ?? '').trim(),
    budget: String(form.get('budget') ?? '').trim(),
    est_completion_date: String(form.get('est_completion_date') ?? '').trim()
  };
}

type AddProjectDialogProps = {
  clients: Client[];
};

export function AddProjectDialog({ clients }: AddProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const hasClients = clients.length > 0;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const clientId = String(form.get('client_id') ?? '');
    const { title, description, budget, est_completion_date } = extractSharedFields(form);

    if (!clientId) {
      toast.error('Select a client for this project.');
      return;
    }
    if (!title) {
      toast.error('Title field is required.');
      return;
    }
    if (!est_completion_date) {
      toast.error('Estimated completion date is required.');
      return;
    }

    setPending(true);
    try {
      await createProject({
        client_id: clientId,
        title,
        description,
        budget: parseBudget(budget),
        est_completion_date,
        completed_ind: false,
        completed_date: ''
      });
      toast.success('Project created');
      event.currentTarget.reset();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Unable to create project. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (hasClients ? setOpen(next) : undefined)}>
      <DialogTrigger asChild>
        <Button
          size='icon-lg'
          className='fixed bottom-28 right-6 z-40 rounded-full shadow-lg'
          style={{
            boxShadow: '0 10px 30px -15px color-mix(in srgb, var(--primary) 55%, transparent)'
          }}
          aria-label='Create new project'
          onClick={(event) => {
            if (!hasClients) {
              event.preventDefault();
              toast.error('Add at least one client before creating a project.');
            }
          }}
        >
          <Plus className='h-5 w-5' aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[420px]'>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add Project</DialogTitle>
            <DialogDescription>Plan and budget your next engagement.</DialogDescription>
          </DialogHeader>
          <Separator className='my-3' />
          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='client-select' className='font-semibold'>
                Client
              </Label>
              <select
                id='client-select'
                name='client_id'
                required
                className={cn(
                  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
                )}
                defaultValue=''
              >
                <option value='' disabled>
                  Select client…
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='title-new' className='font-semibold'>
                Title
              </Label>
              <Input id='title-new' name='title' placeholder='Website refresh' required />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='description-new' className='font-semibold'>
                Description
              </Label>
              <Input
                id='description-new'
                name='description'
                placeholder='Optional summary'
                autoComplete='off'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='budget-new' className='font-semibold'>
                Budget
              </Label>
              <Input
                id='budget-new'
                name='budget'
                type='number'
                min='0'
                step='0.01'
                placeholder='0.00'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='est_completion_date-new' className='font-semibold'>
                Estimated Completion Date
              </Label>
              <Input id='est_completion_date-new' name='est_completion_date' type='date' required />
            </div>
          </div>
          <DialogFooter className='mt-6'>
            <DialogClose asChild>
              <Button type='button' variant='outline'>
                Cancel
              </Button>
            </DialogClose>
            <Button type='submit' disabled={pending}>
              {pending && <Spinner className='mr-2' />}
              {pending ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type UpdateProjectDialogProps = {
  project: Project;
  clientName?: string;
  open: boolean;
  onOpenChange: (value: boolean) => void;
};

export function UpdateProjectDialog({
  project,
  clientName,
  open,
  onOpenChange
}: UpdateProjectDialogProps) {
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState(project.completed_ind);

  useEffect(() => {
    setCompleted(project.completed_ind);
  }, [project]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { title, description, budget, est_completion_date } = extractSharedFields(form);
    const completedFlag = Boolean(form.get('completed_ind'));
    const completedDate = completedFlag ? String(form.get('completed_date') ?? '').trim() : '';

    if (!title) {
      toast.error('Title field is required.');
      return;
    }
    if (!est_completion_date) {
      toast.error('Estimated completion date is required.');
      return;
    }
    if (completedFlag && !completedDate) {
      toast.error('Provide a completion date or uncheck completed.');
      return;
    }

    setPending(true);
    try {
      await updateProject(project.id, {
        title,
        description,
        budget: parseBudget(budget),
        est_completion_date,
        completed_ind: completedFlag,
        completed_date: completedDate
      });
      toast.success('Project updated');
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Unable to update project. Try again.');
    } finally {
      setPending(false);
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!pending) {
      onOpenChange(next);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-[440px]'>
        <form key={project.id} onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update the details for this engagement.</DialogDescription>
          </DialogHeader>
          <Separator className='my-3' />
          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label className='font-semibold'>Client</Label>
              <Input value={clientName ?? 'Unknown client'} readOnly disabled />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='title-edit' className='font-semibold'>
                Title
              </Label>
              <Input
                id='title-edit'
                name='title'
                defaultValue={project.title}
                placeholder='Project title'
                required
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='description-edit' className='font-semibold'>
                Description
              </Label>
              <Input
                id='description-edit'
                name='description'
                defaultValue={project.description ?? ''}
                placeholder='Optional summary'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='budget-edit' className='font-semibold'>
                Budget
              </Label>
              <Input
                id='budget-edit'
                name='budget'
                type='number'
                min='0'
                step='0.01'
                defaultValue={
                  typeof project.budget === 'number' && !Number.isNaN(project.budget)
                    ? project.budget
                    : ''
                }
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='est_completion_date-edit' className='font-semibold'>
                Estimated Completion Date
              </Label>
              <Input
                id='est_completion_date-edit'
                name='est_completion_date'
                type='date'
                required
                defaultValue={normalizeDateForInput(project.est_completion_date)}
              />
            </div>
            <div className='grid gap-2'>
              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-2'>
                  <input
                    id='completed-ind'
                    name='completed_ind'
                    type='checkbox'
                    checked={completed}
                    onChange={(event) => setCompleted(event.target.checked)}
                    className='h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
                  />
                  <Label htmlFor='completed-ind' className='font-semibold pt-2 pb-2'>
                    Completed?
                  </Label>
                </div>
                {completed && (
                  <Input
                    id='completed-date'
                    name='completed_date'
                    type='date'
                    required
                    defaultValue={normalizeDateForInput(project.completed_date)}
                    className='max-w-[180px]'
                  />
                )}
              </div>
            </div>
          </div>
          <DialogFooter className='mt-6'>
            <DialogClose asChild>
              <Button type='button' variant='outline' disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type='submit' disabled={pending}>
              {pending && <Spinner className='mr-2' />}
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type DeleteProjectDialogProps = {
  project: Project | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
};

export function DeleteProjectDialog({ project, open, onOpenChange }: DeleteProjectDialogProps) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!project) return;
    setPending(true);
    try {
      await deleteProject(project.id);
      toast.success('Project deleted');
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Unable to delete project. Try again.');
    } finally {
      setPending(false);
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!pending) {
      onOpenChange(next);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-[360px]'>
        <DialogHeader>
          <DialogTitle>Delete Project?</DialogTitle>
          <DialogDescription>
            {project
              ? `“${project.title}” will be removed permanently. This action cannot be undone.`
              : 'This project will be removed permanently. This action cannot be undone.'}
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

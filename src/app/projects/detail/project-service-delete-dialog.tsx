'use client';

import { useState } from 'react';
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
import { Spinner } from '@/components/ui/spinner';
import { deleteProjectService } from '@/lib/actions/projects';
import type { ProjectServiceWithChildren } from '@/lib/actions/projects';

type ProjectServiceDeleteDialogProps = {
  service: ProjectServiceWithChildren | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceLookup: Map<string, string>;
};

export function ProjectServiceDeleteDialog({
  service,
  open,
  onOpenChange,
  serviceLookup
}: ProjectServiceDeleteDialogProps) {
  const [pending, setPending] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!pending) {
      onOpenChange(next);
    }
  };

  const handleDelete = async () => {
    if (!service) return;
    setPending(true);
    try {
      await deleteProjectService(service.id);
      toast.success('Project service removed');
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Unable to delete project service. Try again.');
    } finally {
      setPending(false);
    }
  };

  const serviceName = service ? serviceLookup.get(service.service_id) ?? 'this service' : 'this service';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-[360px]'>
        <DialogHeader>
          <DialogTitle>Remove Service?</DialogTitle>
          <DialogDescription>
            {service
              ? `“${serviceName}” will be detached from this project. This action cannot be undone.`
              : 'This service will be detached from the project. This action cannot be undone.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className='mt-6'>
          <DialogClose asChild>
            <Button type='button' variant='outline' disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type='button'
            variant='destructive'
            onClick={handleDelete}
            disabled={pending}
          >
            {pending && <Spinner className='mr-2' />}
            {pending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

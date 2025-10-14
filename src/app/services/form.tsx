'use Service';

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
import { Label } from '@radix-ui/react-label';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { createService, updateService } from '@/lib/actions/services';
import type { Service } from '@/lib/models';

export function AddServiceDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();

    if (!name) return; // add your own toast/validation
    setPending(true);
    try {
      await createService({ name, description });
      toast.success('Service added');
      e.currentTarget?.reset();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Unable to add Service. Try again.');
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={(next) => setOpen(next)}>
      <DialogTrigger asChild>
        <Button
          onClick={() => setOpen(true)}
          size='icon-lg'
          className='fixed bottom-28 right-6 z-40 rounded-full shadow-lg'
          style={{
            boxShadow: '0 10px 30px -15px color-mix(in srgb, var(--primary) 55%, transparent)'
          }}
          aria-label='Create new Service'
        >
          <Plus className='h-5 w-5' aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
            <DialogDescription>The project work you do for clients.</DialogDescription>
          </DialogHeader>
          <Separator className='my-3' />
          <div className='grid gap-4'>
            <div className='grid gap-3'>
              <Label htmlFor='name-1' className='font-semibold'>
                Name
              </Label>
              <Input id='name-1' name='name' placeholder='Framing | Siding | Roofing' required />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='description-1' className='font-semibold'>
                Description
              </Label>
              <Input id='description-1' name='description' placeholder='Optional' />
            </div>
            <div />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline'>Cancel</Button>
            </DialogClose>
            <Button type='submit' disabled={pending}>
              {pending && <Spinner />}
              {pending ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UpdateServiceDialog({
  Service,
  open,
  onOpenChange
}: {
  Service: Service;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();
    if (!name) return;
    setPending(true);
    try {
      await updateService(Service.id, { name, description });
      toast.success('Service updated');
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Unable to update Service. Try again.');
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
      <DialogContent className='sm:max-w-[425px]'>
        <form key={Service.id} onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>Update the core details of this Service.</DialogDescription>
          </DialogHeader>

          <Separator className='my-3' />

          <div className='grid gap-4'>
            <div className='grid gap-3'>
              <Label htmlFor='name-update' className='font-semibold'>
                Name
              </Label>
              <Input
                id='name-update'
                name='name'
                defaultValue={Service.name}
                placeholder='Service name'
                required
              />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='description-update' className='font-semibold'>
                Description
              </Label>
              <Input
                id='description-update'
                name='description'
                defaultValue={Service.description ?? ''}
                placeholder='Optional'
              />
            </div>
            <div />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline' type='button'>
                Cancel
              </Button>
            </DialogClose>
            <Button type='submit' disabled={pending}>
              {pending && <Spinner />}
              {pending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

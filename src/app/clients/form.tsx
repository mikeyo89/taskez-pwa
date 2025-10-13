'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@radix-ui/react-label';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';

export function AddClientDialog() {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button
            size='icon-lg'
            className='rounded-full shadow-lg'
            style={{
              boxShadow: '0 10px 30px -15px color-mix(in srgb, var(--primary) 55%, transparent)'
            }}
            aria-label='Create new client'
          >
            <Plus className='h-5 w-5' aria-hidden />
          </Button>
        </DialogTrigger>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
            <DialogDescription>
              Define the client information that appears in Emails and Invoices.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4'>
            <div className='grid gap-3'>
              <Label htmlFor='name-1' className='font-semibold'>
                Name
              </Label>
              <Input id='name-1' name='name' placeholder='Jeff Harding Realty Group LLC' required />
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
            <Button type='submit'>Add</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

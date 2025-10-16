'use client';

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
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Label } from '@radix-ui/react-label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { addMember, updateMember } from '@/lib/actions/clients';
import type { Member } from '@/lib/models';

const MemberFormSchema = z
  .object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    phone: z.string().optional()
  })
  .transform((values) => ({
    ...values,
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    email: values.email.trim(),
    phone: (values.phone ?? '').trim()
  }));

type MemberFormValues = z.infer<typeof MemberFormSchema>;

function parseMemberForm(form: FormData): MemberFormValues | null {
  const candidate = {
    first_name: String(form.get('first_name') ?? ''),
    last_name: String(form.get('last_name') ?? ''),
    email: String(form.get('email') ?? ''),
    phone: String(form.get('phone') ?? '')
  };

  const parsed = MemberFormSchema.safeParse(candidate);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Please review the form and try again.';
    toast.error(message);
    return null;
  }
  return parsed.data;
}

type CreateMemberDialogProps = {
  clientId: string;
  open: boolean;
  onOpenChange: (value: boolean) => void;
};

export function CreateMemberDialog({ clientId, open, onOpenChange }: CreateMemberDialogProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: MemberFormValues) => addMember(clientId, payload),
    onSuccess: async (_, payload) => {
      toast.success(`${payload.first_name} added to client`);
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: ['clients', clientId, 'members'] });
    },
    onError: (error: unknown) => {
      console.error(error);
      toast.error('Unable to add member. Try again.');
    }
  });

  useEffect(() => {
    if (!open) {
      mutation.reset();
    }
  }, [mutation, open]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const values = parseMemberForm(form);
    if (!values) return;
    await mutation.mutateAsync(values);
    formElement.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>Maintain your client roster in one place.</DialogDescription>
          </DialogHeader>
          <Separator className='my-3' />
          <div className='grid gap-4 pb-2'>
            <div className='grid gap-3'>
              <Label htmlFor='first_name-create' className='font-semibold'>
                First Name
              </Label>
              <Input
                id='first_name-create'
                name='first_name'
                placeholder='Taylor'
                required
                autoFocus
              />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='last_name-create' className='font-semibold'>
                Last Name
              </Label>
              <Input id='last_name-create' name='last_name' placeholder='Morgan' required />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='email-create' className='font-semibold'>
                Email
              </Label>
              <Input id='email-create' name='email' type='email' placeholder='taylor@client.com' />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='phone-create' className='font-semibold'>
                Phone
              </Label>
              <Input id='phone-create' name='phone' placeholder='(555) 555-1212' />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline' type='button'>
                Cancel
              </Button>
            </DialogClose>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending && <Spinner />}
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type UpdateMemberDialogProps = {
  member: Member;
  open: boolean;
  onOpenChange: (value: boolean) => void;
};

export function UpdateMemberDialog({ member, open, onOpenChange }: UpdateMemberDialogProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: MemberFormValues) => updateMember(member.id, payload),
    onSuccess: async (_, payload) => {
      toast.success(`${payload.first_name} updated`);
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: ['clients', member.client_id, 'members'] });
    },
    onError: (error: unknown) => {
      console.error(error);
      toast.error('Unable to update member. Try again.');
    }
  });

  useEffect(() => {
    if (!open) {
      mutation.reset();
    }
  }, [mutation, open]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = parseMemberForm(form);
    if (!values) return;
    await mutation.mutateAsync(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <form key={member.id} onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>Keep contact details current.</DialogDescription>
          </DialogHeader>
          <Separator className='my-3' />
          <div className='grid gap-4 pb-4'>
            <div className='grid gap-3'>
              <Label htmlFor='first_name-update' className='font-semibold'>
                First Name
              </Label>
              <Input
                id='first_name-update'
                name='first_name'
                defaultValue={member.first_name}
                required
              />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='last_name-update' className='font-semibold'>
                Last Name
              </Label>
              <Input
                id='last_name-update'
                name='last_name'
                defaultValue={member.last_name}
                required
              />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='email-update' className='font-semibold'>
                Email
              </Label>
              <Input
                id='email-update'
                name='email'
                type='email'
                defaultValue={member.email}
                required
              />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='phone-update' className='font-semibold'>
                Phone
              </Label>
              <Input
                id='phone-update'
                name='phone'
                defaultValue={member.phone ?? ''}
                placeholder='Optional'
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline' type='button'>
                Cancel
              </Button>
            </DialogClose>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending && <Spinner />}
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { z } from 'zod';

export const ClientSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime()
});
export type Client = z.infer<typeof ClientSchema>;

export const MemberSchema = z.object({
  id: z.uuid(),
  client_id: z.uuid(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.email(),
  phone: z.string().optional().default(''),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime()
});
export type Member = z.infer<typeof MemberSchema>;

export const ServiceSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime()
});
export type Service = z.infer<typeof ServiceSchema>;

import { z } from 'zod';

import { ACCENT_KEYS } from './appearance';

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

export const ProjectSchema = z.object({
  id: z.uuid(),
  client_id: z.uuid(),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  budget: z.number().nonnegative().optional(),
  est_completion_date: z.string(),
  completed_ind: z.boolean().default(false),
  completed_date: z.string().optional().default(''),
  updated_at: z.iso.datetime()
});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectEventSchema = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  reason: z.string().min(1),
  notes: z.string().optional().default(''),
  updated_at: z.iso.datetime()
});
export type ProjectEvent = z.infer<typeof ProjectEventSchema>;

export const ProjectServiceSchema = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  service_id: z.uuid(),
  budget_type: z.enum(['dollar', 'percent']),
  budget_amount: z.number().nonnegative(),
  est_completion_date: z.string(),
  approved_ind: z.boolean().default(false),
  approved_date: z.string().optional().default(''),
  completed_ind: z.boolean().default(false),
  completed_date: z.string().optional().default(''),
  paid_ind: z.boolean().default(false),
  paid_date: z.string().optional().default(''),
  updated_at: z.iso.datetime()
});
export type ProjectService = z.infer<typeof ProjectServiceSchema>;

export const ProjectServiceUnitSchema = z.object({
  id: z.uuid(),
  project_service_id: z.uuid(),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  budget_type: z.enum(['dollar', 'percent']),
  budget_amount: z.number().nonnegative(),
  est_completion_date: z.string(),
  approved_ind: z.boolean().default(false),
  approved_date: z.string().optional().default(''),
  completed_ind: z.boolean().default(false),
  completed_date: z.string().optional().default(''),
  paid_ind: z.boolean().default(false),
  paid_date: z.string().optional().default(''),
  updated_at: z.iso.datetime()
});
export type ProjectServiceUnit = z.infer<typeof ProjectServiceUnitSchema>;

export const ProjectServiceExtraSchema = z.object({
  id: z.uuid(),
  project_service_id: z.uuid(),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  budget_type: z.enum(['dollar']).optional().default('dollar'),
  budget_amount: z.number().nonnegative(),
  est_completion_date: z.string(),
  approved_ind: z.boolean().default(false),
  approved_date: z.string().optional().default(''),
  completed_ind: z.boolean().default(false),
  completed_date: z.string().optional().default(''),
  paid_ind: z.boolean().default(false),
  paid_date: z.string().optional().default(''),
  updated_at: z.iso.datetime()
});
export type ProjectServiceExtra = z.infer<typeof ProjectServiceExtraSchema>;

export const ProfileSchema = z.object({
  id: z.string(),
  company_name: z.string().max(120).optional().default(''),
  preferred_name: z.string().max(120).optional().default(''),
  preferred_email: z.union([z.string().email(), z.literal('')]).optional().default(''),
  preferred_phone: z.string().max(60).optional().default(''),
  preferred_color: z.enum(ACCENT_KEYS),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime()
});
export type Profile = z.infer<typeof ProfileSchema>;

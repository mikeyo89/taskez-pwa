import { z } from 'zod';

import { ACCENT_KEYS } from './appearance';

const NullableISOString = z.string().optional().nullable();

export const ClientSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  server_updated_at: z.string().optional(),
  deleted_at: NullableISOString
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
  updated_at: z.iso.datetime(),
  server_updated_at: z.string().optional(),
  deleted_at: NullableISOString
});
export type Member = z.infer<typeof MemberSchema>;

export const ServiceSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  server_updated_at: z.string().optional(),
  deleted_at: NullableISOString
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
  updated_at: z.iso.datetime(),
  server_updated_at: z.string().optional(),
  deleted_at: NullableISOString
});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectEventSchema = z.object({
  id: z.uuid(),
  project_id: z.uuid(),
  reason: z.string().min(1),
  notes: z.string().optional().default(''),
  updated_at: z.iso.datetime(),
  server_updated_at: z.string().optional(),
  deleted_at: NullableISOString
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
  updated_at: z.iso.datetime(),
  server_updated_at: z.string().optional(),
  deleted_at: NullableISOString
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
  updated_at: z.iso.datetime(),
  server_updated_at: z.string().optional(),
  deleted_at: NullableISOString
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
  updated_at: z.iso.datetime(),
  server_updated_at: z.string().optional(),
  deleted_at: NullableISOString
});
export type ProjectServiceExtra = z.infer<typeof ProjectServiceExtraSchema>;

export const ProfileSchema = z.object({
  id: z.string(),
  company_name: z.string().max(120).optional().default(''),
  preferred_name: z.string().max(120).optional().default(''),
  preferred_email: z.union([z.string().email(), z.literal('')]).optional().default(''),
  preferred_phone: z.string().max(60).optional().default(''),
  preferred_color: z.enum(ACCENT_KEYS),
  notifications_enabled: z.boolean().default(false),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  server_updated_at: z.string().optional()
});
export type Profile = z.infer<typeof ProfileSchema>;

export const OutboxActionSchema = z.enum(['create', 'update', 'delete']);
export type OutboxAction = z.infer<typeof OutboxActionSchema>;

export const OutboxStatusSchema = z.enum(['pending', 'failed']);
export type OutboxStatus = z.infer<typeof OutboxStatusSchema>;

export const OutboxEntitySchema = z.enum([
  'clients',
  'members',
  'services',
  'projects',
  'projectEvents',
  'projectServices',
  'projectServiceUnits',
  'projectServiceExtras',
  'profiles'
]);
export type OutboxEntity = z.infer<typeof OutboxEntitySchema>;

export const OutboxEntrySchema = z.object({
  op_id: z.string().uuid(),
  entity: OutboxEntitySchema,
  entity_id: z.string(),
  action: OutboxActionSchema,
  payload: z.unknown(),
  idempotency_key: z.string(),
  status: OutboxStatusSchema.default('pending'),
  last_error: z.string().optional().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime()
});
export type OutboxEntry = z.infer<typeof OutboxEntrySchema>;

export const MetaEntrySchema = z.object({
  key: z.string(),
  value: z.string()
});
export type MetaEntry = z.infer<typeof MetaEntrySchema>;

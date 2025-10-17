'use client';

import Dexie from 'dexie';
import { db } from '../db';
import { queueOutboxMutation } from '../offline/outbox';
import {
  ProjectEventSchema,
  ProjectSchema,
  ProjectServiceExtraSchema,
  ProjectServiceSchema,
  ProjectServiceUnitSchema,
  type Project,
  type ProjectEvent,
  type ProjectService,
  type ProjectServiceExtra,
  type ProjectServiceUnit
} from '../models';

const nowISO = () => new Date().toISOString();

const touchKey = (entity: string, id: string) => `${entity}:${id}:touch`;

async function queueProjectTouch(project_id: string) {
  await queueOutboxMutation('projects', 'update', { id: project_id }, project_id, {
    idempotencyKey: touchKey('projects', project_id)
  });
}

async function queueServiceTouch(service_id: string) {
  await queueOutboxMutation('services', 'update', { id: service_id }, service_id, {
    idempotencyKey: touchKey('services', service_id)
  });
}

async function queueProjectServiceTouch(project_service_id: string) {
  await queueOutboxMutation(
    'projectServices',
    'update',
    { id: project_service_id },
    project_service_id,
    { idempotencyKey: touchKey('projectServices', project_service_id) }
  );
}

// ---- Projects ----
export async function createProject(input: {
  client_id: string;
  title: string;
  description?: string;
  budget?: number;
  est_completion_date: string;
  completed_ind?: boolean;
  completed_date?: string;
}): Promise<Project> {
  const timestamp = nowISO();
  const completedFlag = input.completed_ind ?? false;
  const entity: Project = ProjectSchema.parse({
    id: crypto.randomUUID(),
    client_id: input.client_id,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    budget: input.budget,
    est_completion_date: input.est_completion_date.trim(),
    completed_ind: completedFlag,
    completed_date: initialStatusDate(completedFlag, input.completed_date, timestamp),
    updated_at: timestamp
  });
  await db.projects.add(entity);
  await queueOutboxMutation('projects', 'create', entity, entity.id);
  await recordProjectEvent(entity.id, 'project.created', `Project "${entity.title}" created.`);
  await logProjectCompletionEvent(undefined, entity);
  return entity;
}

export async function updateProject(
  id: string,
  patch: Partial<
    Pick<
      Project,
      'title' | 'description' | 'client_id' | 'budget' | 'est_completion_date' | 'completed_ind' | 'completed_date'
    >
  >
): Promise<Project> {
  const existing = await db.projects.get(id);
  if (!existing) throw new Error('Project not found');

  const timestamp = nowISO();
  const normalizedPatch: Record<string, unknown> = { ...patch };
  if (typeof normalizedPatch.est_completion_date === 'string') {
    normalizedPatch.est_completion_date = (normalizedPatch.est_completion_date as string).trim();
  }
  if (typeof normalizedPatch.completed_date === 'string') {
    normalizedPatch.completed_date = (normalizedPatch.completed_date as string).trim();
  }

  const updated: Project = ProjectSchema.parse({
    ...existing,
    ...('title' in patch ? { title: patch.title!.trim() } : {}),
    ...('description' in patch ? { description: (patch.description ?? '').trim() } : {}),
    ...('client_id' in patch ? { client_id: patch.client_id } : {}),
    ...('budget' in patch ? { budget: patch.budget } : {}),
    ...('est_completion_date' in patch
      ? { est_completion_date: normalizedPatch.est_completion_date as string }
      : {}),
    completed_ind:
      (normalizedPatch.completed_ind as boolean | undefined) ?? existing.completed_ind,
    completed_date: computeProjectCompletedDate(existing, normalizedPatch, timestamp),
    updated_at: timestamp
  });
  await db.projects.put(updated);
  await logProjectCompletionEvent(existing, updated);
  await queueOutboxMutation('projects', 'update', updated, id);
  return updated;
}

export async function deleteProject(id: string): Promise<void> {
  let existingProject: Project | undefined;
  const deletedEventIds: string[] = [];
  const deletedServiceIds: string[] = [];
  const deletedUnitIds: string[] = [];
  const deletedExtraIds: string[] = [];

  await db.transaction(
    'rw',
    [
      db.projects,
      db.projectEvents,
      db.projectServices,
      db.projectServiceUnits,
      db.projectServiceExtras
    ],
    async () => {
      existingProject = await db.projects.get(id);
      if (!existingProject) return;

      const events = await db.projectEvents.where('project_id').equals(id).toArray();
      deletedEventIds.push(...events.map((event) => event.id));
      await db.projectEvents.where('project_id').equals(id).delete();

      const services = await db.projectServices.where('project_id').equals(id).toArray();
      if (services.length > 0) {
        deletedServiceIds.push(...services.map((service) => service.id));
        const serviceIds = services.map((service) => service.id);

        const units = await db.projectServiceUnits
          .where('project_service_id')
          .anyOf(serviceIds)
          .toArray();
        deletedUnitIds.push(...units.map((unit) => unit.id));
        await db.projectServiceUnits.where('project_service_id').anyOf(serviceIds).delete();

        const extras = await db.projectServiceExtras
          .where('project_service_id')
          .anyOf(serviceIds)
          .toArray();
        deletedExtraIds.push(...extras.map((extra) => extra.id));
        await db.projectServiceExtras.where('project_service_id').anyOf(serviceIds).delete();
      }

      await db.projectServices.where('project_id').equals(id).delete();
      await db.projects.delete(id);
    }
  );

  if (!existingProject) return;

  await queueOutboxMutation('projects', 'delete', { id }, id);
  await Promise.all([
    ...deletedEventIds.map((eventId) =>
      queueOutboxMutation('projectEvents', 'delete', { id: eventId, project_id: id }, eventId)
    ),
    ...deletedServiceIds.map((serviceId) =>
      queueOutboxMutation('projectServices', 'delete', { id: serviceId, project_id: id }, serviceId)
    ),
    ...deletedUnitIds.map((unitId) =>
      queueOutboxMutation('projectServiceUnits', 'delete', { id: unitId }, unitId)
    ),
    ...deletedExtraIds.map((extraId) =>
      queueOutboxMutation('projectServiceExtras', 'delete', { id: extraId }, extraId)
    )
  ]);

  await queueOutboxMutation(
    'clients',
    'update',
    { id: existingProject.client_id },
    existingProject.client_id,
    { idempotencyKey: touchKey('clients', existingProject.client_id) }
  );
}

export async function listProjects(): Promise<Project[]> {
  return db.projects.orderBy('updated_at').reverse().toArray();
}

export async function listProjectsByClient(client_id: string): Promise<Project[]> {
  return db.projects
    .where('[client_id+updated_at]')
    .between([client_id, Dexie.minKey], [client_id, Dexie.maxKey])
    .reverse()
    .toArray();
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id);
}

// ---- Project Events ----
export async function addProjectEvent(
  project_id: string,
  input: Omit<ProjectEvent, 'id' | 'project_id' | 'updated_at'>
): Promise<ProjectEvent> {
  const entity: ProjectEvent = ProjectEventSchema.parse({
    id: crypto.randomUUID(),
    project_id,
    reason: input.reason.trim(),
    notes: input.notes?.trim() ?? '',
    updated_at: nowISO()
  });
  await db.projectEvents.add(entity);
  await db.projects.update(project_id, { updated_at: nowISO() });
  await queueOutboxMutation('projectEvents', 'create', entity, entity.id);
  await queueProjectTouch(project_id);
  return entity;
}

export async function listProjectEvents(project_id: string): Promise<ProjectEvent[]> {
  return db.projectEvents
    .where('[project_id+updated_at]')
    .between([project_id, Dexie.minKey], [project_id, Dexie.maxKey])
    .reverse()
    .toArray();
}

export async function updateProjectEvent(
  id: string,
  patch: Partial<Omit<ProjectEvent, 'id' | 'project_id'>>
): Promise<ProjectEvent> {
  const existing = await db.projectEvents.get(id);
  if (!existing) throw new Error('Project event not found');
  const updated: ProjectEvent = ProjectEventSchema.parse({
    ...existing,
    ...patch,
    ...(patch.reason ? { reason: patch.reason.trim() } : {}),
    ...(patch.notes ? { notes: (patch.notes ?? '').trim() } : {}),
    updated_at: nowISO()
  });
  await db.projectEvents.put(updated);
  await db.projects.update(existing.project_id, { updated_at: nowISO() });
  await queueOutboxMutation('projectEvents', 'update', updated, id);
  await queueProjectTouch(existing.project_id);
  return updated;
}

export async function deleteProjectEvent(id: string): Promise<void> {
  const existing = await db.projectEvents.get(id);
  await db.projectEvents.delete(id);
  if (existing) {
    await db.projects.update(existing.project_id, { updated_at: nowISO() });
    await queueOutboxMutation('projectEvents', 'delete', { id }, id);
    await queueProjectTouch(existing.project_id);
  }
}

// ---- Project Services ----
export async function createProjectService(input: {
  project_id: string;
  service_id: string;
  budget_type: ProjectService['budget_type'];
  budget_amount: number;
  est_completion_date: string;
  approved_ind?: boolean;
  approved_date?: string;
  completed_ind?: boolean;
  completed_date?: string;
  paid_ind?: boolean;
  paid_date?: string;
}): Promise<ProjectService> {
  const timestamp = nowISO();
  const approvedFlag = input.approved_ind ?? false;
  const completedFlag = input.completed_ind ?? false;
  const paidFlag = input.paid_ind ?? false;
  const entity: ProjectService = ProjectServiceSchema.parse({
    id: crypto.randomUUID(),
    project_id: input.project_id,
    service_id: input.service_id,
    budget_type: input.budget_type,
    budget_amount: input.budget_amount,
    est_completion_date: input.est_completion_date.trim(),
    approved_ind: approvedFlag,
    approved_date: initialStatusDate(approvedFlag, input.approved_date, timestamp),
    completed_ind: completedFlag,
    completed_date: initialStatusDate(completedFlag, input.completed_date, timestamp),
    paid_ind: paidFlag,
    paid_date: initialStatusDate(paidFlag, input.paid_date, timestamp),
    updated_at: timestamp
  });
  await db.projectServices.add(entity);
  await Promise.all([
    db.projects.update(input.project_id, { updated_at: timestamp }),
    db.services.update(input.service_id, { updated_at: timestamp })
  ]);
  await queueOutboxMutation('projectServices', 'create', entity, entity.id);
  await queueProjectTouch(input.project_id);
  await queueServiceTouch(input.service_id);
  const serviceName = await resolveServiceName(input.service_id);
  await recordProjectEvent(
    input.project_id,
    'project-service.created',
    `${serviceName} scoped for ${formatBudget(entity.budget_amount, entity.budget_type)}.`
  );
  await logServiceStatusEvents(undefined, entity, serviceName);
  return entity;
}

export async function listProjectServicesByProject(project_id: string): Promise<ProjectService[]> {
  return db.projectServices
    .where('[project_id+updated_at]')
    .between([project_id, Dexie.minKey], [project_id, Dexie.maxKey])
    .reverse()
    .toArray();
}

export type ProjectServiceWithChildren = ProjectService & {
  units: ProjectServiceUnit[];
  extras: ProjectServiceExtra[];
};

export async function listProjectServicesWithChildren(
  project_id: string
): Promise<ProjectServiceWithChildren[]> {
  const services = await listProjectServicesByProject(project_id);
  if (services.length === 0) return [];

  const serviceIds = services.map((service) => service.id);

  const [units, extras] = await Promise.all([
    db.projectServiceUnits.where('project_service_id').anyOf(serviceIds).toArray(),
    db.projectServiceExtras.where('project_service_id').anyOf(serviceIds).toArray()
  ]);

  return services.map((service) => ({
    ...service,
    units: units
      .filter((unit) => unit.project_service_id === service.id)
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)),
    extras: extras
      .filter((extra) => extra.project_service_id === service.id)
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
  }));
}

export async function updateProjectService(
  id: string,
  patch: Partial<
    Pick<
      ProjectService,
      | 'project_id'
      | 'service_id'
      | 'budget_type'
      | 'budget_amount'
      | 'est_completion_date'
      | 'approved_ind'
      | 'approved_date'
      | 'completed_ind'
      | 'completed_date'
      | 'paid_ind'
      | 'paid_date'
    >
  >
): Promise<ProjectService> {
  const existing = await db.projectServices.get(id);
  if (!existing) throw new Error('Project service not found');
  const timestamp = nowISO();
  const normalizedPatch: Record<string, unknown> = { ...patch };
  if (typeof normalizedPatch.est_completion_date === 'string') {
    normalizedPatch.est_completion_date = (normalizedPatch.est_completion_date as string).trim();
  }
  if (typeof normalizedPatch.approved_date === 'string') {
    normalizedPatch.approved_date = (normalizedPatch.approved_date as string).trim();
  }
  if (typeof normalizedPatch.completed_date === 'string') {
    normalizedPatch.completed_date = (normalizedPatch.completed_date as string).trim();
  }
  if (typeof normalizedPatch.paid_date === 'string') {
    normalizedPatch.paid_date = (normalizedPatch.paid_date as string).trim();
  }
  const updated: ProjectService = ProjectServiceSchema.parse({
    ...existing,
    ...(normalizedPatch as typeof patch),
    approved_date: computeStatusDate('approved', existing, normalizedPatch, timestamp),
    completed_date: computeStatusDate('completed', existing, normalizedPatch, timestamp),
    paid_date: computeStatusDate('paid', existing, normalizedPatch, timestamp),
    updated_at: timestamp
  });
  await db.projectServices.put(updated);
  await Promise.all([
    db.projects.update(updated.project_id, { updated_at: timestamp }),
    db.services.update(updated.service_id, { updated_at: timestamp })
  ]);
  await queueOutboxMutation('projectServices', 'update', updated, id);
  await queueProjectTouch(updated.project_id);
  await queueServiceTouch(updated.service_id);
  if (existing.service_id !== updated.service_id) {
    await queueServiceTouch(existing.service_id);
  }
  const serviceName = await resolveServiceName(updated.service_id);
  await logServiceStatusEvents(existing, updated, serviceName);
  return updated;
}

export async function deleteProjectService(id: string): Promise<void> {
  let context: { project_id: string; service_id: string } | undefined;
  const unitIds: string[] = [];
  const extraIds: string[] = [];
  await db.transaction(
    'rw',
    [db.projectServices, db.projectServiceUnits, db.projectServiceExtras, db.projects, db.services],
    async () => {
      const existing = await db.projectServices.get(id);
      if (!existing) return;
      context = { project_id: existing.project_id, service_id: existing.service_id };
      const units = await db.projectServiceUnits.where('project_service_id').equals(id).toArray();
      unitIds.push(...units.map((unit) => unit.id));
      await db.projectServiceUnits.where('project_service_id').equals(id).delete();
      const extras = await db.projectServiceExtras.where('project_service_id').equals(id).toArray();
      extraIds.push(...extras.map((extra) => extra.id));
      await db.projectServiceExtras.where('project_service_id').equals(id).delete();
      await db.projectServices.delete(id);
      const timestamp = nowISO();
      await Promise.all([
        db.projects.update(existing.project_id, { updated_at: timestamp }),
        db.services.update(existing.service_id, { updated_at: timestamp })
      ]);
    }
  );
  if (context) {
    const serviceName = await resolveServiceName(context.service_id);
    await recordProjectEvent(
      context.project_id,
      'project-service.deleted',
      `${serviceName} removed from project.`
    );
    await queueOutboxMutation('projectServices', 'delete', { id }, id);
    await Promise.all([
      ...unitIds.map((unitId) =>
        queueOutboxMutation('projectServiceUnits', 'delete', { id: unitId }, unitId)
      ),
      ...extraIds.map((extraId) =>
        queueOutboxMutation('projectServiceExtras', 'delete', { id: extraId }, extraId)
      )
    ]);
    await queueProjectTouch(context.project_id);
    await queueServiceTouch(context.service_id);
  }
}

// ---- Project Service Units ----
export async function addProjectServiceUnit(
  project_service_id: string,
  input: {
    title: string;
    description?: string;
    budget_type: ProjectServiceUnit['budget_type'];
    budget_amount: number;
    est_completion_date: string;
    approved_ind?: boolean;
    approved_date?: string;
    completed_ind?: boolean;
    completed_date?: string;
    paid_ind?: boolean;
    paid_date?: string;
  }
): Promise<ProjectServiceUnit> {
  const parent = await fetchProjectServiceOrThrow(project_service_id);
  const timestamp = nowISO();
  const approvedFlag = input.approved_ind ?? false;
  const completedFlag = input.completed_ind ?? false;
  const paidFlag = input.paid_ind ?? false;
  const entity: ProjectServiceUnit = ProjectServiceUnitSchema.parse({
    id: crypto.randomUUID(),
    project_service_id,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    budget_type: input.budget_type,
    budget_amount: input.budget_amount,
    est_completion_date: input.est_completion_date.trim(),
    approved_ind: approvedFlag,
    approved_date: initialStatusDate(approvedFlag, input.approved_date, timestamp),
    completed_ind: completedFlag,
    completed_date: initialStatusDate(completedFlag, input.completed_date, timestamp),
    paid_ind: paidFlag,
    paid_date: initialStatusDate(paidFlag, input.paid_date, timestamp),
    updated_at: timestamp
  });
  await db.projectServiceUnits.add(entity);
  await queueOutboxMutation('projectServiceUnits', 'create', entity, entity.id);
  await bumpParentForProjectService(project_service_id, parent, timestamp);
  const serviceName = await resolveServiceName(parent.service_id);
  await recordProjectEvent(
    parent.project_id,
    'service-unit.created',
    `Unit "${entity.title}" added to ${serviceName} (${formatBudget(
      entity.budget_amount,
      entity.budget_type
    )}).`
  );
  await logUnitStatusEvents(undefined, entity, parent, serviceName);
  return entity;
}

export async function listProjectServiceUnits(
  project_service_id: string
): Promise<ProjectServiceUnit[]> {
  return db.projectServiceUnits
    .where('[project_service_id+updated_at]')
    .between([project_service_id, Dexie.minKey], [project_service_id, Dexie.maxKey])
    .reverse()
    .toArray();
}

export async function updateProjectServiceUnit(
  id: string,
  patch: Partial<
    Pick<
      ProjectServiceUnit,
      | 'title'
      | 'description'
      | 'budget_type'
      | 'budget_amount'
      | 'est_completion_date'
      | 'approved_ind'
      | 'approved_date'
      | 'completed_ind'
      | 'completed_date'
      | 'paid_ind'
      | 'paid_date'
    >
  >
): Promise<ProjectServiceUnit> {
  const existing = await db.projectServiceUnits.get(id);
  if (!existing) throw new Error('Project service unit not found');
  const parent = await fetchProjectServiceOrThrow(existing.project_service_id);
  const timestamp = nowISO();
  const normalizedPatch: Record<string, unknown> = { ...patch };
  if (typeof normalizedPatch.est_completion_date === 'string') {
    normalizedPatch.est_completion_date = (normalizedPatch.est_completion_date as string).trim();
  }
  if (typeof normalizedPatch.approved_date === 'string') {
    normalizedPatch.approved_date = (normalizedPatch.approved_date as string).trim();
  }
  if (typeof normalizedPatch.completed_date === 'string') {
    normalizedPatch.completed_date = (normalizedPatch.completed_date as string).trim();
  }
  if (typeof normalizedPatch.paid_date === 'string') {
    normalizedPatch.paid_date = (normalizedPatch.paid_date as string).trim();
  }
  const updated: ProjectServiceUnit = ProjectServiceUnitSchema.parse({
    ...existing,
    ...('title' in patch ? { title: patch.title!.trim() } : {}),
    ...('description' in patch ? { description: (patch.description ?? '').trim() } : {}),
    ...('budget_type' in patch ? { budget_type: patch.budget_type! } : {}),
    ...('budget_amount' in patch ? { budget_amount: patch.budget_amount! } : {}),
    ...('est_completion_date' in patch
      ? { est_completion_date: normalizedPatch.est_completion_date as string }
      : {}),
    approved_ind: (normalizedPatch.approved_ind as boolean | undefined) ?? existing.approved_ind,
    approved_date: computeStatusDate('approved', existing, normalizedPatch, timestamp),
    completed_ind: (normalizedPatch.completed_ind as boolean | undefined) ?? existing.completed_ind,
    completed_date: computeStatusDate('completed', existing, normalizedPatch, timestamp),
    paid_ind: (normalizedPatch.paid_ind as boolean | undefined) ?? existing.paid_ind,
    paid_date: computeStatusDate('paid', existing, normalizedPatch, timestamp),
    updated_at: timestamp
  });
  await db.projectServiceUnits.put(updated);
  await bumpParentForProjectService(existing.project_service_id, parent, timestamp);
  await queueOutboxMutation('projectServiceUnits', 'update', updated, id);
  const serviceName = await resolveServiceName(parent.service_id);
  await logUnitStatusEvents(existing, updated, parent, serviceName);
  return updated;
}

export async function deleteProjectServiceUnit(id: string): Promise<void> {
  const existing = await db.projectServiceUnits.get(id);
  await db.projectServiceUnits.delete(id);
  if (existing) {
    const parent = await fetchProjectServiceOrThrow(existing.project_service_id);
    const serviceName = await resolveServiceName(parent.service_id);
    await recordProjectEvent(
      parent.project_id,
      'service-unit.deleted',
      `Unit "${existing.title}" removed from ${serviceName}.`
    );
    await bumpParentForProjectService(existing.project_service_id, parent);
    await queueOutboxMutation('projectServiceUnits', 'delete', { id }, id);
  }
}

// ---- Project Service Extras ----
export async function addProjectServiceExtra(
  project_service_id: string,
  input: {
    title: string;
    description?: string;
    budget_amount: number;
    est_completion_date: string;
    approved_ind?: boolean;
    approved_date?: string;
    completed_ind?: boolean;
    completed_date?: string;
    paid_ind?: boolean;
    paid_date?: string;
  }
): Promise<ProjectServiceExtra> {
  const parent = await fetchProjectServiceOrThrow(project_service_id);
  const timestamp = nowISO();
  const approvedFlag = input.approved_ind ?? false;
  const completedFlag = input.completed_ind ?? false;
  const paidFlag = input.paid_ind ?? false;
  const entity: ProjectServiceExtra = ProjectServiceExtraSchema.parse({
    id: crypto.randomUUID(),
    project_service_id,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    budget_type: 'dollar',
    budget_amount: input.budget_amount,
    est_completion_date: input.est_completion_date.trim(),
    approved_ind: approvedFlag,
    approved_date: initialStatusDate(approvedFlag, input.approved_date, timestamp),
    completed_ind: completedFlag,
    completed_date: initialStatusDate(completedFlag, input.completed_date, timestamp),
    paid_ind: paidFlag,
    paid_date: initialStatusDate(paidFlag, input.paid_date, timestamp),
    updated_at: timestamp
  });
  await db.projectServiceExtras.add(entity);
  await queueOutboxMutation('projectServiceExtras', 'create', entity, entity.id);
  await bumpParentForProjectService(project_service_id, parent, timestamp);
  const serviceName = await resolveServiceName(parent.service_id);
  await recordProjectEvent(
    parent.project_id,
    'service-extra.created',
    `Extra "${entity.title}" added for ${serviceName} at ${formatBudget(
      entity.budget_amount,
      entity.budget_type
    )}.`
  );
  await logExtraStatusEvents(undefined, entity, parent, serviceName);
  return entity;
}

export async function listProjectServiceExtras(
  project_service_id: string
): Promise<ProjectServiceExtra[]> {
  return db.projectServiceExtras
    .where('[project_service_id+updated_at]')
    .between([project_service_id, Dexie.minKey], [project_service_id, Dexie.maxKey])
    .reverse()
    .toArray();
}

export async function updateProjectServiceExtra(
  id: string,
  patch: Partial<
    Pick<
      ProjectServiceExtra,
      | 'title'
      | 'description'
      | 'budget_amount'
      | 'est_completion_date'
      | 'approved_ind'
      | 'approved_date'
      | 'completed_ind'
      | 'completed_date'
      | 'paid_ind'
      | 'paid_date'
    >
  >
): Promise<ProjectServiceExtra> {
  const existing = await db.projectServiceExtras.get(id);
  if (!existing) throw new Error('Project service extra not found');
  const parent = await fetchProjectServiceOrThrow(existing.project_service_id);
  const timestamp = nowISO();
  const normalizedPatch: Record<string, unknown> = { ...patch };
  if (typeof normalizedPatch.est_completion_date === 'string') {
    normalizedPatch.est_completion_date = (normalizedPatch.est_completion_date as string).trim();
  }
  if (typeof normalizedPatch.approved_date === 'string') {
    normalizedPatch.approved_date = (normalizedPatch.approved_date as string).trim();
  }
  if (typeof normalizedPatch.completed_date === 'string') {
    normalizedPatch.completed_date = (normalizedPatch.completed_date as string).trim();
  }
  if (typeof normalizedPatch.paid_date === 'string') {
    normalizedPatch.paid_date = (normalizedPatch.paid_date as string).trim();
  }
  const updated: ProjectServiceExtra = ProjectServiceExtraSchema.parse({
    ...existing,
    ...('title' in patch ? { title: patch.title!.trim() } : {}),
    ...('description' in patch ? { description: (patch.description ?? '').trim() } : {}),
    ...('budget_amount' in patch ? { budget_amount: patch.budget_amount! } : {}),
    ...('est_completion_date' in patch
      ? { est_completion_date: normalizedPatch.est_completion_date as string }
      : {}),
    approved_ind: (normalizedPatch.approved_ind as boolean | undefined) ?? existing.approved_ind,
    approved_date: computeStatusDate('approved', existing, normalizedPatch, timestamp),
    completed_ind: (normalizedPatch.completed_ind as boolean | undefined) ?? existing.completed_ind,
    completed_date: computeStatusDate('completed', existing, normalizedPatch, timestamp),
    paid_ind: (normalizedPatch.paid_ind as boolean | undefined) ?? existing.paid_ind,
    paid_date: computeStatusDate('paid', existing, normalizedPatch, timestamp),
    updated_at: timestamp
  });
  await db.projectServiceExtras.put(updated);
  await bumpParentForProjectService(existing.project_service_id, parent, timestamp);
  await queueOutboxMutation('projectServiceExtras', 'update', updated, id);
  const serviceName = await resolveServiceName(parent.service_id);
  await logExtraStatusEvents(existing, updated, parent, serviceName);
  return updated;
}

export async function deleteProjectServiceExtra(id: string): Promise<void> {
  const existing = await db.projectServiceExtras.get(id);
  await db.projectServiceExtras.delete(id);
  if (existing) {
    const parent = await fetchProjectServiceOrThrow(existing.project_service_id);
    const serviceName = await resolveServiceName(parent.service_id);
    await recordProjectEvent(
      parent.project_id,
      'service-extra.deleted',
      `Extra "${existing.title}" removed from ${serviceName}.`
    );
    await bumpParentForProjectService(existing.project_service_id, parent);
    await queueOutboxMutation('projectServiceExtras', 'delete', { id }, id);
  }
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

type StatusTrackable = {
  approved_ind: boolean;
  approved_date: string;
  completed_ind: boolean;
  completed_date: string;
  paid_ind: boolean;
  paid_date: string;
};

type StatusKey = 'approved' | 'completed' | 'paid';

async function recordProjectEvent(project_id: string, reason: string, notes?: string) {
  await addProjectEvent(project_id, { reason, notes: notes ?? '' });
}

function formatBudget(amount: number, type: 'dollar' | 'percent'): string {
  return type === 'dollar' ? usdFormatter.format(amount) : `${amount}%`;
}

async function resolveServiceName(service_id: string): Promise<string> {
  const service = await db.services.get(service_id);
  return service?.name ?? `Service ${service_id.slice(0, 8)}`;
}

async function fetchProjectServiceOrThrow(project_service_id: string): Promise<ProjectService> {
  const parent = await db.projectServices.get(project_service_id);
  if (!parent) throw new Error('Project service not found');
  return parent;
}

function computeStatusDate(
  key: StatusKey,
  existing: StatusTrackable,
  patch: Record<string, unknown>,
  timestamp: string
): string {
  const flagKey = `${key}_ind` as const;
  const dateKey = `${key}_date` as const;
  const flagPatch = patch[flagKey] as boolean | undefined;
  const datePatch = patch[dateKey] as string | undefined;
  const previousFlag = existing[flagKey];

  if (flagPatch === true && !previousFlag) {
    return datePatch ?? timestamp;
  }

  if (flagPatch === false) {
    return datePatch ?? '';
  }

  if (datePatch !== undefined) {
    return datePatch;
  }

  return existing[dateKey];
}

function initialStatusDate(flag: boolean, provided: string | undefined, fallback: string): string {
  const trimmed = provided?.trim();
  if (flag) {
    return trimmed && trimmed.length > 0 ? trimmed : fallback;
  }
  return trimmed ?? '';
}

function computeProjectCompletedDate(
  existing: Pick<Project, 'completed_ind' | 'completed_date'>,
  patch: Record<string, unknown>,
  timestamp: string
): string {
  const nextFlag = (patch.completed_ind as boolean | undefined) ?? existing.completed_ind;
  const datePatch =
    typeof patch.completed_date === 'string' ? (patch.completed_date as string).trim() : undefined;

  if (nextFlag && !existing.completed_ind) {
    return datePatch && datePatch.length > 0 ? datePatch : timestamp;
  }

  if (!nextFlag) {
    return datePatch ?? '';
  }

  if (datePatch !== undefined) {
    return datePatch;
  }

  return existing.completed_date;
}

async function logProjectCompletionEvent(prev: Project | undefined, next: Project) {
  if (!prev?.completed_ind && next.completed_ind) {
    await recordProjectEvent(
      next.id,
      'project.completed',
      `Project "${next.title}" marked as completed.`
    );
  } else if (prev?.completed_ind && !next.completed_ind) {
    await recordProjectEvent(
      next.id,
      'project.reopened',
      `Project "${next.title}" reopened.`
    );
  }
}

async function logServiceStatusEvents(
  prev: ProjectService | undefined,
  next: ProjectService,
  serviceName: string
) {
  await logStatusIfPromoted(
    'project-service',
    'approved',
    prev?.approved_ind,
    next.approved_ind,
    next.project_id,
    `${serviceName} approved.`
  );
  await logStatusIfPromoted(
    'project-service',
    'completed',
    prev?.completed_ind,
    next.completed_ind,
    next.project_id,
    `${serviceName} completed.`
  );
  await logStatusIfPromoted(
    'project-service',
    'paid',
    prev?.paid_ind,
    next.paid_ind,
    next.project_id,
    `${serviceName} paid.`
  );
}

async function logUnitStatusEvents(
  prev: ProjectServiceUnit | undefined,
  next: ProjectServiceUnit,
  parent: ProjectService,
  serviceName: string
) {
  const unitLabel = `Unit "${next.title}" for ${serviceName}`;
  await logStatusIfPromoted(
    'service-unit',
    'approved',
    prev?.approved_ind,
    next.approved_ind,
    parent.project_id,
    `${unitLabel} approved.`
  );
  await logStatusIfPromoted(
    'service-unit',
    'completed',
    prev?.completed_ind,
    next.completed_ind,
    parent.project_id,
    `${unitLabel} completed.`
  );
  await logStatusIfPromoted(
    'service-unit',
    'paid',
    prev?.paid_ind,
    next.paid_ind,
    parent.project_id,
    `${unitLabel} paid.`
  );
}

async function logExtraStatusEvents(
  prev: ProjectServiceExtra | undefined,
  next: ProjectServiceExtra,
  parent: ProjectService,
  serviceName: string
) {
  const extraLabel = `Extra "${next.title}" for ${serviceName}`;
  await logStatusIfPromoted(
    'service-extra',
    'approved',
    prev?.approved_ind,
    next.approved_ind,
    parent.project_id,
    `${extraLabel} approved.`
  );
  await logStatusIfPromoted(
    'service-extra',
    'completed',
    prev?.completed_ind,
    next.completed_ind,
    parent.project_id,
    `${extraLabel} completed.`
  );
  await logStatusIfPromoted(
    'service-extra',
    'paid',
    prev?.paid_ind,
    next.paid_ind,
    parent.project_id,
    `${extraLabel} paid.`
  );
}

async function logStatusIfPromoted(
  entity: 'project-service' | 'service-unit' | 'service-extra',
  status: StatusKey,
  previous: boolean | undefined,
  next: boolean,
  project_id: string,
  note: string
) {
  if (!previous && next) {
    await recordProjectEvent(project_id, `${entity}.${status}`, note);
  }
}

async function bumpParentForProjectService(
  project_service_id: string,
  parent?: ProjectService,
  timestamp = nowISO()
) {
  const service = parent ?? (await db.projectServices.get(project_service_id));
  if (!service) return;
  await Promise.all([
    db.projectServices.update(project_service_id, { updated_at: timestamp }),
    db.projects.update(service.project_id, { updated_at: timestamp }),
    db.services.update(service.service_id, { updated_at: timestamp })
  ]);
  await queueProjectServiceTouch(project_service_id);
  await queueProjectTouch(service.project_id);
  await queueServiceTouch(service.service_id);
}

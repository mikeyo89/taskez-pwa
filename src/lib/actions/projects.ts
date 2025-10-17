'use client';

import Dexie from 'dexie';
import { db } from '../db';
import { queueOutboxMutation } from '../offline/outbox';
import {
  ProjectBillableSchema,
  ProjectEventSchema,
  ProjectSchema,
  ProjectServiceExtraSchema,
  ProjectServiceSchema,
  ProjectServiceUnitSchema,
  type Project,
  type ProjectBillable,
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
  const deletedBillableIds: string[] = [];

  await db.transaction(
    'rw',
    [
      db.projects,
      db.projectEvents,
      db.projectServices,
      db.projectServiceUnits,
      db.projectServiceExtras,
      db.projectBillables
    ],
    async () => {
      existingProject = await db.projects.get(id);
      if (!existingProject) return;

      const events = await db.projectEvents.where('project_id').equals(id).toArray();
      deletedEventIds.push(...events.map((event) => event.id));
      await db.projectEvents.where('project_id').equals(id).delete();

      const billables = await db.projectBillables.where('project_id').equals(id).toArray();
      deletedBillableIds.push(...billables.map((billable) => billable.id));
      await db.projectBillables.where('project_id').equals(id).delete();

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
    ),
    ...deletedBillableIds.map((billableId) =>
      queueOutboxMutation('projectBillables', 'delete', { id: billableId }, billableId)
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

export type ProjectBillableUnit = ProjectServiceUnit & {
  service_id?: string;
  service_name?: string;
};

export type ProjectBillableWithUnits = ProjectBillable & {
  units: ProjectBillableUnit[];
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
    project_billable_id: null,
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
      | 'project_billable_id'
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
    ...('project_billable_id' in patch
      ? { project_billable_id: patch.project_billable_id ?? null }
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

// ---- Project Billables ----
export async function listProjectBillables(
  project_id: string
): Promise<ProjectBillableWithUnits[]> {
  const billables = await db.projectBillables
    .where('[project_id+updated_at]')
    .between([project_id, Dexie.minKey], [project_id, Dexie.maxKey])
    .reverse()
    .toArray();

  if (billables.length === 0) {
    return [];
  }

  const billableIds = billables.map((billable) => billable.id);
  const units = await db.projectServiceUnits
    .where('project_billable_id')
    .anyOf(billableIds)
    .toArray();

  if (units.length === 0) {
    return billables.map((billable) => ({ ...billable, units: [] }));
  }

  const projectServiceIds = Array.from(
    new Set(units.map((unit) => unit.project_service_id))
  );
  const projectServices = await db.projectServices.bulkGet(projectServiceIds);
  const projectServiceLookup = new Map<string, ProjectService>();
  projectServices.forEach((service, index) => {
    const id = projectServiceIds[index];
    if (service) {
      projectServiceLookup.set(id, service);
    }
  });

  const serviceIds = Array.from(
    new Set(
      projectServices
        .map((service) => service?.service_id)
        .filter((value): value is string => Boolean(value))
    )
  );
  const services = await db.services.bulkGet(serviceIds);
  const serviceNameLookup = new Map<string, string>();
  services.forEach((service, index) => {
    const id = serviceIds[index];
    if (service) {
      serviceNameLookup.set(id, service.name);
    }
  });

  const unitBuckets = new Map<string, ProjectBillableUnit[]>();
  units.forEach((unit) => {
    if (!unit.project_billable_id) return;
    const parent = projectServiceLookup.get(unit.project_service_id);
    const serviceName = parent ? serviceNameLookup.get(parent.service_id) : undefined;
    const enriched: ProjectBillableUnit = {
      ...unit,
      service_id: parent?.service_id,
      service_name: serviceName
    };
    const bucket = unitBuckets.get(unit.project_billable_id);
    if (bucket) {
      bucket.push(enriched);
    } else {
      unitBuckets.set(unit.project_billable_id, [enriched]);
    }
  });

  return billables.map((billable) => ({
    ...billable,
    units: (unitBuckets.get(billable.id) ?? []).sort((a, b) =>
      a.updated_at < b.updated_at ? 1 : -1
    )
  }));
}

export async function createProjectBillable(input: {
  project_id: string;
  billable_type: ProjectBillable['billable_type'];
  service_unit_ids: string[];
  approved_ind?: boolean;
  approved_date?: string;
  completed_ind?: boolean;
  completed_date?: string;
  paid_ind?: boolean;
  paid_date?: string;
}): Promise<ProjectBillableWithUnits> {
  if (input.service_unit_ids.length === 0) {
    throw new Error('Select at least one service unit to create a billable');
  }

  const timestamp = nowISO();
  const approvedFlag =
    input.approved_ind ?? (input.billable_type === 'invoice' ? true : false);
  const completedFlag = input.completed_ind ?? false;
  const paidFlag = input.paid_ind ?? false;

  const entity: ProjectBillable = ProjectBillableSchema.parse({
    id: crypto.randomUUID(),
    project_id: input.project_id,
    billable_type: input.billable_type,
    approved_ind: approvedFlag,
    approved_date: initialStatusDate(approvedFlag, input.approved_date, timestamp),
    completed_ind: completedFlag,
    completed_date: initialStatusDate(completedFlag, input.completed_date, timestamp),
    paid_ind: paidFlag,
    paid_date: initialStatusDate(paidFlag, input.paid_date, timestamp),
    updated_at: timestamp
  });

  const contexts = await Promise.all(
    input.service_unit_ids.map(async (unitId) => {
      const unit = await db.projectServiceUnits.get(unitId);
      if (!unit) throw new Error('Service unit not found');
      if (unit.project_billable_id) {
        throw new Error('One or more service units are already assigned to a billable');
      }
      const parent = await fetchProjectServiceOrThrow(unit.project_service_id);
      if (parent.project_id !== input.project_id) {
        throw new Error('Service unit does not belong to the selected project');
      }
      if (input.billable_type === 'estimate' && unit.approved_ind) {
        throw new Error('Estimates can only include units that are not approved');
      }
      if (input.billable_type === 'invoice' && !unit.approved_ind) {
        throw new Error('Invoices require units that are already approved');
      }
      const serviceName = await resolveServiceName(parent.service_id);
      return { unit, parent, serviceName };
    })
  );

  const updatedUnits = contexts.map(({ unit }) =>
    ProjectServiceUnitSchema.parse({
      ...unit,
      project_billable_id: entity.id,
      approved_ind: unit.approved_ind || entity.approved_ind,
      approved_date:
        unit.approved_ind || !entity.approved_ind
          ? unit.approved_date
          : entity.approved_date || timestamp,
      completed_ind: unit.completed_ind || entity.completed_ind,
      completed_date:
        unit.completed_ind || !entity.completed_ind
          ? unit.completed_date
          : entity.completed_date || timestamp,
      paid_ind: unit.paid_ind || entity.paid_ind,
      paid_date:
        unit.paid_ind || !entity.paid_ind
          ? unit.paid_date
          : entity.paid_date || timestamp,
      updated_at: timestamp
    })
  );

  await db.transaction('rw', [db.projectBillables, db.projectServiceUnits], async () => {
    await db.projectBillables.add(entity);
    await Promise.all(updatedUnits.map((unit) => db.projectServiceUnits.put(unit)));
  });

  const uniqueParentIds = Array.from(
    new Set(contexts.map((context) => context.parent.id))
  );

  await Promise.all(
    uniqueParentIds.map((parentId) => {
      const parent = contexts.find((context) => context.parent.id === parentId)?.parent;
      return parent
        ? bumpParentForProjectService(parentId, parent, timestamp)
        : Promise.resolve();
    })
  );

  await db.projects.update(entity.project_id, { updated_at: timestamp });

  await Promise.all([
    queueOutboxMutation('projectBillables', 'create', entity, entity.id),
    ...updatedUnits.map((unit) =>
      queueOutboxMutation('projectServiceUnits', 'update', unit, unit.id)
    )
  ]);

  await queueProjectTouch(entity.project_id);

  await recordProjectEvent(
    entity.project_id,
    'project-billable.created',
    `${capitalize(entity.billable_type)} billable created with ${updatedUnits.length} unit${
      updatedUnits.length === 1 ? '' : 's'
    }.`
  );

  await logBillableStatusEvents(undefined, entity);

  await Promise.all(
    contexts.map(({ unit, parent, serviceName }, index) =>
      logUnitStatusEvents(unit, updatedUnits[index], parent, serviceName)
    )
  );

  return {
    ...entity,
    units: updatedUnits.map((unit, index) => ({
      ...unit,
      service_id: contexts[index].parent.service_id,
      service_name: contexts[index].serviceName
    }))
  };
}

export async function updateProjectBillable(
  id: string,
  patch: Partial<
    Pick<
      ProjectBillable,
      | 'approved_ind'
      | 'approved_date'
      | 'completed_ind'
      | 'completed_date'
      | 'paid_ind'
      | 'paid_date'
    >
  > & { service_unit_ids?: string[] }
): Promise<ProjectBillableWithUnits> {
  const existing = await db.projectBillables.get(id);
  if (!existing) throw new Error('Project billable not found');

  const timestamp = nowISO();
  const { service_unit_ids: serviceUnitIds, ...statusPatch } = patch;
  const normalizedPatch: Record<string, unknown> = { ...statusPatch };
  if (typeof normalizedPatch.approved_date === 'string') {
    normalizedPatch.approved_date = (normalizedPatch.approved_date as string).trim();
  }
  if (typeof normalizedPatch.completed_date === 'string') {
    normalizedPatch.completed_date = (normalizedPatch.completed_date as string).trim();
  }
  if (typeof normalizedPatch.paid_date === 'string') {
    normalizedPatch.paid_date = (normalizedPatch.paid_date as string).trim();
  }

  const normalizedUnitIds = serviceUnitIds
    ? Array.from(
        new Set(
          serviceUnitIds.filter((value): value is string => typeof value === 'string' && value.length > 0)
        )
      )
    : undefined;

  if (normalizedUnitIds && normalizedUnitIds.length === 0) {
    throw new Error('Billable must include at least one service unit');
  }

  if (normalizedUnitIds && existing.approved_ind) {
    throw new Error('Cannot modify service units for an approved billable');
  }

  const updated: ProjectBillable = ProjectBillableSchema.parse({
    ...existing,
    ...(normalizedPatch as Partial<ProjectBillable>),
    approved_date: computeStatusDate('approved', existing, normalizedPatch, timestamp),
    completed_date: computeStatusDate('completed', existing, normalizedPatch, timestamp),
    paid_date: computeStatusDate('paid', existing, normalizedPatch, timestamp),
    updated_at: timestamp
  });

  const existingContexts = await fetchBillableUnitContexts(id);
  let contexts = [...existingContexts];
  const parentContextMap = new Map<string, ProjectService>();
  contexts.forEach((context) => {
    parentContextMap.set(context.parent.id, context.parent);
  });
  const impactedParentIds = new Set(contexts.map((context) => context.parent.id));

  const statusMeta = [
    { flag: 'approved_ind' as const, date: 'approved_date' as const },
    { flag: 'completed_ind' as const, date: 'completed_date' as const },
    { flag: 'paid_ind' as const, date: 'paid_date' as const }
  ];

  const unitUpdates: ProjectServiceUnit[] = [];
  const unitPairs: Array<{ previous: ProjectServiceUnit; next: ProjectServiceUnit; context: UnitContext }>
    = [];

  if (normalizedUnitIds) {
    const desiredIds = new Set(normalizedUnitIds);
    if (desiredIds.size === 0) {
      throw new Error('Billable must include at least one service unit');
    }

    const removedContexts = contexts.filter((context) => !desiredIds.has(context.unit.id));
    removedContexts.forEach((context) => {
      impactedParentIds.add(context.parent.id);
      const cleared = ProjectServiceUnitSchema.parse({
        ...context.unit,
        project_billable_id: null,
        updated_at: timestamp
      });
      unitUpdates.push(cleared);
      unitPairs.push({ previous: context.unit, next: cleared, context });
    });

    contexts = contexts.filter((context) => desiredIds.has(context.unit.id));

    const existingIds = new Set(existingContexts.map((context) => context.unit.id));
    const addedUnitIds = normalizedUnitIds.filter((unitId) => !existingIds.has(unitId));

    if (addedUnitIds.length > 0) {
      const addedUnits = await db.projectServiceUnits.bulkGet(addedUnitIds);
      const missingIds = addedUnitIds.filter((_, index) => !addedUnits[index]);
      if (missingIds.length > 0) {
        throw new Error('One or more service units could not be found');
      }

      const addedContexts = await Promise.all(
        addedUnits.map(async (unit) => {
          if (!unit) throw new Error('Service unit not found');
          if (unit.project_billable_id && unit.project_billable_id !== id) {
            throw new Error('Service unit already linked to another billable');
          }
          const parent = await fetchProjectServiceOrThrow(unit.project_service_id);
          const serviceName = await resolveServiceName(parent.service_id);
          parentContextMap.set(parent.id, parent);
          return { unit, parent, serviceName } satisfies UnitContext;
        })
      );

      addedContexts.forEach((context) => {
        impactedParentIds.add(context.parent.id);
        const previousUnit = context.unit;
        const nextUnit = ProjectServiceUnitSchema.parse({
          ...context.unit,
          project_billable_id: id,
          approved_ind: context.unit.approved_ind || updated.approved_ind,
          approved_date:
            context.unit.approved_ind || !updated.approved_ind
              ? context.unit.approved_date
              : updated.approved_date || timestamp,
          completed_ind: context.unit.completed_ind || updated.completed_ind,
          completed_date:
            context.unit.completed_ind || !updated.completed_ind
              ? context.unit.completed_date
              : updated.completed_date || timestamp,
          paid_ind: context.unit.paid_ind || updated.paid_ind,
          paid_date:
            context.unit.paid_ind || !updated.paid_ind
              ? context.unit.paid_date
              : updated.paid_date || timestamp,
          updated_at: timestamp
        });
        unitUpdates.push(nextUnit);
        unitPairs.push({ previous: previousUnit, next: nextUnit, context });
        contexts.push({ ...context, unit: nextUnit });
      });
    }

    contexts.sort((a, b) => {
      const indexA = normalizedUnitIds.indexOf(a.unit.id);
      const indexB = normalizedUnitIds.indexOf(b.unit.id);
      if (indexA === -1 || indexB === -1) return 0;
      return indexA - indexB;
    });
  }

  contexts.forEach((context) => {
    const next = { ...context.unit };
    let changed = false;

    statusMeta.forEach(({ flag, date }) => {
      const billableFlag = updated[flag];
      const billableDate = updated[date];
      const unitFlag = next[flag];
      const unitDate = next[date];

      if (billableFlag !== unitFlag || (billableFlag && unitDate !== billableDate)) {
        next[flag] = billableFlag;
        next[date] = billableFlag
          ? billableDate && billableDate.length > 0
            ? billableDate
            : timestamp
          : billableDate ?? '';
        changed = true;
      }
    });

    if (changed) {
      next.updated_at = timestamp;
      const parsed = ProjectServiceUnitSchema.parse(next);
      unitUpdates.push(parsed);
      unitPairs.push({ previous: context.unit, next: parsed, context });
    }
  });

  await db.transaction('rw', [db.projectBillables, db.projectServiceUnits], async () => {
    await db.projectBillables.put(updated);
    if (unitUpdates.length > 0) {
      await Promise.all(unitUpdates.map((unit) => db.projectServiceUnits.put(unit)));
    }
  });

  await db.projects.update(updated.project_id, { updated_at: timestamp });

  const uniqueParentIds = Array.from(impactedParentIds);
  await Promise.all(
    uniqueParentIds.map((parentId) => {
      const parent =
        contexts.find((context) => context.parent.id === parentId)?.parent ??
        parentContextMap.get(parentId);
      return parent
        ? bumpParentForProjectService(parentId, parent, timestamp)
        : bumpParentForProjectService(parentId, undefined, timestamp);
    })
  );

  await queueOutboxMutation('projectBillables', 'update', updated, id);

  await Promise.all(
    unitUpdates.map((unit) => queueOutboxMutation('projectServiceUnits', 'update', unit, unit.id))
  );

  await queueProjectTouch(updated.project_id);

  await logBillableStatusEvents(existing, updated);

  await Promise.all(
    unitPairs.map(({ previous, next, context }) =>
      logUnitStatusEvents(previous, next, context.parent, context.serviceName)
    )
  );

  return {
    ...updated,
    units: contexts.map((context) => {
      const updatedUnit = unitUpdates.find((unit) => unit.id === context.unit.id) ?? context.unit;
      return {
        ...updatedUnit,
        service_id: context.parent.service_id,
        service_name: context.serviceName
      } satisfies ProjectBillableUnit;
    })
  };
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

type UnitContext = {
  unit: ProjectServiceUnit;
  parent: ProjectService;
  serviceName: string;
};

async function fetchBillableUnitContexts(billable_id: string): Promise<UnitContext[]> {
  const units = await db.projectServiceUnits
    .where('project_billable_id')
    .equals(billable_id)
    .toArray();
  if (units.length === 0) return [];

  return Promise.all(
    units.map(async (unit) => {
      const parent = await fetchProjectServiceOrThrow(unit.project_service_id);
      const serviceName = await resolveServiceName(parent.service_id);
      return { unit, parent, serviceName } satisfies UnitContext;
    })
  );
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
  entity: 'project-service' | 'service-unit' | 'service-extra' | 'project-billable',
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

async function logBillableStatusEvents(
  prev: ProjectBillable | undefined,
  next: ProjectBillable
) {
  const label = `${capitalize(next.billable_type)} billable`;
  await logStatusIfPromoted(
    'project-billable',
    'approved',
    prev?.approved_ind,
    next.approved_ind,
    next.project_id,
    `${label} approved.`
  );
  await logStatusIfPromoted(
    'project-billable',
    'completed',
    prev?.completed_ind,
    next.completed_ind,
    next.project_id,
    `${label} completed.`
  );
  await logStatusIfPromoted(
    'project-billable',
    'paid',
    prev?.paid_ind,
    next.paid_ind,
    next.project_id,
    `${label} paid.`
  );
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
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

'use client';

import Dexie from 'dexie';
import { db } from '../db';
import {
  ProjectEventSchema,
  ProjectSchema,
  ProjectServiceExtraSchema,
  ProjectServiceSchema,
  ProjectServiceUnitSchema,
  ServiceSchema,
  type Project,
  type ProjectEvent,
  type ProjectService,
  type ProjectServiceExtra,
  type ProjectServiceUnit,
  type Service
} from '../models';

const nowISO = () => new Date().toISOString();

// ---- Projects ----
export async function createProject(input: {
  group_id: string;
  title: string;
  description?: string;
  budget?: number;
}): Promise<Project> {
  const entity: Project = ProjectSchema.parse({
    id: crypto.randomUUID(),
    group_id: input.group_id,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    budget: input.budget,
    updated_at: nowISO()
  });
  await db.projects.add(entity);
  return entity;
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<Project, 'title' | 'description' | 'group_id' | 'budget'>>
): Promise<Project> {
  const existing = await db.projects.get(id);
  if (!existing) throw new Error('Project not found');

  const updated: Project = ProjectSchema.parse({
    ...existing,
    ...('title' in patch ? { title: patch.title!.trim() } : {}),
    ...('description' in patch ? { description: (patch.description ?? '').trim() } : {}),
    ...('group_id' in patch ? { group_id: patch.group_id } : {}),
    ...('budget' in patch ? { budget: patch.budget } : {}),
    updated_at: nowISO()
  });
  await db.projects.put(updated);
  return updated;
}

export async function deleteProject(id: string): Promise<void> {
  await db.transaction(
    'rw',
    db.projects,
    db.projectEvents,
    db.projectServices,
    db.projectServiceUnits,
    db.projectServiceExtras,
    async () => {
      await db.projectEvents.where('project_id').equals(id).delete();
      const services = await db.projectServices.where('project_id').equals(id).toArray();
      if (services.length > 0) {
        const serviceIds = services.map((service) => service.id);
        await db.projectServiceUnits.where('project_service_id').anyOf(serviceIds).delete();
        await db.projectServiceExtras.where('project_service_id').anyOf(serviceIds).delete();
      }
      await db.projectServices.where('project_id').equals(id).delete();
      await db.projects.delete(id);
    }
  );
}

export async function listProjects(): Promise<Project[]> {
  return db.projects.orderBy('updated_at').reverse().toArray();
}

export async function listProjectsByClientGroup(client_group_id: string): Promise<Project[]> {
  return db.projects
    .where('[group_id+updated_at]')
    .between([client_group_id, Dexie.minKey], [client_group_id, Dexie.maxKey])
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
  return updated;
}

export async function deleteProjectEvent(id: string): Promise<void> {
  const existing = await db.projectEvents.get(id);
  await db.projectEvents.delete(id);
  if (existing) {
    await db.projects.update(existing.project_id, { updated_at: nowISO() });
  }
}

// ---- Service Categories ----
export async function createServiceCategory(input: {
  name: string;
  description?: string;
}): Promise<Service> {
  const entity: Service = ServiceSchema.parse({
    id: crypto.randomUUID(),
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    created_at: nowISO(),
    updated_at: nowISO()
  });
  await db.serviceCategories.add(entity);
  return entity;
}

export async function updateServiceCategory(
  id: string,
  patch: Partial<Pick<Service, 'name' | 'description'>>
): Promise<Service> {
  const existing = await db.serviceCategories.get(id);
  if (!existing) throw new Error('Service category not found');
  const updated: Service = ServiceSchema.parse({
    ...existing,
    ...('name' in patch ? { name: patch.name!.trim() } : {}),
    ...('description' in patch ? { description: (patch.description ?? '').trim() } : {}),
    updated_at: nowISO()
  });
  await db.serviceCategories.put(updated);
  return updated;
}

export async function deleteServiceCategory(id: string): Promise<void> {
  await db.transaction(
    'rw',
    db.serviceCategories,
    db.projectServices,
    db.projectServiceUnits,
    db.projectServiceExtras,
    async () => {
      const services = await db.projectServices.where('service_id').equals(id).toArray();
      if (services.length > 0) {
        const serviceIds = services.map((service) => service.id);
        await db.projectServiceUnits.where('project_service_id').anyOf(serviceIds).delete();
        await db.projectServiceExtras.where('project_service_id').anyOf(serviceIds).delete();
      }
      await db.projectServices.where('service_id').equals(id).delete();
      await db.serviceCategories.delete(id);
    }
  );
}

export async function listServiceCategories(): Promise<Service[]> {
  return db.serviceCategories.orderBy('updated_at').reverse().toArray();
}

export async function getServiceCategory(id: string): Promise<Service | undefined> {
  return db.serviceCategories.get(id);
}

// ---- Project Services ----
export async function createProjectService(input: {
  project_id: string;
  service_id: string;
}): Promise<ProjectService> {
  const entity: ProjectService = ProjectServiceSchema.parse({
    id: crypto.randomUUID(),
    project_id: input.project_id,
    service_id: input.service_id,
    updated_at: nowISO()
  });
  await db.projectServices.add(entity);
  await Promise.all([
    db.projects.update(input.project_id, { updated_at: nowISO() }),
    db.serviceCategories.update(input.service_id, { updated_at: nowISO() })
  ]);
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
    db.projectServiceUnits
      .where('project_service_id')
      .anyOf(serviceIds)
      .toArray(),
    db.projectServiceExtras
      .where('project_service_id')
      .anyOf(serviceIds)
      .toArray()
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
  patch: Partial<Pick<ProjectService, 'project_id' | 'service_id'>>
): Promise<ProjectService> {
  const existing = await db.projectServices.get(id);
  if (!existing) throw new Error('Project service not found');
  const updated: ProjectService = ProjectServiceSchema.parse({
    ...existing,
    ...patch,
    updated_at: nowISO()
  });
  await db.projectServices.put(updated);
  await db.projects.update(updated.project_id, { updated_at: nowISO() });
  await db.serviceCategories.update(updated.service_id, { updated_at: nowISO() });
  return updated;
}

export async function deleteProjectService(id: string): Promise<void> {
  await db.transaction(
    'rw',
    db.projectServices,
    db.projectServiceUnits,
    db.projectServiceExtras,
    async () => {
      const existing = await db.projectServices.get(id);
      if (!existing) return;
      await db.projectServiceUnits.where('project_service_id').equals(id).delete();
      await db.projectServiceExtras.where('project_service_id').equals(id).delete();
      await db.projectServices.delete(id);
      await db.projects.update(existing.project_id, { updated_at: nowISO() });
      await db.serviceCategories.update(existing.service_id, { updated_at: nowISO() });
    }
  );
}

// ---- Project Service Units ----
export async function addProjectServiceUnit(
  project_service_id: string,
  input: Omit<ProjectServiceUnit, 'id' | 'project_service_id' | 'updated_at'>
): Promise<ProjectServiceUnit> {
  const entity: ProjectServiceUnit = ProjectServiceUnitSchema.parse({
    id: crypto.randomUUID(),
    project_service_id,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    updated_at: nowISO()
  });
  await db.projectServiceUnits.add(entity);
  await bumpParentForProjectService(project_service_id);
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
  patch: Partial<Omit<ProjectServiceUnit, 'id' | 'project_service_id'>>
): Promise<ProjectServiceUnit> {
  const existing = await db.projectServiceUnits.get(id);
  if (!existing) throw new Error('Project service unit not found');
  const updated: ProjectServiceUnit = ProjectServiceUnitSchema.parse({
    ...existing,
    ...('title' in patch ? { title: patch.title!.trim() } : {}),
    ...('description' in patch ? { description: (patch.description ?? '').trim() } : {}),
    updated_at: nowISO()
  });
  await db.projectServiceUnits.put(updated);
  await bumpParentForProjectService(existing.project_service_id);
  return updated;
}

export async function deleteProjectServiceUnit(id: string): Promise<void> {
  const existing = await db.projectServiceUnits.get(id);
  await db.projectServiceUnits.delete(id);
  if (existing) {
    await bumpParentForProjectService(existing.project_service_id);
  }
}

// ---- Project Service Extras ----
export async function addProjectServiceExtra(
  project_service_id: string,
  input: Omit<ProjectServiceExtra, 'id' | 'project_service_id' | 'updated_at'>
): Promise<ProjectServiceExtra> {
  const entity: ProjectServiceExtra = ProjectServiceExtraSchema.parse({
    id: crypto.randomUUID(),
    project_service_id,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    budget_type: input.budget_type ?? 'dollar',
    updated_at: nowISO()
  });
  await db.projectServiceExtras.add(entity);
  await bumpParentForProjectService(project_service_id);
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
  patch: Partial<Omit<ProjectServiceExtra, 'id' | 'project_service_id'>>
): Promise<ProjectServiceExtra> {
  const existing = await db.projectServiceExtras.get(id);
  if (!existing) throw new Error('Project service extra not found');
  const updated: ProjectServiceExtra = ProjectServiceExtraSchema.parse({
    ...existing,
    ...('title' in patch ? { title: patch.title!.trim() } : {}),
    ...('description' in patch ? { description: (patch.description ?? '').trim() } : {}),
    ...('budget_type' in patch ? { budget_type: patch.budget_type } : {}),
    updated_at: nowISO()
  });
  await db.projectServiceExtras.put(updated);
  await bumpParentForProjectService(existing.project_service_id);
  return updated;
}

export async function deleteProjectServiceExtra(id: string): Promise<void> {
  const existing = await db.projectServiceExtras.get(id);
  await db.projectServiceExtras.delete(id);
  if (existing) {
    await bumpParentForProjectService(existing.project_service_id);
  }
}

async function bumpParentForProjectService(project_service_id: string) {
  const parent = await db.projectServices.get(project_service_id);
  if (!parent) return;
  const timestamp = nowISO();
  await Promise.all([
    db.projectServices.update(project_service_id, { updated_at: timestamp }),
    db.projects.update(parent.project_id, { updated_at: timestamp }),
    db.serviceCategories.update(parent.service_id, { updated_at: timestamp })
  ]);
}

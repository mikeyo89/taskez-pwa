import Dexie, { Table } from 'dexie';
import type {
  Client,
  Member,
  MetaEntry,
  OutboxEntry,
  Project,
  ProjectEvent,
  ProjectService,
  ProjectServiceExtra,
  ProjectServiceUnit,
  Profile,
  Service
} from './models';

export class AppDB extends Dexie {
  clients!: Table<Client, string>;
  members!: Table<Member, string>;
  services!: Table<Service, string>;
  projects!: Table<Project, string>;
  projectEvents!: Table<ProjectEvent, string>;
  projectServices!: Table<ProjectService, string>;
  projectServiceUnits!: Table<ProjectServiceUnit, string>;
  projectServiceExtras!: Table<ProjectServiceExtra, string>;
  profiles!: Table<Profile, string>;
  outbox!: Table<OutboxEntry, string>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super('taskez_pwa_db');

    // v1 schema: define indexes
    this.version(1).stores({
      // '&id' = primary key; other fields become indexes
      clients: '&id, name, updated_at',
      // Query members by client_id frequently; also index by last_name for sorted lists
      members: '&id, client_id, last_name, updated_at, [client_id+last_name]',
      services: '&id, name, updated_at'
    });

    this.version(2).stores({
      clients: '&id, name, updated_at',
      members: '&id, client_id, last_name, updated_at, [client_id+last_name]',
      services: '&id, name, updated_at',
      projects: '&id, client_id, title, est_completion_date, completed_ind, updated_at, [client_id+updated_at], [completed_ind+updated_at], [est_completion_date]',
      projectEvents: '&id, project_id, reason, updated_at, [project_id+updated_at]',
      projectServices:
        '&id, project_id, service_id, approved_ind, completed_ind, paid_ind, updated_at, [project_id+service_id], [project_id+updated_at]',
      projectServiceUnits:
        '&id, project_service_id, title, approved_ind, completed_ind, paid_ind, updated_at, [project_service_id+updated_at]',
      projectServiceExtras:
        '&id, project_service_id, title, approved_ind, completed_ind, paid_ind, updated_at, [project_service_id+updated_at]'
    });

    this.version(3).stores({
      clients: '&id, name, updated_at',
      members: '&id, client_id, last_name, updated_at, [client_id+last_name]',
      services: '&id, name, updated_at',
      projects:
        '&id, client_id, title, est_completion_date, completed_ind, updated_at, [client_id+updated_at], [completed_ind+updated_at], [est_completion_date]',
      projectEvents: '&id, project_id, reason, updated_at, [project_id+updated_at]',
      projectServices:
        '&id, project_id, service_id, approved_ind, completed_ind, paid_ind, updated_at, [project_id+service_id], [project_id+updated_at]',
      projectServiceUnits:
        '&id, project_service_id, title, approved_ind, completed_ind, paid_ind, updated_at, [project_service_id+updated_at]',
      projectServiceExtras:
        '&id, project_service_id, title, approved_ind, completed_ind, paid_ind, updated_at, [project_service_id+updated_at]',
      profiles: '&id, updated_at'
    });

    this.version(4).stores({
      clients: '&id, name, updated_at, server_updated_at, deleted_at',
      members:
        '&id, client_id, last_name, updated_at, server_updated_at, deleted_at, [client_id+last_name]',
      services: '&id, name, updated_at, server_updated_at, deleted_at',
      projects:
        '&id, client_id, title, est_completion_date, completed_ind, updated_at, server_updated_at, deleted_at, [client_id+updated_at], [completed_ind+updated_at], [est_completion_date]',
      projectEvents:
        '&id, project_id, reason, updated_at, server_updated_at, deleted_at, [project_id+updated_at]',
      projectServices:
        '&id, project_id, service_id, approved_ind, completed_ind, paid_ind, updated_at, server_updated_at, deleted_at, [project_id+service_id], [project_id+updated_at]',
      projectServiceUnits:
        '&id, project_service_id, title, approved_ind, completed_ind, paid_ind, updated_at, server_updated_at, deleted_at, [project_service_id+updated_at]',
      projectServiceExtras:
        '&id, project_service_id, title, approved_ind, completed_ind, paid_ind, updated_at, server_updated_at, deleted_at, [project_service_id+updated_at]',
      profiles: '&id, updated_at, server_updated_at',
      outbox:
        '&op_id, &idempotency_key, entity, entity_id, action, status, created_at, updated_at',
      meta: '&key'
    });

    // Example migration pattern if/when you add indexes later:
    // this.version(3).stores({
    //   clients: '&id, name, updated_at, created_at',
    //   members: '&id, client_id, last_name, email, updated_at, [client_id+last_name]'
    // }).upgrade(async tx => {
    //   // optional data fixups here
    // });
  }
}

export const db = new AppDB();

import Dexie, { Table } from 'dexie';
import type {
  Client,
  Member,
  Project,
  ProjectEvent,
  ProjectService,
  ProjectServiceExtra,
  ProjectServiceUnit,
  Service
} from './models';

export class AppDB extends Dexie {
  clients!: Table<Client, string>;
  members!: Table<Member, string>;
  services!: Table<Service, string>;
  clientGroups!: Table<Client, string>;
  clientContacts!: Table<Member, string>;
  projects!: Table<Project, string>;
  projectEvents!: Table<ProjectEvent, string>;
  serviceCategories!: Table<Service, string>;
  projectServices!: Table<ProjectService, string>;
  projectServiceUnits!: Table<ProjectServiceUnit, string>;
  projectServiceExtras!: Table<ProjectServiceExtra, string>;

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
      clientGroups: '&id, name, updated_at',
      clientContacts:
        '&id, client_id, last_name, updated_at, [client_id+last_name], [client_id+updated_at]',
      projects: '&id, group_id, title, updated_at, [group_id+updated_at]',
      projectEvents: '&id, project_id, reason, updated_at, [project_id+updated_at]',
      serviceCategories: '&id, name, updated_at',
      projectServices:
        '&id, project_id, service_id, updated_at, [project_id+service_id], [project_id+updated_at]',
      projectServiceUnits: '&id, project_service_id, title, updated_at, [project_service_id+updated_at]',
      projectServiceExtras:
        '&id, project_service_id, title, budget_type, updated_at, [project_service_id+updated_at]'
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

import Dexie, { Table } from 'dexie';
import type { Client, Member, Service } from './models';

export class AppDB extends Dexie {
  clients!: Table<Client, string>;
  members!: Table<Member, string>;
  services!: Table<Service, string>;

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

    // Example migration pattern if/when you add indexes later:
    // this.version(2).stores({
    //   clients: '&id, name, updated_at, created_at',
    //   members: '&id, client_id, last_name, email, updated_at, [client_id+last_name]'
    // }).upgrade(async tx => {
    //   // optional data fixups here
    // });
  }
}

export const db = new AppDB();

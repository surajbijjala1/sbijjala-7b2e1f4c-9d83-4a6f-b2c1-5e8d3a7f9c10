import { DataSource } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Task } from './task.entity';

/**
 * Creates a fresh in-memory SQLite DataSource for each test run.
 * Uses synchronize: true so TypeORM auto-creates tables from entities.
 */
export async function createTestDataSource(): Promise<DataSource> {
  const ds = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    synchronize: true,
    dropSchema: true,
    entities: [Organization, User, Task],
  });
  return ds.initialize();
}

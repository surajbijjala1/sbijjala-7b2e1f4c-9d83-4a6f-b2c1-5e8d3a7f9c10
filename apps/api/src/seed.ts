/**
 * Seed script — creates sample Organizations, Users, and Tasks
 * for manual Swagger UI testing.
 *
 * Run with:  npx tsx apps/api/src/seed.ts
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Organization } from './app/entities/organization.entity.js';
import { User } from './app/entities/user.entity.js';
import { Task } from './app/entities/task.entity.js';
import { Role, TaskStatus, TaskCategory } from '@turbomonorepo/shared-data';

async function seed() {
  const ds = new DataSource({
    type: 'sqlite',
    database: 'db/taskmanager.db',
    synchronize: true,
    entities: [Organization, User, Task],
  });

  await ds.initialize();
  console.log('📦  Database connected');

  const orgRepo = ds.getRepository(Organization);
  const userRepo = ds.getRepository(User);
  const taskRepo = ds.getRepository(Task);

  // ── Organizations ───────────────────────────────────────
  const acme = orgRepo.create({ name: 'Acme Corp', parentId: null });
  await orgRepo.save(acme);

  const acmeVet = orgRepo.create({ name: 'Acme Veterinary', parentId: acme.id });
  await orgRepo.save(acmeVet);

  const globex = orgRepo.create({ name: 'Globex Inc', parentId: null });
  await orgRepo.save(globex);

  console.log('✅  Organizations created:', acme.id, acmeVet.id, globex.id);

  // ── Users ───────────────────────────────────────────────
  const hash = async (pw: string) => bcrypt.hash(pw, 10);

  const ownerUser = userRepo.create({
    email: 'owner@acme.com',
    password: await hash('owner123'),
    role: Role.Owner,
    organizationId: acme.id,
  });
  await userRepo.save(ownerUser);

  const adminUser = userRepo.create({
    email: 'admin@acme.com',
    password: await hash('admin123'),
    role: Role.Admin,
    organizationId: acme.id,
  });
  await userRepo.save(adminUser);

  const viewerUser = userRepo.create({
    email: 'viewer@acme.com',
    password: await hash('viewer123'),
    role: Role.Viewer,
    organizationId: acme.id,
  });
  await userRepo.save(viewerUser);

  const globexAdmin = userRepo.create({
    email: 'admin@globex.com',
    password: await hash('globex123'),
    role: Role.Admin,
    organizationId: globex.id,
  });
  await userRepo.save(globexAdmin);

  console.log('✅  Users created');
  console.log('   owner@acme.com   / owner123   (Owner,  Acme)');
  console.log('   admin@acme.com   / admin123   (Admin,  Acme)');
  console.log('   viewer@acme.com  / viewer123  (Viewer, Acme)');
  console.log('   admin@globex.com / globex123  (Admin,  Globex)');

  // ── Tasks (pre-populated for Acme) ──────────────────────
  const task1 = taskRepo.create({
    title: 'Fix login page CSS',
    description: 'The login button overflows on mobile devices',
    status: TaskStatus.Open,
    category: TaskCategory.Bug,
    userId: adminUser.id,
    organizationId: acme.id,
  });

  const task2 = taskRepo.create({
    title: 'Add dark-mode support',
    description: null,
    status: TaskStatus.InProgress,
    category: TaskCategory.Feature,
    userId: ownerUser.id,
    organizationId: acme.id,
  });

  const task3 = taskRepo.create({
    title: 'Write API documentation',
    description: 'Cover all endpoints with examples',
    status: TaskStatus.Done,
    category: TaskCategory.Documentation,
    userId: viewerUser.id,
    organizationId: acme.id,
  });

  await taskRepo.save([task1, task2, task3]);

  console.log('✅  Tasks created:', task1.id, task2.id, task3.id);

  await ds.destroy();
  console.log('\n🎉  Seed complete!  Start the server with:  npx nx serve api');
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});

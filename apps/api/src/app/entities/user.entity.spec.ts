import { DataSource, Repository } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Role } from '@turbomonorepo/shared-data';
import { createTestDataSource } from './test-utils';

describe('User Entity', () => {
  let ds: DataSource;
  let orgRepo: Repository<Organization>;
  let userRepo: Repository<User>;

  beforeEach(async () => {
    ds = await createTestDataSource();
    orgRepo = ds.getRepository(Organization);
    userRepo = ds.getRepository(User);
  });

  afterEach(async () => {
    if (ds?.isInitialized) {
      await ds.destroy();
    }
  });

  it('should create a user linked to an organization', async () => {
    const org = await orgRepo.save(
      orgRepo.create({ name: 'Acme Corp', parentId: null }),
    );

    const user = userRepo.create({
      email: 'admin@acme.com',
      password: 'hashed_password',
      role: Role.Admin,
      organizationId: org.id,
    });
    const saved = await userRepo.save(user);

    expect(saved.id).toBeDefined();
    expect(saved.email).toBe('admin@acme.com');
    expect(saved.role).toBe(Role.Admin);
    expect(saved.organizationId).toBe(org.id);
  });

  it('should default role to Viewer', async () => {
    const org = await orgRepo.save(
      orgRepo.create({ name: 'Acme Corp', parentId: null }),
    );

    const user = userRepo.create({
      email: 'viewer@acme.com',
      password: 'hashed_password',
      organizationId: org.id,
    });
    const saved = await userRepo.save(user);

    expect(saved.role).toBe(Role.Viewer);
  });

  it('should enforce unique email constraint', async () => {
    const org = await orgRepo.save(
      orgRepo.create({ name: 'Acme Corp', parentId: null }),
    );

    await userRepo.save(
      userRepo.create({
        email: 'dup@acme.com',
        password: 'pass1',
        role: Role.Viewer,
        organizationId: org.id,
      }),
    );

    const duplicate = userRepo.create({
      email: 'dup@acme.com',
      password: 'pass2',
      role: Role.Viewer,
      organizationId: org.id,
    });

    await expect(userRepo.save(duplicate)).rejects.toThrow();
  });

  it('should load the organization relation', async () => {
    const org = await orgRepo.save(
      orgRepo.create({ name: 'Acme Corp', parentId: null }),
    );

    await userRepo.save(
      userRepo.create({
        email: 'test@acme.com',
        password: 'pass',
        role: Role.Owner,
        organizationId: org.id,
      }),
    );

    const loaded = await userRepo.findOne({
      where: { email: 'test@acme.com' },
      relations: ['organization'],
    });

    expect(loaded?.organization).toBeDefined();
    expect(loaded?.organization?.name).toBe('Acme Corp');
  });

  it('should accept all three Role values', async () => {
    const org = await orgRepo.save(
      orgRepo.create({ name: 'Acme Corp', parentId: null }),
    );

    for (const role of [Role.Owner, Role.Admin, Role.Viewer]) {
      const user = await userRepo.save(
        userRepo.create({
          email: `${role}@acme.com`,
          password: 'pass',
          role,
          organizationId: org.id,
        }),
      );
      expect(user.role).toBe(role);
    }
  });
});

import { DataSource, Repository } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Task } from './task.entity';
import { Role, TaskStatus, TaskCategory } from '@turbomonorepo/shared-data';
import { createTestDataSource } from './test-utils';

describe('Task Entity', () => {
  let ds: DataSource;
  let orgRepo: Repository<Organization>;
  let userRepo: Repository<User>;
  let taskRepo: Repository<Task>;

  let org: Organization;
  let user: User;

  beforeEach(async () => {
    ds = await createTestDataSource();
    orgRepo = ds.getRepository(Organization);
    userRepo = ds.getRepository(User);
    taskRepo = ds.getRepository(Task);

    org = await orgRepo.save(
      orgRepo.create({ name: 'Acme Corp', parentId: null }),
    );
    user = await userRepo.save(
      userRepo.create({
        email: 'dev@acme.com',
        password: 'hashed',
        role: Role.Admin,
        organizationId: org.id,
      }),
    );
  });

  afterEach(async () => {
    if (ds?.isInitialized) {
      await ds.destroy();
    }
  });

  it('should create a task linked to a user and organization', async () => {
    const task = taskRepo.create({
      title: 'Fix login bug',
      description: 'Users cannot log in on Safari',
      status: TaskStatus.Open,
      category: TaskCategory.Bug,
      userId: user.id,
      organizationId: org.id,
    });
    const saved = await taskRepo.save(task);

    expect(saved.id).toBeDefined();
    expect(saved.title).toBe('Fix login bug');
    expect(saved.userId).toBe(user.id);
    expect(saved.organizationId).toBe(org.id);
  });

  it('should default status to Open and category to Feature', async () => {
    const task = taskRepo.create({
      title: 'Add dark mode',
      userId: user.id,
      organizationId: org.id,
    });
    const saved = await taskRepo.save(task);

    expect(saved.status).toBe(TaskStatus.Open);
    expect(saved.category).toBe(TaskCategory.Feature);
  });

  it('should auto-generate createdAt and updatedAt timestamps', async () => {
    const task = await taskRepo.save(
      taskRepo.create({
        title: 'Timestamps test',
        userId: user.id,
        organizationId: org.id,
      }),
    );

    expect(task.createdAt).toBeInstanceOf(Date);
    expect(task.updatedAt).toBeInstanceOf(Date);
  });

  it('should load user and organization relations', async () => {
    await taskRepo.save(
      taskRepo.create({
        title: 'Relation test',
        userId: user.id,
        organizationId: org.id,
      }),
    );

    const loaded = await taskRepo.findOne({
      where: { title: 'Relation test' },
      relations: ['user', 'organization'],
    });

    expect(loaded?.user).toBeDefined();
    expect(loaded?.user?.email).toBe('dev@acme.com');
    expect(loaded?.organization).toBeDefined();
    expect(loaded?.organization?.name).toBe('Acme Corp');
  });

  it('should allow nullable description', async () => {
    const task = await taskRepo.save(
      taskRepo.create({
        title: 'No description',
        description: null,
        userId: user.id,
        organizationId: org.id,
      }),
    );

    expect(task.description).toBeNull();
  });

  it('should accept all TaskStatus values', async () => {
    for (const status of [TaskStatus.Open, TaskStatus.InProgress, TaskStatus.Done]) {
      const task = await taskRepo.save(
        taskRepo.create({
          title: `Status ${status}`,
          status,
          userId: user.id,
          organizationId: org.id,
        }),
      );
      expect(task.status).toBe(status);
    }
  });

  it('should accept all TaskCategory values', async () => {
    for (const category of [
      TaskCategory.Bug,
      TaskCategory.Feature,
      TaskCategory.Improvement,
      TaskCategory.Documentation,
    ]) {
      const task = await taskRepo.save(
        taskRepo.create({
          title: `Category ${category}`,
          category,
          userId: user.id,
          organizationId: org.id,
        }),
      );
      expect(task.category).toBe(category);
    }
  });

  it('should cascade delete tasks when user is deleted', async () => {
    await taskRepo.save(
      taskRepo.create({
        title: 'Cascade test',
        userId: user.id,
        organizationId: org.id,
      }),
    );

    await userRepo.remove(user);
    const remaining = await taskRepo.find();
    expect(remaining).toHaveLength(0);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role, TaskStatus, TaskCategory } from '@turbomonorepo/shared-data';
import type { JwtPayload } from '../auth/jwt.strategy';

describe('TaskController', () => {
  let controller: TaskController;
  let mockTaskService: {
    createTask: jest.Mock;
    getTasks: jest.Mock;
    updateTask: jest.Mock;
    deleteTask: jest.Mock;
  };

  const ownerPayload: JwtPayload = {
    sub: 'user-1',
    role: Role.Owner,
    organizationId: 'org-1',
  };

  const adminPayload: JwtPayload = {
    sub: 'user-2',
    role: Role.Admin,
    organizationId: 'org-1',
  };

  const viewerPayload: JwtPayload = {
    sub: 'user-3',
    role: Role.Viewer,
    organizationId: 'org-1',
  };

  beforeEach(async () => {
    mockTaskService = {
      createTask: jest.fn(),
      getTasks: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        { provide: TaskService, useValue: mockTaskService },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TaskController>(TaskController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── POST /tasks ─────────────────────────────────────────

  describe('create', () => {
    it('should call taskService.createTask and return the result', async () => {
      const dto = {
        title: 'New task',
        status: TaskStatus.Open,
        category: TaskCategory.Bug,
      };
      const createdTask = { id: 'task-1', ...dto, organizationId: 'org-1' };
      mockTaskService.createTask.mockResolvedValue(createdTask);

      const result = await controller.create(dto, { user: ownerPayload });

      expect(mockTaskService.createTask).toHaveBeenCalledWith(dto, ownerPayload);
      expect(result).toEqual(createdTask);
    });
  });

  // ── GET /tasks ──────────────────────────────────────────

  describe('findAll', () => {
    it('should return tasks from taskService.getTasks', async () => {
      const tasks = [
        { id: 't1', title: 'Task 1', organizationId: 'org-1' },
        { id: 't2', title: 'Task 2', organizationId: 'org-1' },
      ];
      mockTaskService.getTasks.mockResolvedValue(tasks);

      const result = await controller.findAll({ user: adminPayload });

      expect(mockTaskService.getTasks).toHaveBeenCalledWith(adminPayload);
      expect(result).toHaveLength(2);
    });

    it('should return an empty array when no tasks exist', async () => {
      mockTaskService.getTasks.mockResolvedValue([]);

      const result = await controller.findAll({ user: viewerPayload });

      expect(result).toEqual([]);
    });
  });

  // ── PUT /tasks/:id ─────────────────────────────────────

  describe('update', () => {
    it('should call taskService.updateTask with id, dto, and user', async () => {
      const dto = { title: 'Updated title' };
      const updatedTask = { id: 'task-1', title: 'Updated title', organizationId: 'org-1' };
      mockTaskService.updateTask.mockResolvedValue(updatedTask);

      const result = await controller.update('task-1', dto, { user: adminPayload });

      expect(mockTaskService.updateTask).toHaveBeenCalledWith('task-1', dto, adminPayload);
      expect(result).toEqual(updatedTask);
    });
  });

  // ── DELETE /tasks/:id ──────────────────────────────────

  describe('remove', () => {
    it('should call taskService.deleteTask with id and user', async () => {
      mockTaskService.deleteTask.mockResolvedValue(undefined);

      await controller.remove('task-1', { user: ownerPayload });

      expect(mockTaskService.deleteTask).toHaveBeenCalledWith('task-1', ownerPayload);
    });
  });

  // ── RBAC metadata ──────────────────────────────────────

  describe('RBAC decorators', () => {
    it('should have @Roles(Owner, Admin) on the delete handler', () => {
      const reflector = new Reflector();
      const roles = reflector.get<Role[]>('roles', TaskController.prototype.remove);

      expect(roles).toBeDefined();
      expect(roles).toContain(Role.Owner);
      expect(roles).toContain(Role.Admin);
      expect(roles).not.toContain(Role.Viewer);
    });

    it('should NOT have @Roles on the create handler (all authenticated users)', () => {
      const reflector = new Reflector();
      const roles = reflector.get<Role[]>('roles', TaskController.prototype.create);

      expect(roles).toBeUndefined();
    });

    it('should NOT have @Roles on the findAll handler (all authenticated users)', () => {
      const reflector = new Reflector();
      const roles = reflector.get<Role[]>('roles', TaskController.prototype.findAll);

      expect(roles).toBeUndefined();
    });

    it('should NOT have @Roles on the update handler (all authenticated users)', () => {
      const reflector = new Reflector();
      const roles = reflector.get<Role[]>('roles', TaskController.prototype.update);

      expect(roles).toBeUndefined();
    });
  });
});

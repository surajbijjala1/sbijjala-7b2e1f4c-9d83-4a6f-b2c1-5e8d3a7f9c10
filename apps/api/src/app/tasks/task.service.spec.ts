import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as nodeFs from 'node:fs';
import { TaskService } from './task.service';
import { Task } from '../entities/task.entity';
import { TaskStatus, TaskCategory, Role } from '@turbomonorepo/shared-data';
import type { JwtPayload } from '../auth/jwt.strategy';

// Spy on appendFileSync so it doesn't write to disk but we can assert on it
let appendSpy: jest.SpyInstance;

beforeEach(() => {
  appendSpy = jest.spyOn(nodeFs, 'appendFileSync').mockImplementation(() => {});
});

afterEach(() => {
  appendSpy.mockRestore();
});

describe('TaskService', () => {
  let service: TaskService;
  let mockTaskRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };

  const userPayload: JwtPayload = {
    sub: 'user-uuid-1',
    role: Role.Admin,
    organizationId: 'org-uuid-1',
  };

  const otherOrgPayload: JwtPayload = {
    sub: 'user-uuid-2',
    role: Role.Admin,
    organizationId: 'org-uuid-other',
  };

  beforeEach(async () => {
    mockTaskRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) =>
        Promise.resolve({ id: 'task-uuid-1', createdAt: new Date(), updatedAt: new Date(), ...entity }),
      ),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepo,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  // ── createTask ──────────────────────────────────────────

  describe('createTask', () => {
    it('should create a task scoped to the user organization', async () => {
      const dto = {
        title: 'Fix login bug',
        description: 'The login page is broken',
        status: TaskStatus.Open,
        category: TaskCategory.Bug,
      };

      const result = await service.createTask(dto, userPayload);

      expect(mockTaskRepo.create).toHaveBeenCalledWith({
        title: 'Fix login bug',
        description: 'The login page is broken',
        status: TaskStatus.Open,
        category: TaskCategory.Bug,
        userId: 'user-uuid-1',
        organizationId: 'org-uuid-1',
      });
      expect(mockTaskRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('should default description to null when not provided', async () => {
      const dto = {
        title: 'Quick task',
        status: TaskStatus.Open,
        category: TaskCategory.Feature,
      };

      await service.createTask(dto, userPayload);

      expect(mockTaskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: null }),
      );
    });

    it('should stamp the task with the requesting user id', async () => {
      const dto = {
        title: 'My task',
        status: TaskStatus.InProgress,
        category: TaskCategory.Improvement,
      };

      await service.createTask(dto, userPayload);

      expect(mockTaskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-uuid-1' }),
      );
    });
  });

  // ── getTasks ────────────────────────────────────────────

  describe('getTasks', () => {
    it('should return tasks scoped to the user organization', async () => {
      const tasks = [
        { id: 't1', title: 'Task 1', organizationId: 'org-uuid-1' },
        { id: 't2', title: 'Task 2', organizationId: 'org-uuid-1' },
      ];
      mockTaskRepo.find.mockResolvedValue(tasks);

      const result = await service.getTasks(userPayload);

      expect(mockTaskRepo.find).toHaveBeenCalledWith({
        where: { organizationId: 'org-uuid-1' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('should return an empty array if the org has no tasks', async () => {
      mockTaskRepo.find.mockResolvedValue([]);

      const result = await service.getTasks(userPayload);

      expect(result).toEqual([]);
    });
  });

  // ── updateTask ──────────────────────────────────────────

  describe('updateTask', () => {
    it('should update a task that belongs to the same org', async () => {
      const existingTask = {
        id: 'task-uuid-1',
        title: 'Old title',
        organizationId: 'org-uuid-1',
      };
      mockTaskRepo.findOne.mockResolvedValue({ ...existingTask });

      const result = await service.updateTask(
        'task-uuid-1',
        { title: 'New title' },
        userPayload,
      );

      expect(result.title).toBe('New title');
      expect(mockTaskRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if task does not exist', async () => {
      mockTaskRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateTask('nonexistent', { title: 'X' }, userPayload),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if task belongs to a different org', async () => {
      mockTaskRepo.findOne.mockResolvedValue({
        id: 'task-uuid-1',
        organizationId: 'org-uuid-1',
      });

      await expect(
        service.updateTask('task-uuid-1', { title: 'X' }, otherOrgPayload),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow partial updates (only changed fields)', async () => {
      mockTaskRepo.findOne.mockResolvedValue({
        id: 'task-uuid-1',
        title: 'Original',
        status: TaskStatus.Open,
        organizationId: 'org-uuid-1',
      });

      const result = await service.updateTask(
        'task-uuid-1',
        { status: TaskStatus.Done },
        userPayload,
      );

      expect(result.title).toBe('Original');
      expect(result.status).toBe(TaskStatus.Done);
    });
  });

  // ── deleteTask ──────────────────────────────────────────

  describe('deleteTask', () => {
    it('should delete a task that belongs to the same org', async () => {
      mockTaskRepo.findOne.mockResolvedValue({
        id: 'task-uuid-1',
        organizationId: 'org-uuid-1',
      });

      await expect(
        service.deleteTask('task-uuid-1', userPayload),
      ).resolves.toBeUndefined();

      expect(mockTaskRepo.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException if task does not exist', async () => {
      mockTaskRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteTask('nonexistent', userPayload),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if task belongs to a different org', async () => {
      mockTaskRepo.findOne.mockResolvedValue({
        id: 'task-uuid-1',
        organizationId: 'org-uuid-1',
      });

      await expect(
        service.deleteTask('task-uuid-1', otherOrgPayload),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── audit logging ───────────────────────────────────────

  describe('audit logging', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
      logSpy = jest.spyOn((service as any).logger, 'log');
      appendSpy.mockClear();
    });

    it('should log an audit entry when a task is created', async () => {
      const dto = {
        title: 'Audit me',
        status: TaskStatus.Open,
        category: TaskCategory.Documentation,
      };

      await service.createTask(dto, userPayload);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT]'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('created'),
      );
      expect(appendSpy).toHaveBeenCalledWith(
        expect.stringContaining('audit.log'),
        expect.stringContaining('[AUDIT]'),
        'utf-8',
      );
    });

    it('should log an audit entry when a task is updated', async () => {
      mockTaskRepo.findOne.mockResolvedValue({
        id: 'task-uuid-1',
        organizationId: 'org-uuid-1',
      });

      await service.updateTask('task-uuid-1', { title: 'Updated' }, userPayload);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT]'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('updated'),
      );
      expect(appendSpy).toHaveBeenCalledWith(
        expect.stringContaining('audit.log'),
        expect.stringContaining('updated'),
        'utf-8',
      );
    });

    it('should log an audit entry when a task is deleted', async () => {
      mockTaskRepo.findOne.mockResolvedValue({
        id: 'task-uuid-1',
        organizationId: 'org-uuid-1',
      });

      await service.deleteTask('task-uuid-1', userPayload);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT]'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('deleted'),
      );
      expect(appendSpy).toHaveBeenCalledWith(
        expect.stringContaining('audit.log'),
        expect.stringContaining('deleted'),
        'utf-8',
      );
    });
  });
});

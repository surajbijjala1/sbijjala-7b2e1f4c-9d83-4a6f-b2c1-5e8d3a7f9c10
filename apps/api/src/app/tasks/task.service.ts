import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'node:fs';
import { resolve } from 'node:path';
import { Task } from '../entities/task.entity.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';
import type { ICreateTask, IUpdateTask } from '@turbomonorepo/shared-data';

const AUDIT_LOG_PATH = resolve(process.cwd(), 'audit.log');

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  /** Append a timestamped line to the audit log file and also log to console. */
  private audit(message: string): void {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    this.logger.log(message);
    fs.appendFileSync(AUDIT_LOG_PATH, line, 'utf-8');
  }

  /**
   * Create a task scoped to the requesting user's organization.
   */
  async createTask(dto: ICreateTask, user: JwtPayload): Promise<Task> {
    const task = this.taskRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status,
      category: dto.category,
      userId: user.sub,
      organizationId: user.organizationId,
    });

    const saved = await this.taskRepo.save(task);

    this.audit(
      `[AUDIT] User [${user.sub}] created Task [${saved.id}] in Org [${user.organizationId}]`,
    );

    return saved;
  }

  /**
   * Get all tasks visible to the requesting user.
   * Tasks are scoped to the user's organizationId.
   */
  async getTasks(user: JwtPayload): Promise<Task[]> {
    return this.taskRepo.find({
      where: { organizationId: user.organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update a task. Ensures the task belongs to the user's organization.
   */
  async updateTask(
    taskId: string,
    dto: IUpdateTask,
    user: JwtPayload,
  ): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task [${taskId}] not found`);
    }

    if (task.organizationId !== user.organizationId) {
      throw new ForbiddenException(
        'You do not have access to this task',
      );
    }

    Object.assign(task, dto);
    const updated = await this.taskRepo.save(task);

    this.audit(
      `[AUDIT] User [${user.sub}] updated Task [${taskId}] in Org [${user.organizationId}]`,
    );

    return updated;
  }

  /**
   * Delete a task. Ensures the task belongs to the user's organization.
   */
  async deleteTask(taskId: string, user: JwtPayload): Promise<void> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });

    if (!task) {
      throw new NotFoundException(`Task [${taskId}] not found`);
    }

    if (task.organizationId !== user.organizationId) {
      throw new ForbiddenException(
        'You do not have access to this task',
      );
    }

    await this.taskRepo.remove(task);

    this.audit(
      `[AUDIT] User [${user.sub}] deleted Task [${taskId}] from Org [${user.organizationId}]`,
    );
  }
}

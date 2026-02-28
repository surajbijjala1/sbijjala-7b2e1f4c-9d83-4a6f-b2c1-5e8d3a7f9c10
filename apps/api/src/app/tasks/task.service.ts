import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';
import type { ICreateTask, IUpdateTask } from '@turbomonorepo/shared-data';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

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

    this.logger.log(
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

    this.logger.log(
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

    this.logger.log(
      `[AUDIT] User [${user.sub}] deleted Task [${taskId}] from Org [${user.organizationId}]`,
    );
  }
}

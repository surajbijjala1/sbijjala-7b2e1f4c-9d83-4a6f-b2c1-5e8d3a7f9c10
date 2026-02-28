import { TaskStatus } from '../task-status.enum.js';
import { TaskCategory } from '../task-category.enum.js';

export interface ITask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  category: TaskCategory;
  userId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateTask {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  category?: TaskCategory;
}

export interface IUpdateTask {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  category?: TaskCategory;
}

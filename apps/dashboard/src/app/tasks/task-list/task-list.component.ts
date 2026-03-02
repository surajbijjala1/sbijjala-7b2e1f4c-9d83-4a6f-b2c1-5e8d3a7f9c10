import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { TaskService, Task, CreateTaskDto } from '../task.service';
import { AuthService } from '../../auth/auth.service';

/** Column definition for the Kanban board. */
interface KanbanColumn {
  id: Task['status'];
  label: string;
  color: string;
  tasks: Task[];
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div class="min-h-screen bg-gray-100">
      <!-- Top bar -->
      <header
        class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10"
      >
        <div
          class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between"
        >
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Task Board</h1>
            <p class="text-sm text-gray-500 mt-0.5">
              <span *ngIf="canEdit">Drag tasks between columns to update their status</span>
              <span *ngIf="!canEdit">You have read-only access</span>
            </p>
          </div>

          <div class="flex items-center gap-3">
            <!-- Role badge -->
            <span
              class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              [ngClass]="{
                'bg-indigo-100 text-indigo-700': userRole === 'owner',
                'bg-blue-100 text-blue-700': userRole === 'admin',
                'bg-gray-100 text-gray-600': userRole === 'viewer'
              }"
            >
              {{ userRole | uppercase }}
            </span>

            <button
              *ngIf="canEdit"
              (click)="openAddDialog()"
              class="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2
                     text-sm font-semibold text-white shadow-sm
                     hover:bg-indigo-500 focus:outline-none focus:ring-2
                     focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              <!-- Plus icon -->
              <svg
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Add Task
            </button>

            <button
              (click)="logout()"
              class="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-2
                     text-sm font-medium text-gray-700 hover:bg-gray-200
                     transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <!-- Add-task inline form -->
      <div
        *ngIf="showAddForm"
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4"
      >
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 class="text-sm font-semibold text-gray-800 mb-3">New Task</h3>

          <form (ngSubmit)="addTask()" #addForm="ngForm" class="space-y-3">
            <div class="flex flex-col sm:flex-row gap-3">
              <input
                name="newTitle"
                [(ngModel)]="newTaskTitle"
                required
                placeholder="Task title…"
                class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm
                       placeholder-gray-400 shadow-sm
                       focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              <select
                name="newCategory"
                [(ngModel)]="newTaskCategory"
                class="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                       focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="improvement">Improvement</option>
                <option value="documentation">Documentation</option>
              </select>
            </div>

            <!-- Description textarea -->
            <textarea
              name="newDescription"
              [(ngModel)]="newTaskDescription"
              placeholder="Description (optional)…"
              rows="2"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                     placeholder-gray-400 shadow-sm
                     focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500
                     resize-y"
            ></textarea>

            <div class="flex gap-2">
              <button
                type="submit"
                [disabled]="!addForm.valid"
                class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                       shadow-sm hover:bg-indigo-500 disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                (click)="showAddForm = false"
                class="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700
                       hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Error banner -->
      <div
        *ngIf="errorMessage"
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4"
      >
        <div
          class="rounded-md bg-red-50 border border-red-200 p-3 flex items-center justify-between"
        >
          <p class="text-sm text-red-700">{{ errorMessage }}</p>
          <button
            (click)="errorMessage = ''"
            class="text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Kanban columns -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div
          class="grid grid-cols-1 md:grid-cols-3 gap-6"
          *ngIf="!isLoading; else loadingTpl"
        >
          <div
            *ngFor="let col of columns"
            class="flex flex-col bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
          >
            <!-- Column header -->
            <div
              class="px-4 py-3 border-b border-gray-200 flex items-center justify-between"
              [ngClass]="{
                'bg-blue-50': col.id === 'open',
                'bg-yellow-50': col.id === 'in_progress',
                'bg-green-50': col.id === 'done'
              }"
            >
              <h2
                class="text-sm font-bold uppercase tracking-wide"
                [ngClass]="{
                  'text-blue-700': col.id === 'open',
                  'text-yellow-700': col.id === 'in_progress',
                  'text-green-700': col.id === 'done'
                }"
              >
                {{ col.label }}
              </h2>
              <span
                class="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold"
                [ngClass]="{
                  'bg-blue-100 text-blue-700': col.id === 'open',
                  'bg-yellow-100 text-yellow-700': col.id === 'in_progress',
                  'bg-green-100 text-green-700': col.id === 'done'
                }"
              >
                {{ col.tasks.length }}
              </span>
            </div>

            <!-- Drop zone -->
            <div
              cdkDropList
              [id]="col.id"
              [cdkDropListData]="col.tasks"
              [cdkDropListConnectedTo]="connectedLists"
              [cdkDropListDisabled]="!canEdit"
              (cdkDropListDropped)="drop($event)"
              class="flex-1 p-3 min-h-[200px] space-y-3"
            >
              <!-- Task card -->
              <div
                *ngFor="let task of col.tasks"
                cdkDrag
                [cdkDragDisabled]="!canEdit"
                class="bg-white rounded-lg shadow-sm border border-gray-200
                       p-3 transition-shadow"
                [ngClass]="canEdit ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-default'"
              >
                <!-- Card header row -->
                <div class="flex items-start justify-between gap-2">
                  <h3
                    class="text-sm font-semibold text-gray-900 leading-snug"
                  >
                    {{ task.title }}
                  </h3>

                  <!-- Delete button (Owner/Admin only) -->
                  <button
                    *ngIf="canDelete"
                    (click)="deleteTask(task.id, $event)"
                    title="Delete task"
                    class="flex-shrink-0 p-1 rounded text-gray-400
                           hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21
                           c.342.052.682.107 1.022.166m-1.022-.165L18.16
                           19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25
                           2.25 0 0 1-2.244-2.077L4.772 5.79m14.456
                           0a48.108 48.108 0 0 0-3.478-.397m-12
                           .562c.34-.059.68-.114 1.022-.165m0
                           0a48.11 48.11 0 0 1 3.478-.397m7.5
                           0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964
                           51.964 0 0 0-3.32 0c-1.18.037-2.09
                           1.022-2.09 2.201v.916m7.5 0a48.667
                           48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </div>

                <!-- Description (if present) -->
                <p
                  *ngIf="task.description"
                  class="mt-1 text-xs text-gray-500 line-clamp-2"
                >
                  {{ task.description }}
                </p>

                <!-- Category badge -->
                <div class="mt-2 flex items-center gap-2">
                  <span
                    class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                    [ngClass]="categoryClass(task.category)"
                  >
                    {{ task.category }}
                  </span>
                </div>
              </div>

              <!-- Empty state -->
              <div
                *ngIf="col.tasks.length === 0"
                class="text-center py-8 text-sm text-gray-400"
              >
                No tasks
              </div>
            </div>
          </div>
        </div>

        <!-- Loading state -->
        <ng-template #loadingTpl>
          <div class="flex items-center justify-center py-20">
            <p class="text-gray-500">Loading tasks…</p>
          </div>
        </ng-template>
      </main>
    </div>
  `,
  styles: [`
    .cdk-drag-placeholder {
      opacity: 0.4;
      border: 2px dashed #6366f1;
      border-radius: 0.5rem;
    }
    .cdk-drag-animating {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }
  `],
})
export class TaskListComponent implements OnInit {
  columns: KanbanColumn[] = [
    { id: 'open', label: 'To Do', color: 'blue', tasks: [] },
    { id: 'in_progress', label: 'In Progress', color: 'yellow', tasks: [] },
    { id: 'done', label: 'Done', color: 'green', tasks: [] },
  ];

  /** IDs used to connect the three drop lists so tasks can move between them. */
  connectedLists: string[] = ['open', 'in_progress', 'done'];

  isLoading = true;
  errorMessage = '';

  showAddForm = false;
  newTaskTitle = '';
  newTaskDescription = '';
  newTaskCategory: Task['category'] = 'feature';

  /** Current user's role. */
  userRole: string | null = null;

  /** Whether the current user can delete tasks (Owner or Admin). */
  canDelete = false;

  /** Whether the current user can create/edit tasks (Owner or Admin). */
  canEdit = false;

  constructor(
    private readonly taskService: TaskService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getUserRole();
    this.canDelete = this.userRole === 'owner' || this.userRole === 'admin';
    this.canEdit = this.userRole === 'owner' || this.userRole === 'admin';

    this.taskService.tasks$.subscribe((tasks) => {
      this.distributeToColumns(tasks);
      this.cdr.detectChanges();
    });

    this.taskService.loadTasks().subscribe({
      next: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          err.error?.message || 'Failed to load tasks. Is the API running?';
        this.cdr.detectChanges();
      },
    });
  }

  /** Open the inline "Add Task" form. */
  openAddDialog(): void {
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.newTaskCategory = 'feature';
    this.showAddForm = true;
  }

  /** Submit the new task to the API. */
  addTask(): void {
    if (!this.newTaskTitle.trim()) return;

    const dto: CreateTaskDto = {
      title: this.newTaskTitle.trim(),
      description: this.newTaskDescription.trim() || null,
      status: 'open',
      category: this.newTaskCategory,
    };

    this.taskService.createTask(dto).subscribe({
      next: () => {
        this.showAddForm = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to create task.';
        this.cdr.detectChanges();
      },
    });
  }

  /** Delete a task (prevents the drag event from firing). */
  deleteTask(id: string, event: MouseEvent): void {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this task?')) return;

    this.taskService.deleteTask(id).subscribe({
      next: () => {
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete task.';
        this.cdr.detectChanges();
      },
    });
  }

  /** Handle CDK drag-and-drop between columns. */
  drop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) {
      // Reorder within the same column
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      // Move to a different column
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Determine the new status from the column id
      const task = event.container.data[event.currentIndex];
      const newStatus = event.container.id as Task['status'];

      // Optimistic update already done via transferArrayItem.
      // Now persist to the backend.
      this.taskService.updateTask(task.id, { status: newStatus }).subscribe({
        error: (err) => {
          // Revert the optimistic move on failure
          transferArrayItem(
            event.container.data,
            event.previousContainer.data,
            event.currentIndex,
            event.previousIndex
          );
          this.errorMessage =
            err.error?.message || 'Failed to update task status.';
          this.cdr.detectChanges();
        },
      });
    }
  }

  /** Map category values to Tailwind badge classes. */
  categoryClass(category: Task['category']): Record<string, boolean> {
    return {
      'bg-purple-100 text-purple-700': category === 'feature',
      'bg-red-100 text-red-700': category === 'bug',
      'bg-cyan-100 text-cyan-700': category === 'improvement',
      'bg-gray-100 text-gray-700': category === 'documentation',
    };
  }

  /** Sign out and redirect to login. */
  logout(): void {
    this.authService.logout();
  }

  /** Distribute a flat task array into the Kanban columns. */
  private distributeToColumns(tasks: Task[]): void {
    for (const col of this.columns) {
      col.tasks = tasks.filter((t) => t.status === col.id);
    }
  }
}

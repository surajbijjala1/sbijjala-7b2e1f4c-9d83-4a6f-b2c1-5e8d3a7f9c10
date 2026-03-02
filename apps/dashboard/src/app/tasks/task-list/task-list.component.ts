import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { TaskService, Task } from '../task.service';
import { AuthService } from '../../auth/auth.service';
import {
  TaskFormComponent,
  TaskFormSubmitEvent,
} from '../task-form/task-form.component';

/** Column definition for the Kanban board. */
interface KanbanColumn {
  id: Task['status'];
  label: string;
  color: string;
  tasks: Task[];
}

/** Sort options available in the control bar. */
type SortOption = 'newest' | 'oldest' | 'title-az' | 'title-za';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, TaskFormComponent],
  template: `
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <!-- Top bar -->
      <header
        class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10"
      >
        <div
          class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4
                 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div class="min-w-0">
            <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">Task Board</h1>
            <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              <span *ngIf="canEdit">Drag tasks between columns to update their status</span>
              <span *ngIf="!canEdit">You have read-only access</span>
            </p>
          </div>

          <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
            <!-- Dark mode toggle -->
            <button
              (click)="toggleDarkMode()"
              title="Toggle dark mode"
              class="p-2 rounded-md text-gray-500 dark:text-gray-400
                     hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <!-- Sun icon (visible in dark mode) -->
              <svg
                *ngIf="isDarkMode"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386
                     6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591
                     1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75
                     3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                />
              </svg>
              <!-- Moon icon (visible in light mode) -->
              <svg
                *ngIf="!isDarkMode"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385
                     0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753
                     9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75
                     21a9.753 9.753 0 0 0 9.002-5.998Z"
                />
              </svg>
            </button>

            <!-- Role badge -->
            <span
              class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              [ngClass]="{
                'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300': userRole === 'owner',
                'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300': userRole === 'admin',
                'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300': userRole === 'viewer'
              }"
            >
              {{ userRole | uppercase }}
            </span>

            <button
              *ngIf="canEdit"
              (click)="openCreateModal()"
              class="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600
                     px-3 py-2 sm:px-4
                     text-sm font-semibold text-white shadow-sm
                     hover:bg-indigo-500 focus:outline-none focus:ring-2
                     focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
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
              class="inline-flex items-center justify-center gap-1.5 rounded-md bg-gray-100 dark:bg-gray-700
                     px-3 py-2
                     text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600
                     transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <!-- ── Filter / Sort control bar ── -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3
                 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <!-- Search by title -->
          <div class="relative flex-1">
            <svg
              class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500"
              fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              (ngModelChange)="applyFilters()"
              placeholder="Search by title…"
              name="searchTerm"
              class="w-full rounded-md border border-gray-300 dark:border-gray-600 pl-9 pr-3 py-2 text-sm
                     placeholder-gray-400 dark:placeholder-gray-500 shadow-sm
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <!-- Filter by category -->
          <select
            [(ngModel)]="filterCategory"
            (ngModelChange)="applyFilters()"
            name="filterCategory"
            class="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                   focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            <option value="feature">Feature</option>
            <option value="bug">Bug</option>
            <option value="improvement">Improvement</option>
            <option value="documentation">Documentation</option>
          </select>

          <!-- Sort by -->
          <select
            [(ngModel)]="sortOption"
            (ngModelChange)="applyFilters()"
            name="sortOption"
            class="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm shadow-sm
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                   focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title-az">Title A → Z</option>
            <option value="title-za">Title Z → A</option>
          </select>
        </div>
      </div>

      <!-- Error banner -->
      <div
        *ngIf="errorMessage"
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4"
      >
        <div
          class="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 flex items-center justify-between"
        >
          <p class="text-sm text-red-700 dark:text-red-400">{{ errorMessage }}</p>
          <button
            (click)="errorMessage = ''"
            class="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Kanban columns -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div
          class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
          *ngIf="!isLoading; else loadingTpl"
        >
          <div
            *ngFor="let col of columns"
            class="flex flex-col bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <!-- Column header -->
            <div
              class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"
              [ngClass]="{
                'bg-blue-50 dark:bg-blue-900/30': col.id === 'open',
                'bg-yellow-50 dark:bg-yellow-900/30': col.id === 'in_progress',
                'bg-green-50 dark:bg-green-900/30': col.id === 'done'
              }"
            >
              <h2
                class="text-sm font-bold uppercase tracking-wide"
                [ngClass]="{
                  'text-blue-700 dark:text-blue-400': col.id === 'open',
                  'text-yellow-700 dark:text-yellow-400': col.id === 'in_progress',
                  'text-green-700 dark:text-green-400': col.id === 'done'
                }"
              >
                {{ col.label }}
              </h2>
              <span
                class="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold"
                [ngClass]="{
                  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300': col.id === 'open',
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300': col.id === 'in_progress',
                  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300': col.id === 'done'
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
              class="flex-1 p-3 min-h-[120px] md:min-h-[200px] space-y-3"
            >
              <!-- Task card -->
              <div
                *ngFor="let task of col.tasks"
                cdkDrag
                [cdkDragDisabled]="!canEdit"
                class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
                       p-3 transition-shadow"
                [ngClass]="canEdit ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-default'"
              >
                <!-- Card header row -->
                <div class="flex items-start justify-between gap-2">
                  <h3
                    class="text-sm font-semibold text-gray-900 dark:text-white leading-snug"
                  >
                    {{ task.title }}
                  </h3>

                  <!-- Action buttons (Owner/Admin) -->
                  <div *ngIf="canEdit" class="flex items-center gap-1.5 sm:gap-1 flex-shrink-0">
                    <!-- Edit button -->
                    <button
                      (click)="openEditModal(task, $event)"
                      title="Edit task"
                      class="p-1.5 sm:p-1 rounded text-gray-400 dark:text-gray-500
                             hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                    >
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                           stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652
                             2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6
                             18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="M19.5 7.125 16.862 4.487" />
                      </svg>
                    </button>

                    <!-- Delete button -->
                    <button
                      (click)="deleteTask(task.id, $event)"
                      title="Delete task"
                      class="p-1.5 sm:p-1 rounded text-gray-400 dark:text-gray-500
                             hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
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
                </div>

                <!-- Description (if present) -->
                <p
                  *ngIf="task.description"
                  class="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2"
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
                class="text-center py-8 text-sm text-gray-400 dark:text-gray-500"
              >
                No tasks
              </div>
            </div>
          </div>
        </div>

        <!-- Loading state -->
        <ng-template #loadingTpl>
          <div class="flex items-center justify-center py-20">
            <p class="text-gray-500 dark:text-gray-400">Loading tasks…</p>
          </div>
        </ng-template>
      </main>
    </div>

    <!-- Task Form Modal -->
    <app-task-form
      *ngIf="showFormModal"
      [task]="editingTask"
      (formSubmit)="onFormSubmit($event)"
      (formCancel)="closeFormModal()"
    ></app-task-form>
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

  // ── Filter & Sort state ──────────────────────────────
  searchTerm = '';
  filterCategory = '';
  sortOption: SortOption = 'newest';

  // ── Task Form modal state ────────────────────────────
  showFormModal = false;
  editingTask: Task | null = null;

  // ── Dark mode state ──────────────────────────────────
  isDarkMode = false;

  /** The full unfiltered task list from the service. */
  private allTasks: Task[] = [];

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

  // ── Keyboard shortcuts ───────────────────────────────

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    // Shift+N → Open "Add Task" modal (only for users with edit rights)
    if (event.shiftKey && event.key === 'N') {
      // Don't trigger when typing in an input/textarea/select
      const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (this.canEdit && !this.showFormModal) {
        event.preventDefault();
        this.openCreateModal();
      }
    }

    // Escape → Close modal
    if (event.key === 'Escape' && this.showFormModal) {
      this.closeFormModal();
      this.cdr.detectChanges();
    }
  }

  ngOnInit(): void {
    // Restore dark mode preference from localStorage
    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    this.applyDarkModeClass();

    this.userRole = this.authService.getUserRole();
    this.canDelete = this.userRole === 'owner' || this.userRole === 'admin';
    this.canEdit = this.userRole === 'owner' || this.userRole === 'admin';

    this.taskService.tasks$.subscribe((tasks) => {
      this.allTasks = tasks;
      this.applyFilters();
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

  // ── Modal helpers ────────────────────────────────────

  /** Open the modal in "create" mode. */
  openCreateModal(): void {
    this.editingTask = null;
    this.showFormModal = true;
    this.cdr.detectChanges();
  }

  /** Open the modal in "edit" mode pre-filled with an existing task. */
  openEditModal(task: Task, event: MouseEvent): void {
    event.stopPropagation();
    this.editingTask = task;
    this.showFormModal = true;
    this.cdr.detectChanges();
  }

  /** Close the task form modal. */
  closeFormModal(): void {
    this.showFormModal = false;
    this.editingTask = null;
  }

  /** Handle the formSubmit event from the TaskFormComponent. */
  onFormSubmit(event: TaskFormSubmitEvent): void {
    if (event.task && event.updateDto) {
      // Edit mode
      this.taskService.updateTask(event.task.id, event.updateDto).subscribe({
        next: () => {
          this.closeFormModal();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to update task.';
          this.cdr.detectChanges();
        },
      });
    } else if (event.createDto) {
      // Create mode
      this.taskService.createTask(event.createDto).subscribe({
        next: () => {
          this.closeFormModal();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create task.';
          this.cdr.detectChanges();
        },
      });
    }
  }

  // ── Filter & Sort logic ──────────────────────────────

  /** Apply search, category filter, and sort; redistribute into columns. */
  applyFilters(): void {
    let filtered = [...this.allTasks];

    // 1. Search by title (case-insensitive)
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(term)
      );
    }

    // 2. Filter by category
    if (this.filterCategory) {
      filtered = filtered.filter((t) => t.category === this.filterCategory);
    }

    // 3. Sort
    filtered = this.sortTasks(filtered, this.sortOption);

    this.distributeToColumns(filtered);
    this.cdr.detectChanges();
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
      'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300': category === 'feature',
      'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300': category === 'bug',
      'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300': category === 'improvement',
      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300': category === 'documentation',
    };
  }

  /** Toggle dark mode on/off, persisting preference to localStorage. */
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', String(this.isDarkMode));
    this.applyDarkModeClass();
  }

  /** Sign out and redirect to login. */
  logout(): void {
    this.authService.logout();
  }

  /** Apply or remove the 'dark' class on the <html> element. */
  private applyDarkModeClass(): void {
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  /** Distribute a flat task array into the Kanban columns. */
  private distributeToColumns(tasks: Task[]): void {
    for (const col of this.columns) {
      col.tasks = tasks.filter((t) => t.status === col.id);
    }
  }

  /** Sort a task array according to the selected sort option. */
  private sortTasks(tasks: Task[], option: SortOption): Task[] {
    switch (option) {
      case 'newest':
        return tasks.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'oldest':
        return tasks.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case 'title-az':
        return tasks.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
        );
      case 'title-za':
        return tasks.sort((a, b) =>
          b.title.localeCompare(a.title, undefined, { sensitivity: 'base' })
        );
      default:
        return tasks;
    }
  }
}

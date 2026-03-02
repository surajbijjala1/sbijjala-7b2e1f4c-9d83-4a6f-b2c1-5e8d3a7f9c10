import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Task, CreateTaskDto, UpdateTaskDto } from '../task.service';

/**
 * Payload emitted when the user submits the task form.
 * - If `task` is present it's an edit, otherwise it's a create.
 */
export interface TaskFormSubmitEvent {
  /** Set when editing an existing task. */
  task?: Task;
  /** The DTO for creating a new task. */
  createDto?: CreateTaskDto;
  /** The DTO for updating an existing task. */
  updateDto?: UpdateTaskDto;
}

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- Backdrop overlay -->
    <div
      class="fixed inset-0 z-40 bg-black/50 transition-opacity"
      (click)="onCancel()"
    ></div>

    <!-- Modal dialog -->
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        class="w-full max-w-lg bg-white rounded-xl shadow-2xl ring-1 ring-gray-200 overflow-hidden"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ task ? 'Edit Task' : 'New Task' }}
          </h2>
          <p class="text-sm text-gray-500 mt-0.5">
            {{ task ? 'Update the task details below.' : 'Fill in the details to create a new task.' }}
          </p>
        </div>

        <!-- Form body -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="px-6 py-5 space-y-4">
          <!-- Title -->
          <div>
            <label for="tf-title" class="block text-sm font-medium text-gray-700 mb-1">
              Title <span class="text-red-500">*</span>
            </label>
            <input
              id="tf-title"
              formControlName="title"
              type="text"
              placeholder="Enter task title…"
              class="w-full rounded-md border px-3 py-2 text-sm shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                     transition-colors"
              [ngClass]="{
                'border-red-300 focus:ring-red-500 focus:border-red-500':
                  form.get('title')?.invalid && form.get('title')?.touched,
                'border-gray-300': !(form.get('title')?.invalid && form.get('title')?.touched)
              }"
            />
            <p
              *ngIf="form.get('title')?.invalid && form.get('title')?.touched"
              class="mt-1 text-xs text-red-600"
            >
              Title is required.
            </p>
          </div>

          <!-- Description -->
          <div>
            <label for="tf-description" class="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="tf-description"
              formControlName="description"
              rows="3"
              placeholder="Optional description…"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                     placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                     resize-y transition-colors"
            ></textarea>
          </div>

          <!-- Category & Status row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Category -->
            <div>
              <label for="tf-category" class="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="tf-category"
                formControlName="category"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       transition-colors"
              >
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="improvement">Improvement</option>
                <option value="documentation">Documentation</option>
              </select>
            </div>

            <!-- Status -->
            <div>
              <label for="tf-status" class="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="tf-status"
                formControlName="status"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       transition-colors"
              >
                <option value="open">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <!-- Footer buttons -->
          <div class="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <button
              type="button"
              (click)="onCancel()"
              class="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700
                     hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="form.invalid"
              class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                     shadow-sm hover:bg-indigo-500 disabled:opacity-50
                     disabled:cursor-not-allowed transition-colors"
            >
              {{ task ? 'Save Changes' : 'Create Task' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class TaskFormComponent implements OnChanges {
  /**
   * When provided, the form enters "edit" mode and pre-fills with the task data.
   * When null/undefined the form is in "create" mode.
   */
  @Input() task: Task | null = null;

  /** Emitted when the form is submitted with valid data. */
  @Output() formSubmit = new EventEmitter<TaskFormSubmitEvent>();

  /** Emitted when the user clicks Cancel or the backdrop. */
  @Output() formCancel = new EventEmitter<void>();

  form: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1)]],
      description: [''],
      category: ['feature'],
      status: ['open'],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && this.task) {
      this.form.patchValue({
        title: this.task.title,
        description: this.task.description ?? '',
        category: this.task.category,
        status: this.task.status,
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const { title, description, category, status } = this.form.value;
    const desc = description?.trim() || null;

    if (this.task) {
      // Edit mode
      const updateDto: UpdateTaskDto = {
        title: title.trim(),
        description: desc,
        category,
        status,
      };
      this.formSubmit.emit({ task: this.task, updateDto });
    } else {
      // Create mode
      const createDto: CreateTaskDto = {
        title: title.trim(),
        description: desc,
        status,
        category,
      };
      this.formSubmit.emit({ createDto });
    }
  }

  onCancel(): void {
    this.formCancel.emit();
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Mirrors the backend Task entity shape returned by the API.
 */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done';
  category: 'bug' | 'feature' | 'improvement' | 'documentation';
  userId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string | null;
  status?: Task['status'];
  category?: Task['category'];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  status?: Task['status'];
  category?: Task['category'];
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly apiUrl = `${environment.apiUrl}/tasks`;

  /** Internal state holding the current task list. */
  private readonly tasksSubject = new BehaviorSubject<Task[]>([]);

  /** Observable stream of the task list. Components subscribe to this. */
  readonly tasks$ = this.tasksSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  /** Fetch all tasks from the backend and update local state. */
  loadTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.apiUrl).pipe(
      tap((tasks) => this.tasksSubject.next(tasks))
    );
  }

  /** Create a new task. On success, prepend it to local state. */
  createTask(dto: CreateTaskDto): Observable<Task> {
    return this.http.post<Task>(this.apiUrl, dto).pipe(
      tap((created) => {
        const current = this.tasksSubject.getValue();
        this.tasksSubject.next([created, ...current]);
      })
    );
  }

  /** Update an existing task. On success, patch it in local state. */
  updateTask(id: string, dto: UpdateTaskDto): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/${id}`, dto).pipe(
      tap((updated) => {
        const current = this.tasksSubject.getValue();
        const idx = current.findIndex((t) => t.id === id);
        if (idx !== -1) {
          const copy = [...current];
          copy[idx] = updated;
          this.tasksSubject.next(copy);
        }
      })
    );
  }

  /** Delete a task. On success, remove it from local state. */
  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const current = this.tasksSubject.getValue();
        this.tasksSubject.next(current.filter((t) => t.id !== id));
      })
    );
  }
}

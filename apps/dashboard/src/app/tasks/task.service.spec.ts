import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TaskService, Task, CreateTaskDto, UpdateTaskDto } from './task.service';

const API_URL = 'http://localhost:3000/api/tasks';

function makeMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    description: null,
    status: 'open',
    category: 'feature',
    userId: 'user-1',
    organizationId: 'org-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TaskService', () => {
  let service: TaskService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TaskService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify(); // Ensure no outstanding requests
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── loadTasks ─────────────────────────────────────────
  describe('loadTasks()', () => {
    it('should GET /tasks and update state', () => {
      const mockTasks = [makeMockTask(), makeMockTask({ id: 'task-2', title: 'Second' })];
      let result: Task[] = [];

      service.loadTasks().subscribe((tasks) => (result = tasks));

      const req = httpTesting.expectOne(API_URL);
      expect(req.request.method).toBe('GET');
      req.flush(mockTasks);

      expect(result).toEqual(mockTasks);
    });

    it('should emit loaded tasks through tasks$ observable', () => {
      const mockTasks = [makeMockTask()];
      let emittedTasks: Task[] = [];

      service.tasks$.subscribe((tasks) => (emittedTasks = tasks));
      service.loadTasks().subscribe();

      httpTesting.expectOne(API_URL).flush(mockTasks);

      expect(emittedTasks).toEqual(mockTasks);
    });
  });

  // ── createTask ────────────────────────────────────────
  describe('createTask()', () => {
    it('should POST to /tasks and prepend to state', () => {
      const existing = makeMockTask({ id: 'existing-1' });
      // Pre-populate state
      service.loadTasks().subscribe();
      httpTesting.expectOne(API_URL).flush([existing]);

      const dto: CreateTaskDto = { title: 'New Task', status: 'open', category: 'bug' };
      const created = makeMockTask({ id: 'new-1', title: 'New Task', category: 'bug' });
      let result: Task | undefined;

      service.createTask(dto).subscribe((t) => (result = t));

      const req = httpTesting.expectOne(API_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(created);

      expect(result).toEqual(created);

      // Verify it was prepended to state
      let currentTasks: Task[] = [];
      service.tasks$.subscribe((t) => (currentTasks = t));
      expect(currentTasks[0].id).toBe('new-1');
      expect(currentTasks[1].id).toBe('existing-1');
    });
  });

  // ── updateTask ────────────────────────────────────────
  describe('updateTask()', () => {
    it('should PUT to /tasks/:id and patch local state', () => {
      const original = makeMockTask({ id: 'task-1', status: 'open' });
      service.loadTasks().subscribe();
      httpTesting.expectOne(API_URL).flush([original]);

      const dto: UpdateTaskDto = { status: 'done' };
      const updated = makeMockTask({ id: 'task-1', status: 'done' });
      let result: Task | undefined;

      service.updateTask('task-1', dto).subscribe((t) => (result = t));

      const req = httpTesting.expectOne(`${API_URL}/task-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush(updated);

      expect(result?.status).toBe('done');

      // Verify local state was patched
      let currentTasks: Task[] = [];
      service.tasks$.subscribe((t) => (currentTasks = t));
      expect(currentTasks[0].status).toBe('done');
    });
  });

  // ── deleteTask ────────────────────────────────────────
  describe('deleteTask()', () => {
    it('should DELETE /tasks/:id and remove from local state', () => {
      const task1 = makeMockTask({ id: 'task-1' });
      const task2 = makeMockTask({ id: 'task-2', title: 'Kept' });
      service.loadTasks().subscribe();
      httpTesting.expectOne(API_URL).flush([task1, task2]);

      service.deleteTask('task-1').subscribe();

      const req = httpTesting.expectOne(`${API_URL}/task-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      let currentTasks: Task[] = [];
      service.tasks$.subscribe((t) => (currentTasks = t));
      expect(currentTasks.length).toBe(1);
      expect(currentTasks[0].id).toBe('task-2');
    });
  });

  // ── initial state ─────────────────────────────────────
  it('should start with an empty tasks array', () => {
    let tasks: Task[] = [];
    service.tasks$.subscribe((t) => (tasks = t));
    expect(tasks).toEqual([]);
  });
});

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { TaskListComponent } from './task-list.component';
import { TaskService, Task } from '../task.service';
import { AuthService } from '../../auth/auth.service';

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

describe('TaskListComponent', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let taskService: TaskService;
  let authService: AuthService;

  let tasksSubject: BehaviorSubject<Task[]>;
  let mockLoadTasks: ReturnType<typeof vi.fn>;

  function setupAndDetect(
    preloadedTasks: Task[] = [],
    role = 'owner',
    loadError: unknown = null
  ): void {
    tasksSubject = new BehaviorSubject<Task[]>(preloadedTasks);
    mockLoadTasks = loadError
      ? vi.fn().mockReturnValue(throwError(() => loadError))
      : vi.fn().mockReturnValue(of(preloadedTasks));

    TestBed.configureTestingModule({
      imports: [TaskListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: TaskService,
          useValue: {
            tasks$: tasksSubject.asObservable(),
            loadTasks: mockLoadTasks,
            createTask: vi.fn().mockReturnValue(of(makeMockTask())),
            updateTask: vi.fn().mockReturnValue(of(makeMockTask())),
            deleteTask: vi.fn().mockReturnValue(of(void 0)),
          },
        },
        {
          provide: AuthService,
          useValue: {
            getUserRole: vi.fn().mockReturnValue(role),
            logout: vi.fn(),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    setupAndDetect();
    expect(component).toBeTruthy();
  });

  it('should render the board header', () => {
    setupAndDetect();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Task Board');
  });

  it('should render three Kanban columns', () => {
    setupAndDetect();
    const el = fixture.nativeElement as HTMLElement;
    const headers = el.querySelectorAll('h2');
    const labels = Array.from(headers).map((h) => h.textContent?.trim());
    expect(labels).toContain('To Do');
    expect(labels).toContain('In Progress');
    expect(labels).toContain('Done');
  });

  it('should call loadTasks on init', () => {
    setupAndDetect();
    expect(taskService.loadTasks).toHaveBeenCalled();
  });

  it('should distribute tasks into correct columns', () => {
    const tasks = [
      makeMockTask({ id: '1', status: 'open' }),
      makeMockTask({ id: '2', status: 'in_progress' }),
      makeMockTask({ id: '3', status: 'done' }),
      makeMockTask({ id: '4', status: 'open' }),
    ];
    setupAndDetect(tasks);

    expect(component.columns[0].tasks.length).toBe(2); // open
    expect(component.columns[1].tasks.length).toBe(1); // in_progress
    expect(component.columns[2].tasks.length).toBe(1); // done
  });

  it('should show the Add Task form when button is clicked', () => {
    setupAndDetect();

    const el = fixture.nativeElement as HTMLElement;
    const addBtn = el.querySelector('button') as HTMLButtonElement;
    addBtn.click();
    fixture.detectChanges();
    fixture.detectChanges();

    expect(el.querySelector('input[name="newTitle"]')).toBeTruthy();
    expect(el.querySelector('textarea[name="newDescription"]')).toBeTruthy();
  });

  it('should call createTask with description when the form is submitted', () => {
    setupAndDetect();
    component.openAddDialog();
    component.newTaskTitle = 'New Task';
    component.newTaskDescription = 'A description';
    component.newTaskCategory = 'bug';
    component.addTask();

    expect(taskService.createTask).toHaveBeenCalledWith({
      title: 'New Task',
      description: 'A description',
      status: 'open',
      category: 'bug',
    });
  });

  it('should send null description when description is empty', () => {
    setupAndDetect();
    component.openAddDialog();
    component.newTaskTitle = 'New Task';
    component.newTaskDescription = '';
    component.addTask();

    expect(taskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ description: null })
    );
  });

  it('should hide the add form after successful creation', () => {
    setupAndDetect();
    component.openAddDialog();
    expect(component.showAddForm).toBe(true);

    component.newTaskTitle = 'New Task';
    component.addTask();

    expect(component.showAddForm).toBe(false);
  });

  it('should not call createTask with empty title', () => {
    setupAndDetect();
    component.openAddDialog();
    component.newTaskTitle = '   ';
    component.addTask();

    expect(taskService.createTask).not.toHaveBeenCalled();
  });

  it('should show delete button for Owner role', () => {
    const tasks = [makeMockTask()];
    setupAndDetect(tasks, 'owner');

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('button[title="Delete task"]')).toBeTruthy();
  });

  it('should hide delete button for Viewer role', () => {
    const tasks = [makeMockTask()];
    setupAndDetect(tasks, 'viewer');

    expect(component.canDelete).toBe(false);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('button[title="Delete task"]')).toBeFalsy();
  });

  it('should call deleteTask when delete button is clicked', () => {
    const tasks = [makeMockTask({ id: 'del-1' })];
    setupAndDetect(tasks, 'owner');

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const deleteBtn = fixture.nativeElement.querySelector(
      'button[title="Delete task"]'
    ) as HTMLButtonElement;
    deleteBtn.click();

    expect(taskService.deleteTask).toHaveBeenCalledWith('del-1');
  });

  it('should not delete when confirm is cancelled', () => {
    const tasks = [makeMockTask({ id: 'del-2' })];
    setupAndDetect(tasks, 'owner');

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const deleteBtn = fixture.nativeElement.querySelector(
      'button[title="Delete task"]'
    ) as HTMLButtonElement;
    deleteBtn.click();

    expect(taskService.deleteTask).not.toHaveBeenCalled();
  });

  it('should display error message when loadTasks fails', () => {
    setupAndDetect([], 'owner', { error: { message: 'Server error' } });

    expect(component.errorMessage).toBe('Server error');
  });

  it('should call logout on AuthService when sign out is clicked', () => {
    setupAndDetect();
    component.logout();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('should set canDelete true for admin role', () => {
    setupAndDetect([], 'admin');
    expect(component.canDelete).toBe(true);
  });

  it('should render category badges with correct text', () => {
    const tasks = [
      makeMockTask({ id: '1', category: 'bug', status: 'open' }),
    ];
    setupAndDetect(tasks, 'owner');

    const el = fixture.nativeElement as HTMLElement;
    const badge = el.querySelector('.mt-2 .rounded-full');
    expect(badge?.textContent?.trim()).toBe('bug');
  });

  // ── RBAC tests ────────────────────────────────────────
  it('should hide Add Task button for Viewer role', () => {
    setupAndDetect([], 'viewer');

    expect(component.canEdit).toBe(false);
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button'));
    const addBtn = buttons.find((b) => b.textContent?.includes('Add Task'));
    expect(addBtn).toBeFalsy();
  });

  it('should show Add Task button for Owner role', () => {
    setupAndDetect([], 'owner');

    expect(component.canEdit).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button'));
    const addBtn = buttons.find((b) => b.textContent?.includes('Add Task'));
    expect(addBtn).toBeTruthy();
  });

  it('should show read-only message for Viewer', () => {
    setupAndDetect([], 'viewer');

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('read-only access');
  });

  it('should display the user role badge', () => {
    setupAndDetect([], 'admin');

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('ADMIN');
  });
});

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

  // ── Core rendering ───────────────────────────────────
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

  it('should display error message when loadTasks fails', () => {
    setupAndDetect([], 'owner', { error: { message: 'Server error' } });
    expect(component.errorMessage).toBe('Server error');
  });

  it('should call logout on AuthService when sign out is clicked', () => {
    setupAndDetect();
    component.logout();
    expect(authService.logout).toHaveBeenCalled();
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

  // ── RBAC tests ───────────────────────────────────────
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

  it('should set canDelete true for admin role', () => {
    setupAndDetect([], 'admin');
    expect(component.canDelete).toBe(true);
  });

  it('should hide edit and delete buttons for Viewer role', () => {
    const tasks = [makeMockTask()];
    setupAndDetect(tasks, 'viewer');

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('button[title="Edit task"]')).toBeFalsy();
    expect(el.querySelector('button[title="Delete task"]')).toBeFalsy();
  });

  it('should show edit and delete buttons for Owner role', () => {
    const tasks = [makeMockTask()];
    setupAndDetect(tasks, 'owner');

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('button[title="Edit task"]')).toBeTruthy();
    expect(el.querySelector('button[title="Delete task"]')).toBeTruthy();
  });

  // ── Delete ───────────────────────────────────────────
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

  // ── Task Form Modal ──────────────────────────────────
  describe('Task Form Modal', () => {
    it('should not show the modal by default', () => {
      setupAndDetect();
      expect(component.showFormModal).toBe(false);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-task-form')).toBeFalsy();
    });

    it('should open create modal when openCreateModal is called', () => {
      setupAndDetect();
      component.openCreateModal();
      fixture.detectChanges();
      fixture.detectChanges();

      expect(component.showFormModal).toBe(true);
      expect(component.editingTask).toBeNull();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-task-form')).toBeTruthy();
    });

    it('should open edit modal with the task pre-filled', () => {
      const task = makeMockTask({ id: 'edit-1', title: 'Edit Me' });
      setupAndDetect([task]);

      const event = new MouseEvent('click');
      vi.spyOn(event, 'stopPropagation');
      component.openEditModal(task, event);
      fixture.detectChanges();
      fixture.detectChanges();

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.showFormModal).toBe(true);
      expect(component.editingTask).toBe(task);
    });

    it('should close the modal on closeFormModal()', () => {
      setupAndDetect();
      component.showFormModal = true;
      component.editingTask = makeMockTask();

      component.closeFormModal();

      expect(component.showFormModal).toBe(false);
      expect(component.editingTask).toBeNull();
    });

    it('should call createTask when formSubmit emits a createDto', () => {
      setupAndDetect();
      const createDto = {
        title: 'New',
        description: null,
        status: 'open' as const,
        category: 'feature' as const,
      };

      component.onFormSubmit({ createDto });

      expect(taskService.createTask).toHaveBeenCalledWith(createDto);
    });

    it('should call updateTask when formSubmit emits an updateDto', () => {
      setupAndDetect();
      const task = makeMockTask({ id: 'u-1' });
      const updateDto = { title: 'Updated' };

      component.onFormSubmit({ task, updateDto });

      expect(taskService.updateTask).toHaveBeenCalledWith('u-1', updateDto);
    });

    it('should close modal after successful create', () => {
      setupAndDetect();
      component.showFormModal = true;

      component.onFormSubmit({
        createDto: { title: 'T', status: 'open', category: 'bug' },
      });

      expect(component.showFormModal).toBe(false);
    });

    it('should close modal after successful update', () => {
      setupAndDetect();
      component.showFormModal = true;
      const task = makeMockTask();

      component.onFormSubmit({ task, updateDto: { title: 'X' } });

      expect(component.showFormModal).toBe(false);
    });
  });

  // ── Filter & Sort control bar ────────────────────────
  describe('Filter & Sort', () => {
    it('should render the search input', () => {
      setupAndDetect();
      const el = fixture.nativeElement as HTMLElement;
      const input = el.querySelector(
        'input[name="searchTerm"]'
      ) as HTMLInputElement;
      expect(input).toBeTruthy();
    });

    it('should render the category filter dropdown', () => {
      setupAndDetect();
      const el = fixture.nativeElement as HTMLElement;
      const select = el.querySelector(
        'select[name="filterCategory"]'
      ) as HTMLSelectElement;
      expect(select).toBeTruthy();
      // "All Categories" + 4 category options = 5
      expect(select.options.length).toBe(5);
    });

    it('should render the sort dropdown', () => {
      setupAndDetect();
      const el = fixture.nativeElement as HTMLElement;
      const select = el.querySelector(
        'select[name="sortOption"]'
      ) as HTMLSelectElement;
      expect(select).toBeTruthy();
      expect(select.options.length).toBe(4);
    });

    it('should filter tasks by search term (case-insensitive)', () => {
      const tasks = [
        makeMockTask({ id: '1', title: 'Alpha Task', status: 'open' }),
        makeMockTask({ id: '2', title: 'Beta Item', status: 'open' }),
        makeMockTask({ id: '3', title: 'alpha again', status: 'open' }),
      ];
      setupAndDetect(tasks);

      component.searchTerm = 'alpha';
      component.applyFilters();
      fixture.detectChanges();
      fixture.detectChanges();

      const openTasks = component.columns[0].tasks;
      expect(openTasks.length).toBe(2);
      expect(openTasks.map((t) => t.id)).toContain('1');
      expect(openTasks.map((t) => t.id)).toContain('3');
    });

    it('should filter tasks by category', () => {
      const tasks = [
        makeMockTask({ id: '1', category: 'bug', status: 'open' }),
        makeMockTask({ id: '2', category: 'feature', status: 'open' }),
        makeMockTask({ id: '3', category: 'bug', status: 'in_progress' }),
      ];
      setupAndDetect(tasks);

      component.filterCategory = 'bug';
      component.applyFilters();
      fixture.detectChanges();
      fixture.detectChanges();

      const totalVisible =
        component.columns[0].tasks.length +
        component.columns[1].tasks.length +
        component.columns[2].tasks.length;
      expect(totalVisible).toBe(2);
    });

    it('should show all tasks when category filter is empty', () => {
      const tasks = [
        makeMockTask({ id: '1', category: 'bug', status: 'open' }),
        makeMockTask({ id: '2', category: 'feature', status: 'open' }),
      ];
      setupAndDetect(tasks);

      component.filterCategory = '';
      component.applyFilters();
      fixture.detectChanges();

      expect(component.columns[0].tasks.length).toBe(2);
    });

    it('should sort tasks by title A-Z within columns', () => {
      const tasks = [
        makeMockTask({ id: '1', title: 'Charlie', status: 'open' }),
        makeMockTask({ id: '2', title: 'Alpha', status: 'open' }),
        makeMockTask({ id: '3', title: 'Bravo', status: 'open' }),
      ];
      setupAndDetect(tasks);

      component.sortOption = 'title-az';
      component.applyFilters();
      fixture.detectChanges();
      fixture.detectChanges();

      const titles = component.columns[0].tasks.map((t) => t.title);
      expect(titles).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('should sort tasks by title Z-A', () => {
      const tasks = [
        makeMockTask({ id: '1', title: 'Alpha', status: 'open' }),
        makeMockTask({ id: '2', title: 'Charlie', status: 'open' }),
        makeMockTask({ id: '3', title: 'Bravo', status: 'open' }),
      ];
      setupAndDetect(tasks);

      component.sortOption = 'title-za';
      component.applyFilters();
      fixture.detectChanges();
      fixture.detectChanges();

      const titles = component.columns[0].tasks.map((t) => t.title);
      expect(titles).toEqual(['Charlie', 'Bravo', 'Alpha']);
    });

    it('should sort tasks newest first', () => {
      const tasks = [
        makeMockTask({ id: '1', title: 'Old', status: 'open', createdAt: '2026-01-01T00:00:00.000Z' }),
        makeMockTask({ id: '2', title: 'New', status: 'open', createdAt: '2026-06-01T00:00:00.000Z' }),
      ];
      setupAndDetect(tasks);

      component.sortOption = 'newest';
      component.applyFilters();
      fixture.detectChanges();
      fixture.detectChanges();

      expect(component.columns[0].tasks[0].title).toBe('New');
      expect(component.columns[0].tasks[1].title).toBe('Old');
    });

    it('should sort tasks oldest first', () => {
      const tasks = [
        makeMockTask({ id: '1', title: 'New', status: 'open', createdAt: '2026-06-01T00:00:00.000Z' }),
        makeMockTask({ id: '2', title: 'Old', status: 'open', createdAt: '2026-01-01T00:00:00.000Z' }),
      ];
      setupAndDetect(tasks);

      component.sortOption = 'oldest';
      component.applyFilters();
      fixture.detectChanges();
      fixture.detectChanges();

      expect(component.columns[0].tasks[0].title).toBe('Old');
      expect(component.columns[0].tasks[1].title).toBe('New');
    });

    it('should combine search and category filter', () => {
      const tasks = [
        makeMockTask({ id: '1', title: 'Fix login bug', category: 'bug', status: 'open' }),
        makeMockTask({ id: '2', title: 'Fix signup', category: 'feature', status: 'open' }),
        makeMockTask({ id: '3', title: 'Fix crash bug', category: 'bug', status: 'open' }),
      ];
      setupAndDetect(tasks);

      component.searchTerm = 'fix';
      component.filterCategory = 'bug';
      component.applyFilters();
      fixture.detectChanges();
      fixture.detectChanges();

      expect(component.columns[0].tasks.length).toBe(2);
      expect(component.columns[0].tasks.map((t) => t.id)).toContain('1');
      expect(component.columns[0].tasks.map((t) => t.id)).toContain('3');
    });
  });
});

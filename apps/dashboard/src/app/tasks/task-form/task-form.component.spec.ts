import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { TaskFormComponent, TaskFormSubmitEvent } from './task-form.component';
import { Task } from '../task.service';

function makeMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Existing Task',
    description: 'A description',
    status: 'in_progress',
    category: 'bug',
    userId: 'user-1',
    organizationId: 'org-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TaskFormComponent', () => {
  let component: TaskFormComponent;
  let fixture: ComponentFixture<TaskFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskFormComponent, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Create mode ─────────────────────────────────────────
  describe('Create mode (no task input)', () => {
    it('should show "New Task" heading', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('h2')?.textContent).toContain('New Task');
    });

    it('should show "Create Task" button text', () => {
      const el = fixture.nativeElement as HTMLElement;
      const buttons = Array.from(el.querySelectorAll('button[type="submit"]'));
      const submitBtn = buttons[0];
      expect(submitBtn?.textContent?.trim()).toContain('Create Task');
    });

    it('should have an empty form by default', () => {
      expect(component.form.get('title')?.value).toBe('');
      expect(component.form.get('description')?.value).toBe('');
      expect(component.form.get('category')?.value).toBe('feature');
      expect(component.form.get('status')?.value).toBe('open');
    });

    it('should mark form invalid when title is empty', () => {
      expect(component.form.valid).toBe(false);
    });

    it('should mark form valid when title is provided', () => {
      component.form.patchValue({ title: 'My Task' });
      expect(component.form.valid).toBe(true);
    });

    it('should emit createDto on submit', () => {
      const spy = vi.fn();
      component.formSubmit.subscribe(spy);

      component.form.patchValue({
        title: 'New Task',
        description: 'Desc',
        category: 'bug',
        status: 'in_progress',
      });
      component.onSubmit();

      expect(spy).toHaveBeenCalledWith({
        createDto: {
          title: 'New Task',
          description: 'Desc',
          status: 'in_progress',
          category: 'bug',
        },
      });
    });

    it('should emit null description when description is empty', () => {
      const spy = vi.fn();
      component.formSubmit.subscribe(spy);

      component.form.patchValue({ title: 'Task', description: '' });
      component.onSubmit();

      const event = spy.mock.calls[0][0] as TaskFormSubmitEvent;
      expect(event.createDto?.description).toBeNull();
    });

    it('should NOT emit if form is invalid', () => {
      const spy = vi.fn();
      component.formSubmit.subscribe(spy);

      component.onSubmit(); // title is empty
      expect(spy).not.toHaveBeenCalled();
    });

    it('should show validation error when title is touched and empty', () => {
      component.form.get('title')?.markAsTouched();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Title is required');
    });
  });

  // ── Edit mode ───────────────────────────────────────────
  describe('Edit mode (task input provided)', () => {
    const mockTask = makeMockTask();

    beforeEach(() => {
      component.task = mockTask;
      component.ngOnChanges({
        task: {
          currentValue: mockTask,
          previousValue: null,
          firstChange: true,
          isFirstChange: () => true,
        },
      });
      fixture.detectChanges();
    });

    it('should show "Edit Task" heading', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('h2')?.textContent).toContain('Edit Task');
    });

    it('should show "Save Changes" button text', () => {
      const el = fixture.nativeElement as HTMLElement;
      const submitBtn = el.querySelector('button[type="submit"]');
      expect(submitBtn?.textContent?.trim()).toContain('Save Changes');
    });

    it('should pre-fill form with task data', () => {
      expect(component.form.get('title')?.value).toBe('Existing Task');
      expect(component.form.get('description')?.value).toBe('A description');
      expect(component.form.get('category')?.value).toBe('bug');
      expect(component.form.get('status')?.value).toBe('in_progress');
    });

    it('should emit updateDto on submit', () => {
      const spy = vi.fn();
      component.formSubmit.subscribe(spy);

      component.form.patchValue({ title: 'Updated Title' });
      component.onSubmit();

      const event = spy.mock.calls[0][0] as TaskFormSubmitEvent;
      expect(event.task).toBe(mockTask);
      expect(event.updateDto).toBeDefined();
      expect(event.updateDto?.title).toBe('Updated Title');
    });

    it('should handle null description in task input', () => {
      const taskNoDesc = makeMockTask({ description: null });
      component.task = taskNoDesc;
      component.ngOnChanges({
        task: {
          currentValue: taskNoDesc,
          previousValue: null,
          firstChange: true,
          isFirstChange: () => true,
        },
      });

      expect(component.form.get('description')?.value).toBe('');
    });
  });

  // ── Cancel ──────────────────────────────────────────────
  describe('Cancel', () => {
    it('should emit formCancel when Cancel button is clicked', () => {
      const spy = vi.fn();
      component.formCancel.subscribe(spy);

      component.onCancel();
      expect(spy).toHaveBeenCalled();
    });

    it('should emit formCancel when backdrop is clicked', () => {
      const spy = vi.fn();
      component.formCancel.subscribe(spy);

      const el = fixture.nativeElement as HTMLElement;
      const backdrop = el.querySelector('.fixed.inset-0.z-40') as HTMLElement;
      backdrop.click();

      expect(spy).toHaveBeenCalled();
    });
  });

  // ── Form fields ─────────────────────────────────────────
  describe('Form field rendering', () => {
    it('should render title input', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('#tf-title')).toBeTruthy();
    });

    it('should render description textarea', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('#tf-description')).toBeTruthy();
    });

    it('should render category dropdown with 4 options', () => {
      const el = fixture.nativeElement as HTMLElement;
      const select = el.querySelector('#tf-category') as HTMLSelectElement;
      expect(select).toBeTruthy();
      expect(select.options.length).toBe(4);
    });

    it('should render status dropdown with 3 options', () => {
      const el = fixture.nativeElement as HTMLElement;
      const select = el.querySelector('#tf-status') as HTMLSelectElement;
      expect(select).toBeTruthy();
      expect(select.options.length).toBe(3);
    });
  });
});

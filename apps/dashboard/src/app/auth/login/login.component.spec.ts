import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the login form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('input[name="email"]')).toBeTruthy();
    expect(compiled.querySelector('input[name="password"]')).toBeTruthy();
    expect(compiled.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it('should render the heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Task Manager');
  });

  it('should call AuthService.login on form submit', () => {
    const loginSpy = vi
      .spyOn(authService, 'login')
      .mockReturnValue(of({ access_token: 'token' }));
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.email = 'test@example.com';
    component.password = 'password';
    component.onSubmit();

    expect(loginSpy).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('should navigate to /tasks on successful login', () => {
    vi.spyOn(authService, 'login').mockReturnValue(
      of({ access_token: 'token' })
    );
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.email = 'test@example.com';
    component.password = 'password';
    component.onSubmit();

    expect(navSpy).toHaveBeenCalledWith(['/tasks']);
  });

  it('should display error message on login failure', () => {
    vi.spyOn(authService, 'login').mockReturnValue(
      throwError(() => ({
        error: { message: 'Invalid credentials' },
      }))
    );

    component.email = 'test@example.com';
    component.password = 'wrong';
    component.onSubmit();

    expect(component.errorMessage).toBe('Invalid credentials');
    expect(component.isLoading).toBe(false);
  });

  it('should set isLoading to true during login and reset after completion', () => {
    let isLoadingDuringRequest = false;
    vi.spyOn(authService, 'login').mockImplementation(() => {
      // Capture isLoading while the login call is being made
      isLoadingDuringRequest = component.isLoading;
      return of({ access_token: 'token' });
    });
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onSubmit();

    // isLoading was true when login() was called
    expect(isLoadingDuringRequest).toBe(true);
    // After the observable completes, finalize resets it
    expect(component.isLoading).toBe(false);
  });

  it('should use a fallback error message when server error has no message', () => {
    vi.spyOn(authService, 'login').mockReturnValue(
      throwError(() => ({ error: {} }))
    );

    component.email = 'test@example.com';
    component.password = 'wrong';
    component.onSubmit();

    expect(component.errorMessage).toBe(
      'Login failed. Please check your credentials.'
    );
  });
});

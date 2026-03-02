import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── login ──────────────────────────────────────────────

  describe('login', () => {
    it('should POST credentials and store the returned JWT', () => {
      const mockResponse = { access_token: 'mock-jwt-token' };

      service.login('test@example.com', 'password123').subscribe((res) => {
        expect(res.access_token).toBe('mock-jwt-token');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'test@example.com',
        password: 'password123',
      });

      req.flush(mockResponse);

      expect(localStorage.getItem('auth_token')).toBe('mock-jwt-token');
    });

    it('should update isAuthenticated$ to true on successful login', () => {
      const states: boolean[] = [];
      service.isAuthenticated$.subscribe((v) => states.push(v));

      service.login('test@example.com', 'pass').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ access_token: 'token' });

      expect(states).toContain(true);
    });
  });

  // ── getToken / logout ──────────────────────────────────

  describe('getToken', () => {
    it('should return null when no token is stored', () => {
      expect(service.getToken()).toBeNull();
    });

    it('should return the stored token', () => {
      localStorage.setItem('auth_token', 'stored-token');
      expect(service.getToken()).toBe('stored-token');
    });
  });

  describe('logout', () => {
    it('should clear the token and navigate to /login', () => {
      const navSpy = vi.spyOn(router, 'navigate');
      localStorage.setItem('auth_token', 'some-token');

      service.logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(navSpy).toHaveBeenCalledWith(['/login']);
    });

    it('should update isAuthenticated$ to false', () => {
      localStorage.setItem('auth_token', 'some-token');
      const states: boolean[] = [];
      service.isAuthenticated$.subscribe((v) => states.push(v));

      service.logout();

      expect(states[states.length - 1]).toBe(false);
    });
  });

  // ── isLoggedIn / getDecodedToken ───────────────────────

  describe('isLoggedIn', () => {
    it('should return false when no token exists', () => {
      expect(service.isLoggedIn()).toBe(false);
    });

    it('should return true for a non-expired token', () => {
      // Create a JWT with exp in the future (1 hour from now)
      const payload = {
        sub: 'user-1',
        role: 'owner',
        organizationId: 'org-1',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const fakeToken = `header.${btoa(JSON.stringify(payload))}.signature`;
      localStorage.setItem('auth_token', fakeToken);

      expect(service.isLoggedIn()).toBe(true);
    });

    it('should return false for an expired token', () => {
      const payload = {
        sub: 'user-1',
        role: 'owner',
        organizationId: 'org-1',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600,
      };
      const fakeToken = `header.${btoa(JSON.stringify(payload))}.signature`;
      localStorage.setItem('auth_token', fakeToken);

      expect(service.isLoggedIn()).toBe(false);
    });
  });

  describe('getDecodedToken', () => {
    it('should return null when no token exists', () => {
      expect(service.getDecodedToken()).toBeNull();
    });

    it('should decode a valid JWT payload', () => {
      const payload = {
        sub: 'user-1',
        role: 'admin',
        organizationId: 'org-1',
        iat: 1000,
        exp: 9999999999,
      };
      const fakeToken = `header.${btoa(JSON.stringify(payload))}.signature`;
      localStorage.setItem('auth_token', fakeToken);

      const decoded = service.getDecodedToken();
      expect(decoded).toEqual(payload);
    });
  });
});

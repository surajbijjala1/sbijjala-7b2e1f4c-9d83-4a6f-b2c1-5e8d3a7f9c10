import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  access_token: string;
}

export interface JwtPayload {
  sub: string;
  role: string;
  organizationId: string;
  iat: number;
  exp: number;
}

const TOKEN_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(
    this.hasToken()
  );

  /** Observable stream that emits the current authentication state. */
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  /**
   * Sends login credentials to the API and stores the returned JWT.
   */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          this.setToken(response.access_token);
          this.isAuthenticatedSubject.next(true);
        })
      );
  }

  /**
   * Clears the stored JWT and navigates to the login page.
   */
  logout(): void {
    this.clearToken();
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  /**
   * Returns the stored JWT, or null if not present.
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Decodes the JWT payload without verification (client-side only).
   */
  getDecodedToken(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  /**
   * Returns true if a non-expired JWT is stored.
   */
  isLoggedIn(): boolean {
    const decoded = this.getDecodedToken();
    if (!decoded) return false;
    return decoded.exp * 1000 > Date.now();
  }

  /**
   * Returns the current user's role from the JWT, or null if not logged in.
   */
  getUserRole(): string | null {
    return this.getDecodedToken()?.role ?? null;
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  private clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
}

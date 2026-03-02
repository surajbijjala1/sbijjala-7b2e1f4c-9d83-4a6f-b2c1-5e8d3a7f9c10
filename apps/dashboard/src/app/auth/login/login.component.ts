import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div class="w-full max-w-md">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Task Manager</h1>
          <p class="mt-2 text-sm text-gray-600">
            Sign in to manage your tasks
          </p>
        </div>

        <!-- Card -->
        <div class="bg-white rounded-lg shadow-md p-8">
          <h2 class="text-xl font-semibold text-gray-800 mb-6">Sign In</h2>

          <!-- Error message -->
          <div
            *ngIf="errorMessage"
            class="mb-4 rounded-md bg-red-50 border border-red-200 p-3"
          >
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>

          <!-- Login form -->
          <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
            <!-- Email -->
            <div class="mb-4">
              <label
                for="email"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                [(ngModel)]="email"
                [disabled]="isLoading"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                       placeholder-gray-400 shadow-sm
                       focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500
                       disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="you@example.com"
              />
            </div>

            <!-- Password -->
            <div class="mb-6">
              <label
                for="password"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                [(ngModel)]="password"
                [disabled]="isLoading"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                       placeholder-gray-400 shadow-sm
                       focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500
                       disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="••••••••"
              />
            </div>

            <!-- Submit -->
            <button
              type="submit"
              [disabled]="isLoading || !loginForm.valid"
              class="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                     shadow-sm hover:bg-indigo-500
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-150"
            >
              <span *ngIf="!isLoading">Sign in</span>
              <span *ngIf="isLoading">Signing in…</span>
            </button>
          </form>
        </div>

        <!-- Footer hint -->
        <p class="mt-4 text-center text-xs text-gray-500">
          Demo accounts: owner&#64;acme.com · admin&#64;acme.com · viewer&#64;acme.com
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  onSubmit(): void {
    this.errorMessage = '';
    this.isLoading = true;

    this.authService
      .login(this.email, this.password)
      .pipe(
        finalize(() => {
          // Always reset loading state — even on network/CORS errors
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/tasks']);
        },
        error: (err) => {
          this.errorMessage =
            err.error?.message ||
            err.message ||
            'Login failed. Please check your credentials.';
        },
      });
  }
}

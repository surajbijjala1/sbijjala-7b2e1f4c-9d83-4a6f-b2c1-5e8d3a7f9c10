import { Component } from '@angular/core';

@Component({
  selector: 'app-task-list',
  standalone: true,
  template: `
    <div class="min-h-screen bg-gray-100 p-6">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-2xl font-bold text-gray-900">Tasks</h1>
        <p class="mt-2 text-gray-600">Task management UI coming in Phase 7.</p>
      </div>
    </div>
  `,
})
export class TaskListComponent {}

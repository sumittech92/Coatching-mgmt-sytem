import { Injectable } from '@angular/core';
export type DemoRole = 'Super Admin' | 'Owner' | 'Teacher' | 'Student' | 'Parent';
@Injectable({ providedIn: 'root' })
export class MockAuthService {
  private selectedRole: DemoRole = this.readStoredRole();
  get role(): DemoRole { return this.selectedRole; }
  get landingPath(): string {
    if (this.selectedRole === 'Super Admin') return '/super-admin/dashboard';
    if (this.selectedRole === 'Student' || this.selectedRole === 'Parent') return '/student/dashboard';
    return '/client/dashboard';
  }
  login(role: DemoRole, remember: boolean): void {
    this.selectedRole = role;
    this.clearStoredRole();
    try {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('demo-role', role);
    } catch { /* In-memory demo login still works when browser storage is blocked. */ }
  }
  logout(): void {
    this.selectedRole = 'Owner';
    this.clearStoredRole();
  }

  private readStoredRole(): DemoRole {
    try {
      const role = localStorage.getItem('demo-role') || sessionStorage.getItem('demo-role');
      return role === 'Super Admin' || role === 'Owner' || role === 'Teacher' || role === 'Student' || role === 'Parent'
        ? role
        : 'Owner';
    } catch { return 'Owner'; }
  }

  private clearStoredRole(): void {
    try {
      localStorage.removeItem('demo-role');
      sessionStorage.removeItem('demo-role');
    } catch { /* Storage is optional for demo access. */ }
  }
}

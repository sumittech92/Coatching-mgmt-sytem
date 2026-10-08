import { Injectable } from '@angular/core';
export type DemoRole = 'Super Admin' | 'Owner' | 'Teacher' | 'Student' | 'Parent';
@Injectable({ providedIn: 'root' })
export class MockAuthService {
  private selectedRole: DemoRole = 'Owner';
  get role(): DemoRole { return this.selectedRole; }
  login(role: DemoRole, _remember: boolean): void { this.selectedRole = role; }
  logout(): void { this.selectedRole = 'Owner'; }
}

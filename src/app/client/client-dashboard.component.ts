import { Component } from '@angular/core';
import { TenantContextService } from '../core/tenant-context.service';
import { MockAuthService } from '../core/mock-auth.service';
@Component({ selector: 'app-client-dashboard', templateUrl: './client-dashboard.component.html', styleUrls: ['./client-dashboard.component.scss', './dashboard-typography.component.scss', './teacher-dashboard.component.scss'] })
export class ClientDashboardComponent {
  constructor(private tenant: TenantContextService, private auth: MockAuthService) {}
  get isCollege(): boolean { return this.tenant.current.businessType === 'college'; }
  get isTeacher(): boolean { return this.auth.role === 'Teacher'; }
  readonly admissions = [{ name: 'Aarav Sharma', course: 'Class 12 Science', time: '10:42 am', initials: 'AS' }, { name: 'Meera Kapoor', course: 'Class 11 Science', time: '9:18 am', initials: 'MK' }, { name: 'Diya Iyer', course: 'Class 10 Foundation', time: 'Yesterday', initials: 'DI' }];
  readonly pending = [{ name: 'Rohan Verma', detail: 'September fee · NS-2403', amount: '₹4,500' }, { name: 'Kabir Singh', detail: 'September fee · NS-2405', amount: '₹3,500' }, { name: 'Meera Kapoor', detail: 'September fee · NS-2402', amount: '₹4,000' }];
  readonly attendance = [{ name: 'Class 12 · Physics', present: 34, total: 36, tone: 'teal' }, { name: 'Class 11 · Chemistry', present: 28, total: 32, tone: 'violet' }, { name: 'Class 10 · Foundation', present: 24, total: 25, tone: 'amber' }];
}

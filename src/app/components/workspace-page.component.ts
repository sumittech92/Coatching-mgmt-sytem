import { Component } from '@angular/core';
import { TenantContextService } from '../core/tenant-context.service';
import { BusinessType } from '../core/models/business-type';

@Component({ selector: 'app-workspace-page', templateUrl: './workspace-page.component.html', styleUrls: ['./workspace-page.component.scss'] })
export class WorkspacePageComponent {
  readonly recentItems = [
    { name: 'Aarav Sharma', detail: 'Class 12 · Physics batch', date: 'Today, 10:42 am', amount: '₹2,500', status: 'Paid', tone: 'success' as const, initials: 'AS', color: 'mint' },
    { name: 'Meera Kapoor', detail: 'Class 11 · Chemistry batch', date: 'Today, 9:18 am', amount: '₹3,200', status: 'Pending', tone: 'warning' as const, initials: 'MK', color: 'peach' },
    { name: 'Rohan Verma', detail: 'Class 12 · Mathematics', date: 'Yesterday', amount: '₹2,500', status: 'Paid', tone: 'success' as const, initials: 'RV', color: 'blue' }
  ];
  constructor(public tenant: TenantContextService) {}
  switchBusiness(type: BusinessType): void { this.tenant.setBusinessType(type); }
  get heading(): string {
    if (location.pathname.startsWith('/super-admin')) return 'Platform overview';
    if (location.pathname.startsWith('/student')) return 'My learning';
    if (location.pathname.startsWith('/public')) return 'Your website is ready';
    return this.tenant.current.businessType === 'coaching' ? 'Good morning, Jordan' : 'Good morning, Jordan';
  }
  get subheading(): string {
    if (location.pathname.startsWith('/super-admin')) return 'A clear view of every business on Ageon.';
    if (location.pathname.startsWith('/student')) return 'Pick up where you left off and keep moving forward.';
    if (location.pathname.startsWith('/public')) return 'Share your business with the people who matter.';
    return 'Here’s what’s happening with your business today.';
  }
  get isPlatform(): boolean { return location.pathname.startsWith('/super-admin'); }
  get isStudent(): boolean { return location.pathname.startsWith('/student'); }
  get isPublic(): boolean { return location.pathname.startsWith('/public'); }
}

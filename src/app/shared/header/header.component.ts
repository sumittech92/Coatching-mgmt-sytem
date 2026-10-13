import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarService } from '../sidebar/sidebar.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { TenantContextService } from '../../core/tenant-context.service';

@Component({ selector: 'app-header', templateUrl: './header.component.html', styleUrls: ['./header.component.scss'] })
export class HeaderComponent {
  breadcrumbs: string[] = ['Overview'];
  constructor(public sidebarservice: SidebarService, public auth: MockAuthService, private tenant: TenantContextService, private router: Router) {
    this.updateBreadcrumbs(router.url);
    router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => this.updateBreadcrumbs(event.urlAfterRedirects));
  }
  get displayName(): string {
    if (this.auth.user?.full_Name) return this.auth.user.full_Name;
    if (this.auth.role === 'Super Admin') return 'Alex Morgan';
    if (this.auth.role === 'Student') return this.tenant.isCollege ? 'Ishita Rao' : 'Aarav Sharma';
    if (this.auth.role === 'Teacher') return this.tenant.isCollege ? 'Dr. Neha Iyer' : 'Priya Nair';
    return this.tenant.isCollege ? 'Dr. Kavita Menon' : 'Jordan Davis';
  }
  get initials(): string { return this.displayName.replace(/^Dr\.\s*/, '').split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase(); }
  /** Role shown under the name: the demo "Owner" is a Director in coaching and a Principal in college. */
  get roleLabel(): string {
    if (this.auth.role === 'Owner') return this.tenant.terms.ownerTitle;
    if (this.auth.role === 'Teacher') return this.tenant.isCollege ? 'Faculty' : 'Teacher';
    return this.auth.role;
  }
  toggleSidebar(): void { this.sidebarservice.setSidebarState(!this.sidebarservice.getSidebarState()); }
  openSearch(): void { /* Search is provided on list screens. */ }
  private updateBreadcrumbs(url: string): void {
    const parts = url.split('?')[0].split('/').filter(Boolean).filter(part => !/^\d+$/.test(part) && part !== 'edit').map(part => part.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()))
      .map(part => this.tenant.isCollege && part === 'Teachers' ? 'Faculty' : part);
    this.breadcrumbs = parts.length ? ['Workspace', ...parts.slice(-2)] : ['Overview'];
  }
}

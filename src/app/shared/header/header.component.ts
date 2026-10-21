import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarService } from '../sidebar/sidebar.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { ToastService } from '../../core/toast.service';
import { SignOutService } from '../../core/sign-out.service';

@Component({ selector: 'app-header', templateUrl: './header.component.html', styleUrls: ['./header.component.scss'] })
export class HeaderComponent {
  breadcrumbs: string[] = ['Overview'];
  constructor(public sidebarservice: SidebarService, public auth: MockAuthService, private tenant: TenantContextService, private router: Router, private toast: ToastService, private signOutFlow: SignOutService) {
    this.updateBreadcrumbs(router.url);
    router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => this.updateBreadcrumbs(event.urlAfterRedirects));
  }
  get displayName(): string {
    if (this.auth.displayName) return this.auth.displayName;
    if (this.auth.role === 'Super Admin') return 'Alex Morgan';
    if (this.auth.role === 'Student') return this.tenant.isSchool ? 'Ishita Rao' : 'Aarav Sharma';
    if (this.auth.role === 'Teacher') return this.tenant.demoTeacherName;
    return this.tenant.isSchool ? 'Mrs. Kavita Menon' : 'Jordan Davis';
  }
  get initials(): string { return this.displayName.replace(/^(Dr|Mrs|Mr|Ms)\.\s*/, '').split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase(); }
  /** Role shown under the name: the demo "Owner" is a Director in coaching and a Principal in a school. */
  get roleLabel(): string {
    if (this.auth.role === 'Owner') return this.tenant.terms.ownerTitle;
    if (this.auth.role === 'Teacher') return 'Teacher';
    return this.auth.role;
  }
  get profilePath(): string { return this.auth.role === 'Student' || this.auth.role === 'Parent' ? '/student/profile' : '/account/profile'; }
  /** Panel-level settings page, where the role has one. */
  get settingsPath(): string | null {
    if (this.auth.role === 'Super Admin') return '/super-admin/settings';
    return this.auth.role === 'Owner' ? '/client/settings' : null;
  }
  logout(): void { this.signOutFlow.signOut(); }
  toggleSidebar(): void { this.sidebarservice.setSidebarState(!this.sidebarservice.getSidebarState()); }
  openSearch(): void { /* Search is provided on list screens. */ }
  private updateBreadcrumbs(url: string): void {
    const parts = url.split('?')[0].split('/').filter(Boolean).filter(part => !/^\d+$/.test(part) && part !== 'edit').map(part => part.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()));
    this.breadcrumbs = parts.length ? ['Workspace', ...parts.slice(-2)] : ['Overview'];
  }
}

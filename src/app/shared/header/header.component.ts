import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarService } from '../sidebar/sidebar.service';
import { MockAuthService } from '../../core/mock-auth.service';

@Component({ selector: 'app-header', templateUrl: './header.component.html', styleUrls: ['./header.component.scss'] })
export class HeaderComponent {
  breadcrumbs: string[] = ['Overview'];
  constructor(public sidebarservice: SidebarService, public auth: MockAuthService, private router: Router) {
    this.updateBreadcrumbs(router.url);
    router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => this.updateBreadcrumbs(event.urlAfterRedirects));
  }
  toggleSidebar(): void { this.sidebarservice.setSidebarState(!this.sidebarservice.getSidebarState()); }
  openSearch(): void { /* Search is provided on list screens. */ }
  private updateBreadcrumbs(url: string): void {
    const parts = url.split('?')[0].split('/').filter(Boolean).filter(part => !/^\d+$/.test(part) && part !== 'edit').map(part => part.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()));
    this.breadcrumbs = parts.length ? ['Workspace', ...parts.slice(-2)] : ['Overview'];
  }
}

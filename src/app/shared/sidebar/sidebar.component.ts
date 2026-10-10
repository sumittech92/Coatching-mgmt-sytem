import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarService } from './sidebar.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { MockAuthService } from '../../core/mock-auth.service';

@Component({ selector: 'app-sidebar', templateUrl: './sidebar.component.html', styleUrls: ['./sidebar.component.scss'] })
export class SidebarComponent {
  currentPath = '';
  private readonly navigationCache = new Map<string, { label: string; icon: string; route: string; section: string }[]>();
  constructor(public sidebarservice: SidebarService, public tenant: TenantContextService, public auth: MockAuthService, private router: Router) {
    this.currentPath = router.url;
    router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => { this.currentPath = event.urlAfterRedirects; this.sidebarservice.setSidebarState(false); });
  }
  getSideBarSate(): boolean { return this.sidebarservice.getSidebarState(); }
  get navigation(): { label: string; icon: string; route: string; section: string }[] {
    if (this.currentPath.startsWith('/shop')) return this.stableNavigation('shop', [
      { label: 'Overview', icon: 'space_dashboard', route: '/shop/dashboard', section: 'HOME' }, { label: 'Products', icon: 'checkroom', route: '/shop/products', section: 'CATALOG' }, { label: 'Categories', icon: 'category', route: '/shop/categories', section: 'CATALOG' }, { label: 'Inventory', icon: 'inventory_2', route: '/shop/inventory', section: 'CATALOG' }, { label: 'Billing', icon: 'point_of_sale', route: '/shop/billing', section: 'SALES' }, { label: 'Orders', icon: 'shopping_bag', route: '/shop/orders', section: 'SALES' }, { label: 'Customers', icon: 'people', route: '/shop/customers', section: 'SALES' }, { label: 'Offers', icon: 'sell', route: '/shop/offers', section: 'MARKETING' }, { label: 'Posts', icon: 'campaign', route: '/shop/posts', section: 'MARKETING' }, { label: 'Gallery', icon: 'photo_library', route: '/shop/gallery', section: 'MARKETING' }, { label: 'Reports', icon: 'bar_chart', route: '/shop/reports', section: 'INSIGHTS' }, { label: 'Settings', icon: 'settings', route: '/shop/settings', section: 'SETTINGS' }, { label: this.auth.role === 'Super Admin' ? 'Platform panel' : 'Coaching panel', icon: this.auth.role === 'Super Admin' ? 'admin_panel_settings' : 'school', route: this.auth.role === 'Super Admin' ? '/super-admin/dashboard' : '/client/dashboard', section: 'DEMO PANELS' }
    ]);
    if (this.currentPath.startsWith('/super-admin')) return this.stableNavigation('super-admin', [
      { label: 'Dashboard', icon: 'space_dashboard', route: '/super-admin/dashboard', section: 'PLATFORM' }, { label: 'Coaching centers', icon: 'school', route: '/super-admin/clients', section: 'MANAGE' }, { label: 'Users', icon: 'manage_accounts', route: '/super-admin/users', section: 'MANAGE' }, { label: 'Subscriptions', icon: 'receipt_long', route: '/super-admin/subscriptions', section: 'MANAGE' }, { label: 'Reports', icon: 'bar_chart', route: '/super-admin/reports', section: 'INSIGHTS' }, { label: 'Settings', icon: 'settings', route: '/super-admin/settings', section: 'SYSTEM' }, { label: 'Owner panel', icon: 'school', route: '/client/dashboard', section: 'DEMO PANELS' }
    ]);
    if (this.auth.role === 'Student' || this.auth.role === 'Parent') return this.stableNavigation(this.auth.role.toLowerCase(), [
      { label: 'My learning', icon: 'space_dashboard', route: '/student/dashboard', section: 'LEARNING' }, { label: 'Public website', icon: 'language', route: '/public', section: 'DISCOVER' }
    ]);
    if (this.auth.role === 'Teacher' && this.tenant.current.businessType === 'college') return this.stableNavigation('college-teacher', [
      { label: 'Teaching dashboard', icon: 'space_dashboard', route: '/client/dashboard', section: 'CAMPUS' },
      { label: 'Student roster', icon: 'groups', route: '/client/students', section: 'TEACHING' },
      { label: 'Timetable', icon: 'calendar_month', route: '/client/timetable', section: 'TEACHING' },
      { label: 'Attendance', icon: 'event_available', route: '/client/attendance', section: 'TEACHING' },
      { label: 'Exams & results', icon: 'fact_check', route: '/client/results', section: 'TEACHING' },
      { label: 'Notices', icon: 'campaign', route: '/client/notices', section: 'CAMPUS LIFE' }
    ]);
    if (this.tenant.current.businessType === 'college') return this.stableNavigation('college-owner', [
      { label: 'Overview', icon: 'space_dashboard', route: '/client/dashboard', section: 'CAMPUS' },
      { label: 'Admissions', icon: 'person_add_alt', route: '/client/admissions', section: 'PEOPLE' },
      { label: 'Students', icon: 'groups', route: '/client/students', section: 'PEOPLE' },
      { label: 'Faculty', icon: 'school', route: '/client/teachers', section: 'PEOPLE' },
      { label: 'Departments', icon: 'account_tree', route: '/client/departments', section: 'ACADEMICS' },
      { label: 'Programs & subjects', icon: 'menu_book', route: '/client/programs', section: 'ACADEMICS' },
      { label: 'Timetable', icon: 'calendar_month', route: '/client/timetable', section: 'ACADEMICS' },
      { label: 'Attendance', icon: 'event_available', route: '/client/attendance', section: 'ACADEMICS' },
      { label: 'Exams & results', icon: 'fact_check', route: '/client/results', section: 'ACADEMICS' },
      { label: 'Fees & payments', icon: 'payments', route: '/client/fees', section: 'FINANCE' },
      { label: 'Notices & events', icon: 'campaign', route: '/client/notices', section: 'CAMPUS LIFE' },
      { label: 'Reports', icon: 'bar_chart', route: '/client/reports', section: 'INSIGHTS' },
      { label: 'College website', icon: 'language', route: '/client/website', section: 'SETTINGS' },
      { label: 'Settings', icon: 'settings', route: '/client/settings', section: 'SETTINGS' },
      { label: 'Super Admin panel', icon: 'admin_panel_settings', route: '/super-admin/dashboard', section: 'DEMO PANELS' }
    ]);
    if (this.auth.role === 'Teacher') return this.stableNavigation('teacher', [
      { label: 'Dashboard', icon: 'space_dashboard', route: '/client/dashboard', section: 'WORKSPACE' },
      { label: 'Students', icon: 'groups', route: '/client/students', section: 'PEOPLE' },
      { label: 'Courses', icon: 'menu_book', route: '/client/courses', section: 'TEACHING' },
      { label: 'Batches', icon: 'view_module', route: '/client/batches', section: 'TEACHING' },
      { label: 'Attendance', icon: 'event_available', route: '/client/attendance', section: 'TEACHING' },
      { label: 'Results', icon: 'emoji_events', route: '/client/results', section: 'TEACHING' },
      { label: 'Study materials', icon: 'folder_open', route: '/client/materials', section: 'TEACHING' },
      { label: 'Notices', icon: 'notifications_none', route: '/client/notices', section: 'UPDATES' }
    ]);
    return this.stableNavigation('owner', [
      { label: 'Dashboard', icon: 'space_dashboard', route: '/client/dashboard', section: 'WORKSPACE' }, { label: 'Students', icon: 'groups', route: '/client/students', section: 'PEOPLE' }, { label: 'Teachers', icon: 'school', route: '/client/teachers', section: 'PEOPLE' }, { label: 'Courses', icon: 'menu_book', route: '/client/courses', section: 'ACADEMICS' }, { label: 'Batches', icon: 'view_module', route: '/client/batches', section: 'ACADEMICS' }, { label: 'Attendance', icon: 'event_available', route: '/client/attendance', section: 'ACADEMICS' }, { label: 'Fees & payments', icon: 'payments', route: '/client/fees', section: 'FINANCE' }, { label: 'Admissions', icon: 'person_add_alt', route: '/client/admissions', section: 'COMMUNICATION' }, { label: 'Posts & notices', icon: 'campaign', route: '/client/posts', section: 'COMMUNICATION' }, { label: 'Website', icon: 'language', route: '/client/website', section: 'CHANNELS' }, { label: 'Settings', icon: 'settings', route: '/client/settings', section: 'WORKSPACE' }, { label: 'Super Admin panel', icon: 'admin_panel_settings', route: '/super-admin/dashboard', section: 'DEMO PANELS' }
    ]);
  }
  private stableNavigation(key: string, links: { label: string; icon: string; route: string; section: string }[]): { label: string; icon: string; route: string; section: string }[] {
    const cached = this.navigationCache.get(key);
    if (cached) return cached;
    this.navigationCache.set(key, links);
    return links;
  }

}

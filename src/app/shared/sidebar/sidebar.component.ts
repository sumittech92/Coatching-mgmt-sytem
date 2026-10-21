import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarService } from './sidebar.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { SignOutService } from '../../core/sign-out.service';

import { WebsiteContentService } from '../../core/website-content.service';
@Component({ selector: 'app-sidebar', templateUrl: './sidebar.component.html', styleUrls: ['./sidebar.component.scss'] })
export class SidebarComponent {
  currentPath = '';
  private readonly navigationCache = new Map<string, { label: string; icon: string; route: string; section: string }[]>();
  constructor(public sidebarservice: SidebarService, public tenant: TenantContextService, public auth: MockAuthService, private router: Router, private signOutFlow: SignOutService, public content: WebsiteContentService) {
    this.currentPath = router.url;
    router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => { this.currentPath = event.urlAfterRedirects; this.sidebarservice.setSidebarState(false); });
  }
  logout(): void { this.signOutFlow.signOut(); }
  /** Owner/Teacher workspaces show the logo the owner uploaded; Super Admin and the shop keep the EduNexa brand. */
  get workspaceLogo(): string | null { return this.currentPath.startsWith('/super-admin') || this.currentPath.startsWith('/shop') ? null : this.content.customLogo; }
  getSideBarSate(): boolean { return this.sidebarservice.getSidebarState(); }
  get navigation(): { label: string; icon: string; route: string; section: string }[] {
    if (this.currentPath.startsWith('/shop')) return this.stableNavigation('shop', [
      { label: 'Overview', icon: 'space_dashboard', route: '/shop/dashboard', section: 'HOME' }, { label: 'Products', icon: 'checkroom', route: '/shop/products', section: 'CATALOG' }, { label: 'Categories', icon: 'category', route: '/shop/categories', section: 'CATALOG' }, { label: 'Inventory', icon: 'inventory_2', route: '/shop/inventory', section: 'CATALOG' }, { label: 'Billing', icon: 'point_of_sale', route: '/shop/billing', section: 'SALES' }, { label: 'Orders', icon: 'shopping_bag', route: '/shop/orders', section: 'SALES' }, { label: 'Customers', icon: 'people', route: '/shop/customers', section: 'SALES' }, { label: 'Offers', icon: 'sell', route: '/shop/offers', section: 'MARKETING' }, { label: 'Posts', icon: 'campaign', route: '/shop/posts', section: 'MARKETING' }, { label: 'Gallery', icon: 'photo_library', route: '/shop/gallery', section: 'MARKETING' }, { label: 'Reports', icon: 'bar_chart', route: '/shop/reports', section: 'INSIGHTS' }, { label: 'Settings', icon: 'settings', route: '/shop/settings', section: 'SETTINGS' }, { label: this.auth.role === 'Super Admin' ? 'Platform panel' : 'Coaching panel', icon: this.auth.role === 'Super Admin' ? 'admin_panel_settings' : 'school', route: this.auth.role === 'Super Admin' ? '/super-admin/dashboard' : '/client/dashboard', section: 'DEMO PANELS' }
    ]);
    if (this.currentPath.startsWith('/super-admin') || (this.auth.role === 'Super Admin' && this.currentPath.startsWith('/account'))) return this.stableNavigation('super-admin', [
      { label: 'Dashboard', icon: 'space_dashboard', route: '/super-admin/dashboard', section: 'PLATFORM' }, { label: 'Coaching centers', icon: 'school', route: '/super-admin/clients', section: 'MANAGE' }, { label: 'Users', icon: 'manage_accounts', route: '/super-admin/users', section: 'MANAGE' }, { label: 'Subscriptions', icon: 'receipt_long', route: '/super-admin/subscriptions', section: 'MANAGE' }, { label: 'Reports', icon: 'bar_chart', route: '/super-admin/reports', section: 'INSIGHTS' }, { label: 'Settings', icon: 'settings', route: '/super-admin/settings', section: 'SYSTEM' }, { label: 'My profile', icon: 'account_circle', route: '/account/profile', section: 'SYSTEM' }, { label: 'Owner panel', icon: 'school', route: '/client/dashboard', section: 'DEMO PANELS' }
    ]);
    if (this.auth.role === 'Student' || this.auth.role === 'Parent') return this.stableNavigation(this.auth.role.toLowerCase(), [
      { label: 'My learning', icon: 'space_dashboard', route: '/student/dashboard', section: 'LEARNING' }, { label: 'Public website', icon: 'language', route: '/public', section: 'DISCOVER' }
    ]);
    const school = this.tenant.current.businessType === 'school';
    const link = (label: string, icon: string, route: string, section: string) => ({ label, icon, route, section });
    if (this.auth.role === 'Teacher' && school) return this.stableNavigation('school-teacher', [
      link('My Dashboard', 'space_dashboard', '/client/dashboard', 'CLASSROOM'), link('My Classes', 'class', '/client/my-classes', 'CLASSROOM'), link('My Subjects', 'menu_book', '/client/my-subjects', 'CLASSROOM'), link("Today's Timetable", 'today', '/client/today', 'CLASSROOM'),
      link('Students', 'groups', '/client/students', 'TEACHING'), link('Attendance', 'event_available', '/client/attendance', 'TEACHING'), link('Homework', 'edit_note', '/client/homework', 'TEACHING'), link('Assignments', 'assignment', '/client/assignments', 'TEACHING'),
      link('Exams', 'quiz', '/client/exams', 'ASSESSMENT'), link('Marks Entry', 'edit_square', '/client/marks', 'ASSESSMENT'), link('Results', 'emoji_events', '/client/results', 'ASSESSMENT'),
      link('Study Material', 'folder_open', '/client/materials', 'RESOURCES'), link('Library', 'local_library', '/client/library', 'RESOURCES'), link('Notices', 'campaign', '/client/notices', 'RESOURCES'), link('Profile', 'account_circle', '/account/profile', 'ACCOUNT')
    ]);
    if (this.auth.role === 'Teacher') return this.stableNavigation('coaching-teacher', [
      link('My Dashboard', 'space_dashboard', '/client/dashboard', 'TEACHING'), link('My Batches', 'view_module', '/client/my-batches', 'TEACHING'), link("Today's Classes", 'today', '/client/today', 'TEACHING'),
      link('Students', 'groups', '/client/students', 'STUDENTS'), link('Attendance', 'event_available', '/client/attendance', 'STUDENTS'), link('Assignments', 'assignment', '/client/assignments', 'STUDENTS'),
      link('Tests', 'quiz', '/client/tests', 'ASSESSMENT'), link('Results / Marks', 'emoji_events', '/client/results', 'ASSESSMENT'),
      link('Study Material', 'folder_open', '/client/materials', 'RESOURCES'), link('Library', 'local_library', '/client/library', 'RESOURCES'), link('Notices', 'campaign', '/client/notices', 'RESOURCES'), link('My Profile', 'account_circle', '/account/profile', 'ACCOUNT')
    ]);
    if (school) return this.stableNavigation('school-owner', [
      link('Dashboard', 'space_dashboard', '/client/dashboard', 'SCHOOL'),
      link('Academic Sessions', 'event_note', '/client/sessions', 'ACADEMICS'), link('Classes', 'class', '/client/classes', 'ACADEMICS'), link('Sections', 'view_week', '/client/sections', 'ACADEMICS'), link('Subjects', 'menu_book', '/client/subjects', 'ACADEMICS'),
      link('Students', 'groups', '/client/students', 'PEOPLE'), link('Admissions', 'person_add_alt', '/client/admissions', 'PEOPLE'), link('Teachers & Staff', 'school', '/client/teachers', 'PEOPLE'),
      link('Attendance', 'event_available', '/client/attendance', 'DAILY'), link('Fees', 'payments', '/client/fees', 'DAILY'),
      link('Exams', 'quiz', '/client/exams', 'ASSESSMENT'), link('Results', 'emoji_events', '/client/results', 'ASSESSMENT'), link('Timetable', 'calendar_month', '/client/timetable', 'ASSESSMENT'), link('Library', 'local_library', '/client/library', 'ASSESSMENT'),
      link('Notices', 'campaign', '/client/notices', 'COMMUNICATION'), link('Events', 'celebration', '/client/events', 'COMMUNICATION'), link('Gallery', 'photo_library', '/client/gallery', 'COMMUNICATION'),
      link('Reports', 'bar_chart', '/client/reports', 'SETTINGS'), link('Website', 'language', '/client/website', 'SETTINGS'), link('Settings', 'settings', '/client/settings', 'SETTINGS'), link('My profile', 'account_circle', '/account/profile', 'SETTINGS')
    ]);
    return this.stableNavigation('coaching-owner', [
      link('Dashboard', 'space_dashboard', '/client/dashboard', 'WORKSPACE'),
      link('Students', 'groups', '/client/students', 'PEOPLE'), link('Teachers', 'school', '/client/teachers', 'PEOPLE'), link('Admissions / Enquiries', 'person_add_alt', '/client/admissions', 'PEOPLE'),
      link('Courses', 'menu_book', '/client/courses', 'ACADEMICS'), link('Batches', 'view_module', '/client/batches', 'ACADEMICS'), link('Attendance', 'event_available', '/client/attendance', 'ACADEMICS'),
      link('Fees', 'payments', '/client/fees', 'FINANCE'),
      link('Tests', 'quiz', '/client/tests', 'ASSESSMENT'), link('Results', 'emoji_events', '/client/results', 'ASSESSMENT'), link('Study Materials', 'folder_open', '/client/materials', 'ASSESSMENT'), link('Library', 'local_library', '/client/library', 'ASSESSMENT'),
      link('Notices', 'campaign', '/client/notices', 'COMMUNICATION'), link('Gallery', 'photo_library', '/client/gallery', 'COMMUNICATION'),
      link('Reports', 'bar_chart', '/client/reports', 'SETTINGS'), link('Website', 'language', '/client/website', 'SETTINGS'), link('Settings', 'settings', '/client/settings', 'SETTINGS'), link('My profile', 'account_circle', '/account/profile', 'SETTINGS')
    ]);
  }
  private stableNavigation(key: string, links: { label: string; icon: string; route: string; section: string }[]): { label: string; icon: string; route: string; section: string }[] {
    const cached = this.navigationCache.get(key);
    if (cached) return cached;
    this.navigationCache.set(key, links);
    return links;
  }

}

import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarService } from '../../shared/sidebar/sidebar.service'
import { WebsiteContentService } from '../../core/website-content.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { BottomNavItem } from '../../shared/ui/bottom-nav/bottom-nav.component';
import { AuthApiService } from '../../core/auth-api.service';
import { ToastService } from '../../core/toast.service';
import { MODULES, moduleForRoute } from '../../core/module-access';

@Component({
    selector: 'app-full-layout',
    templateUrl: './full-layout.component.html',
    styleUrls: ['./full-layout.component.scss']
})

export class FullLayoutComponent implements OnInit {
    private currentPath = '';
    private readonly bottomNavCache = new Map<string, BottomNavItem[]>();

    constructor( public sidebarservice: SidebarService, private content: WebsiteContentService, private auth: MockAuthService, private router: Router, private authApi: AuthApiService, private toast: ToastService ) {
        this.currentPath = router.url;
        router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => { this.currentPath = event.urlAfterRedirects; this.leaveIfModuleOff(); });
    }

    /** Pages of a module the Super Admin turned off send the user back to the dashboard. */
    private leaveIfModuleOff(): void {
        const module = moduleForRoute(this.currentPath);
        if (this.auth.isModuleOn(module)) return;
        const label = MODULES.find(item => item.key === module)?.label || 'This module';
        this.toast.info(`${label} is not enabled for your institute. Contact EduNexa support to turn it on.`);
        this.router.navigateByUrl('/client/dashboard');
    }

      toggleSidebar() {
        this.sidebarservice.setSidebarState(!this.sidebarservice.getSidebarState());
    }

    getSideBarState() {
        return this.sidebarservice.getSidebarState();
    }

    /** Phone tab bar: four shortcuts per panel; "More" opens the full sidebar menu. */
    get bottomNav(): BottomNavItem[] {
        const key = this.currentPath.startsWith('/shop') ? 'shop'
            : this.currentPath.startsWith('/super-admin') || this.auth.role === 'Super Admin' ? 'super-admin'
            : this.auth.role === 'Teacher' ? 'teacher' : 'owner';
        const cacheKey = `${key}|${this.auth.disabledModules.join(',')}`;
        const cached = this.bottomNavCache.get(cacheKey);
        if (cached) return cached;
        const items: Record<string, BottomNavItem[]> = {
            shop: [{ label: 'Overview', icon: 'space_dashboard', route: '/shop/dashboard' }, { label: 'Products', icon: 'checkroom', route: '/shop/products' }, { label: 'Billing', icon: 'point_of_sale', route: '/shop/billing' }, { label: 'Orders', icon: 'shopping_bag', route: '/shop/orders' }],
            'super-admin': [{ label: 'Dashboard', icon: 'home', route: '/super-admin/dashboard' }, { label: 'Centers', icon: 'school', route: '/super-admin/clients' }, { label: 'Users', icon: 'group', route: '/super-admin/users' }, { label: 'Profile', icon: 'person', route: '/account/profile' }],
            teacher: [{ label: 'Dashboard', icon: 'home', route: '/client/dashboard' }, { label: 'Profile', icon: 'person', route: '/account/profile' }, { label: 'Attendance', icon: 'schedule', route: '/client/attendance' }, { label: 'Notices', icon: 'notifications', route: '/client/notices', dot: true }],
            owner: [{ label: 'Dashboard', icon: 'home', route: '/client/dashboard' }, { label: 'Students', icon: 'group', route: '/client/students' }, { label: 'Attendance', icon: 'schedule', route: '/client/attendance' }, { label: 'Fees', icon: 'payments', route: '/client/fees' }]
        };
        const visible = items[key].filter(item => this.auth.isModuleOn(moduleForRoute(item.route)));
        this.bottomNavCache.set(cacheKey, visible);
        return visible;
    }

    ngOnInit() {
        // A real Owner's logo and institute name come from their saved website.
        this.content.loadOwnerWebsite().subscribe();
        // Pick up module changes the Super Admin made since sign-in.
        const token = this.auth.token;
        if (token && (this.auth.role === 'Owner' || this.auth.role === 'Teacher')) {
            this.authApi.myModules(token).subscribe({
                next: disabled => { this.auth.setDisabledModules(disabled); this.leaveIfModuleOff(); },
                error: () => { /* Keep the list from sign-in. */ }
            });
        } else this.leaveIfModuleOff();
    }

}

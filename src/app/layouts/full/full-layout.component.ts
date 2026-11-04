import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarService } from '../../shared/sidebar/sidebar.service'
import { WebsiteContentService } from '../../core/website-content.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { BottomNavItem } from '../../shared/ui/bottom-nav/bottom-nav.component';

@Component({
    selector: 'app-full-layout',
    templateUrl: './full-layout.component.html',
    styleUrls: ['./full-layout.component.scss']
})

export class FullLayoutComponent implements OnInit {
    private currentPath = '';
    private readonly bottomNavCache = new Map<string, BottomNavItem[]>();

    constructor( public sidebarservice: SidebarService, private content: WebsiteContentService, private auth: MockAuthService, router: Router ) {
        this.currentPath = router.url;
        router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => this.currentPath = event.urlAfterRedirects);
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
        const cached = this.bottomNavCache.get(key);
        if (cached) return cached;
        const items: Record<string, BottomNavItem[]> = {
            shop: [{ label: 'Overview', icon: 'space_dashboard', route: '/shop/dashboard' }, { label: 'Products', icon: 'checkroom', route: '/shop/products' }, { label: 'Billing', icon: 'point_of_sale', route: '/shop/billing' }, { label: 'Orders', icon: 'shopping_bag', route: '/shop/orders' }],
            'super-admin': [{ label: 'Dashboard', icon: 'home', route: '/super-admin/dashboard' }, { label: 'Centers', icon: 'school', route: '/super-admin/clients' }, { label: 'Users', icon: 'group', route: '/super-admin/users' }, { label: 'Profile', icon: 'person', route: '/account/profile' }],
            teacher: [{ label: 'Dashboard', icon: 'home', route: '/client/dashboard' }, { label: 'Profile', icon: 'person', route: '/account/profile' }, { label: 'Attendance', icon: 'schedule', route: '/client/attendance' }, { label: 'Notices', icon: 'notifications', route: '/client/notices', dot: true }],
            owner: [{ label: 'Dashboard', icon: 'home', route: '/client/dashboard' }, { label: 'Students', icon: 'group', route: '/client/students' }, { label: 'Attendance', icon: 'schedule', route: '/client/attendance' }, { label: 'Fees', icon: 'payments', route: '/client/fees' }]
        };
        this.bottomNavCache.set(key, items[key]);
        return items[key];
    }

    ngOnInit() {
        // A real Owner's logo and institute name come from their saved website.
        this.content.loadOwnerWebsite().subscribe();
    }

}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { DirectoryEntry, WebsiteApiService } from '../core/website-api.service';

/** Hosts that can never be an institute's own domain (local development, raw IPs). */
const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?|\d+\.\d+\.\d+\.\d+)$/;

/**
 * The site root. On an institute's own domain (set by the Super Admin) it opens that institute's website;
 * anywhere else it lists every published coaching centre and school.
 */
@Component({ selector: 'app-site-home', standalone: true, imports: [SharedModule], templateUrl: './site-home.component.html', styleUrls: ['./site-home.component.scss'] })
export class SiteHomeComponent implements OnInit {
  sites: DirectoryEntry[] = [];
  state: 'loading' | 'ready' | 'error' = 'loading';
  search = '';
  type: '' | 'coaching' | 'school' = '';
  readonly samples = [
    { path: '/site/northstar-academy', name: 'Northstar Academy', type: 'Coaching' },
    { path: '/site/greenfield-school', name: 'Greenfield Public School', type: 'School' }
  ];

  constructor(private api: WebsiteApiService, private router: Router) {}

  ngOnInit(): void {
    const host = window.location.hostname;
    if (LOCAL_HOST.test(host)) { this.loadDirectory(); return; }
    this.api.byDomain(host).subscribe({
      next: ({ siteSlug }) => this.router.navigateByUrl(`/site/${siteSlug}`, { replaceUrl: true }),
      error: () => this.loadDirectory()
    });
  }

  loadDirectory(): void {
    this.state = 'loading';
    this.api.directory().subscribe({
      next: sites => { this.sites = sites; this.state = 'ready'; },
      error: () => this.state = 'error'
    });
  }

  get filtered(): DirectoryEntry[] {
    const query = this.search.trim().toLowerCase();
    return this.sites.filter(site => (!this.type || site.workType === this.type) && (!query || `${site.name} ${site.address}`.toLowerCase().includes(query)));
  }
  count(type: 'coaching' | 'school'): number { return this.sites.filter(site => site.workType === type).length; }
  /** Uploaded logos only; the default placeholder logo shows the first letter instead. */
  logoOf(site: DirectoryEntry): string | null { return site.logo && !site.logo.endsWith('assets/images/logo.svg') ? site.logo : null; }
}

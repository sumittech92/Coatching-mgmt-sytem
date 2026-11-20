import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TenantContextService } from '../../core/tenant-context.service';
import { MockAuthService } from '../../core/mock-auth.service';

/** Owner / teacher page for AI mock test papers (school, Classes 9–12). */
@Component({
  selector: 'app-mock-papers-page',
  template: `
    <div class="page-header mp-head">
      <app-breadcrumbs [items]="['School', 'Mock papers']"></app-breadcrumbs>
      <h1>Mock test papers</h1>
      <p>Board-pattern practice papers for Classes 9–12, chapter-wise or full syllabus, with answer keys. Students generate their own from the portal; you can see and download every paper here.</p>
    </div>
    <app-empty-state *ngIf="!auth.token" icon="description" title="Sign in to use mock papers" description="Mock papers work with a signed-in school account."></app-empty-state>
    <app-mock-paper-workspace *ngIf="auth.token" [portal]="false"></app-mock-paper-workspace>`,
  styles: [':host{display:block}.mp-head{margin-bottom:16px}.mp-head h1{margin:9px 0 4px}.mp-head p{margin:0;color:#4a5568;font-size:14px;max-width:860px}']
})
export class MockPapersPageComponent implements OnInit {
  constructor(private tenant: TenantContextService, private router: Router, public auth: MockAuthService) {}
  ngOnInit(): void { if (!this.tenant.isSchool) this.router.navigateByUrl('/client/dashboard'); }
}

import { Component } from '@angular/core';
import { MockAuthService } from '../../core/mock-auth.service';
import { TenantContextService } from '../../core/tenant-context.service';

/** Signed-in person's own account (Super Admin, Owner, Teacher): contact details plus password change. */
@Component({ selector: 'app-account-settings', templateUrl: './account-settings.component.html', styleUrls: ['../../client/students-page.component.scss', './account-settings.component.scss'] })
export class AccountSettingsComponent {
  constructor(public auth: MockAuthService, private tenant: TenantContextService) {}

  get roleLabel(): string {
    if (this.auth.role === 'Owner') return this.tenant.terms.ownerTitle;
    if (this.auth.role === 'Teacher') return 'Teacher';
    return this.auth.role;
  }

  get details(): { label: string; value: string }[] {
    const user = this.auth.user;
    return [
      { label: 'Full name', value: user?.full_Name || (this.auth.isDemo ? 'Demo user' : '—') },
      { label: 'Role', value: this.roleLabel },
      { label: 'Email', value: user?.email || '—' },
      { label: 'Mobile number', value: user?.phoneNumber || '—' },
      { label: 'Workspace', value: this.auth.role === 'Super Admin' ? 'Platform' : this.tenant.current.businessName }
    ];
  }
}

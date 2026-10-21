import { Component } from '@angular/core';
import { MockAuthService } from '../../core/mock-auth.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { formatDate, formatPhone } from '../../core/profile-format';

/** Signed-in person's own account (Super Admin, Owner, Teacher): contact details plus password change. */
@Component({ selector: 'app-account-settings', templateUrl: './account-settings.component.html', styleUrls: ['../../client/students-page.component.scss', './account-settings.component.scss'] })
export class AccountSettingsComponent {
  constructor(public auth: MockAuthService, private tenant: TenantContextService) {}

  get roleLabel(): string {
    if (this.auth.role === 'Owner') return this.tenant.terms.ownerTitle;
    if (this.auth.role === 'Teacher') return 'Teacher';
    return this.auth.role;
  }

  /** Registered details from the login response (Super Admin, Owner and Teacher accounts). */
  get details(): { label: string; value: string }[] {
    const user = this.auth.user;
    const workType = user?.workType === 'school' ? 'School' : user?.workType === 'coaching' ? 'Coaching' : '—';
    return [
      { label: 'Full name', value: this.auth.displayName || (this.auth.isDemo ? 'Demo user' : '—') },
      { label: 'Role', value: this.roleLabel },
      { label: 'Email', value: user?.email || '—' },
      { label: 'Mobile number', value: formatPhone(user?.countryCode, user?.phoneNumber) },
      { label: 'Workspace', value: this.auth.role === 'Super Admin' ? 'Platform' : this.tenant.current.businessName },
      ...(this.auth.role === 'Super Admin' ? [] : [{ label: 'Work type', value: workType }]),
      { label: 'Account status', value: user ? (user.isBlocked ? 'Blocked' : 'Active') : '—' },
      { label: 'Registered on', value: formatDate(user?.createdAt) },
      { label: 'Last sign-in', value: formatDate(user?.lastLogin) }
    ];
  }
}

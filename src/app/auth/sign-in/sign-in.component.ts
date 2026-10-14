import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DemoRole, MockAuthService } from '../../core/mock-auth.service';
import { BusinessType } from '../../core/models/business-type';
import { TenantContextService } from '../../core/tenant-context.service';
import { environment } from '../../../environments/environment';
import { ApiRole } from '../../core/auth-api.service';
import { PATTERNS, isMobile, normalizeMobile } from '../../core/app-validators';
import { ToastService } from '../../core/toast.service';

const API_ROLES: Record<DemoRole, ApiRole> = { 'Super Admin': 'superAdmin', Owner: 'admin', Teacher: 'teacher', Student: 'student', Parent: 'parent' };

@Component({ selector: 'app-sign-in', templateUrl: './sign-in.component.html' })
export class SignInComponent {
  // Parents share the student portal, so they sign in through the Student panel.
  readonly panels: { role: DemoRole; label: string; icon: string }[] = [
    { role: 'Owner', label: 'Owner', icon: 'business_center' },
    { role: 'Teacher', label: 'Teacher', icon: 'co_present' }, { role: 'Student', label: 'Student', icon: 'school' }
  ];
  readonly workspaces: { value: BusinessType; title: string; hint: string; icon: string }[] = [
    { value: 'coaching', title: 'Coaching', hint: 'Classes, courses & batches', icon: 'auto_stories' },
    { value: 'school', title: 'School', hint: 'Classes, sections & subjects', icon: 'account_balance' }
  ];
  readonly supportPhone = environment.supportPhone;
  panel: DemoRole = 'Owner';
  /** Super Admin sign-in is deliberately hidden: 5 quick taps on the logo reveal it (see brandTap). */
  platformAccess = false;
  private brandTaps: number[] = [];
  identifier = '';
  fieldErrors: { identifier?: string; password?: string } = {};
  password = '';
  hide = true;
  businessType: BusinessType = this.tenant.current.businessType === 'school' ? 'school' : 'coaching';
  rememberMe = true;
  errorMessage = '';

  constructor(private router: Router, private route: ActivatedRoute, private auth: MockAuthService, private tenant: TenantContextService, private toast: ToastService) {}

  get identifierIcon(): string { return /^[\d\s]+$/.test(this.identifier.trim()) && this.identifier.trim() ? 'smartphone' : 'mail_outline'; }

  clearError(field: 'identifier' | 'password'): void { delete this.fieldErrors[field]; this.errorMessage = ''; }

  signIn(): void {
    this.errorMessage = '';
    this.fieldErrors = this.validate();
    if (Object.keys(this.fieldErrors).length) { this.toast.invalidForm(); return; }
    // UI-testing mode: the auth API is disconnected, so any well-formed sign-in opens the selected panel.
    const id = this.identifier.trim();
    const mobile = isMobile(id);
    this.tenant.setBusinessType(this.businessType, this.rememberMe);
    this.auth.login(this.panel, this.rememberMe, {
      _id: 'demo', full_Name: null, profileImage: '', email: mobile ? null : id.toLowerCase(), countryCode: null,
      phoneNumber: mobile ? normalizeMobile(id) : null, workPlace: this.panel === 'Super Admin' ? null : this.businessType === 'school' ? 'school' : 'coaching',
      address: null, role: API_ROLES[this.panel], isBlocked: false
    });
    this.toast.success(`Signed in to the ${this.panelLabel} panel.`);
    this.goHome();
  }

  get panelLabel(): string { return this.panels.find(item => item.role === this.panel)?.label ?? this.panel; }

  /** Five taps on the logo within 3 seconds switch the form to platform (Super Admin) sign-in. */
  brandTap(): void {
    const now = Date.now();
    this.brandTaps = [...this.brandTaps.filter(time => now - time < 3000), now];
    if (this.brandTaps.length < 5 || this.platformAccess) return;
    this.brandTaps = [];
    this.platformAccess = true;
    this.panel = 'Super Admin';
    this.errorMessage = '';
  }

  leavePlatformAccess(): void {
    this.platformAccess = false;
    this.panel = 'Owner';
    this.errorMessage = '';
  }

  selectPanel(role: DemoRole): void {
    this.panel = role;
    this.errorMessage = '';
  }

  private validate(): { identifier?: string; password?: string } {
    const errors: { identifier?: string; password?: string } = {};
    const id = this.identifier.trim();
    if (!id) errors.identifier = 'Enter your email ID or mobile number.';
    else if (/^[\d\s+-]+$/.test(id) ? !isMobile(id) : !PATTERNS.email.test(id)) errors.identifier = /^[\d\s+-]+$/.test(id) ? 'Enter a valid 10-digit mobile number.' : 'Enter a valid email address.';
    if (!this.password) errors.password = 'Enter your password.';
    else if (this.password.length < 8) errors.password = 'Password must be at least 8 characters.';
    return errors;
  }

  private goHome(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') ? returnUrl : this.auth.landingPath);
  }
}

import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService, LoginPayload } from '../../core/auth-api.service';
import { DemoRole, MockAuthService } from '../../core/mock-auth.service';
import { BusinessType } from '../../core/models/business-type';
import { TenantContextService } from '../../core/tenant-context.service';

@Component({ selector: 'app-sign-in', templateUrl: './sign-in.component.html' })
export class SignInComponent {
  readonly countryCodes = ['+91', '+971', '+966', '+974', '+965', '+968', '+973'];
  // Parents share the student portal, so they sign in through the Student panel.
  readonly roles: DemoRole[] = ['Super Admin', 'Owner', 'Teacher', 'Student'];
  loginWith: 'phone' | 'email' = 'phone';
  countryCode = '+91';
  phoneNumber = '';
  email = '';
  password = '';
  hide = true;
  businessType: BusinessType = this.tenant.current.businessType === 'college' ? 'college' : 'coaching';
  rememberMe = true;
  showDemo = false;
  role: DemoRole = 'Owner';
  loading = false;
  errorMessage = '';

  constructor(private router: Router, private route: ActivatedRoute, private api: AuthApiService, private auth: MockAuthService, private tenant: TenantContextService) {}

  signIn(): void {
    this.errorMessage = this.validate();
    if (this.errorMessage) return;
    const credentials: LoginPayload = this.loginWith === 'email'
      ? { email: this.email.trim(), password: this.password }
      : { countryCode: this.countryCode, phoneNumber: this.phoneNumber.trim(), password: this.password };
    this.loading = true;
    this.api.login(credentials).pipe(finalize(() => this.loading = false)).subscribe({
      next: ({ user, accessToken }) => {
        // The backend's workPlace wins when set; otherwise use the workspace picked here.
        const workspace = user.workPlace === 'college' ? 'college' : user.workPlace ? 'coaching' : this.businessType;
        this.tenant.setBusinessType(workspace, this.rememberMe);
        this.auth.startSession(user, accessToken, this.rememberMe);
        this.goHome();
      },
      error: (error: Error) => this.errorMessage = error.message
    });
  }

  enterDemo(): void {
    this.tenant.setBusinessType(this.businessType, this.rememberMe);
    this.auth.login(this.role, this.rememberMe);
    this.goHome();
  }

  private validate(): string {
    if (this.loginWith === 'email' && !/^\S+@\S+\.\S+$/.test(this.email.trim())) return 'Enter a valid email address.';
    if (this.loginWith === 'phone' && !/^\d{7,12}$/.test(this.phoneNumber.trim())) return 'Enter a valid mobile number (7–12 digits).';
    if (!this.password) return 'Enter your password.';
    return '';
  }

  private goHome(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') ? returnUrl : this.auth.landingPath);
  }
}

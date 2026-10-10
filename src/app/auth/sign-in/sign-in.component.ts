import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DemoRole, MockAuthService } from '../../core/mock-auth.service';
import { BusinessType } from '../../core/models/business-type';
import { TenantContextService } from '../../core/tenant-context.service';

@Component({ selector: 'app-sign-in', templateUrl: './sign-in.component.html', styleUrls: ['./sign-in.component.scss'] })
export class SignInComponent {
  hide = true;
  email = '';
  password = '';
  role: DemoRole = 'Owner';
  businessType: BusinessType = 'coaching';
  rememberMe = true;
  loading = false;
  errorMessage = '';
  constructor(private router: Router, private auth: MockAuthService, private tenant: TenantContextService) {}
  signIn(): void {
    this.errorMessage = '';
    this.loading = true;
    this.tenant.setBusinessType(this.businessType, this.rememberMe);
    this.auth.login(this.role, this.rememberMe);
    this.router.navigateByUrl(this.auth.landingPath).then(navigated => {
      if (!navigated) window.location.assign(this.auth.landingPath);
    }).catch(() => {
      window.location.assign(this.auth.landingPath);
    }).finally(() => this.loading = false);
  }
  readonly roles: DemoRole[] = ['Super Admin', 'Owner', 'Teacher', 'Student', 'Parent'];
}

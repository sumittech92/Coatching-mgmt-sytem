import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DemoRole, MockAuthService } from '../../core/mock-auth.service';

@Component({ selector: 'app-sign-in', templateUrl: './sign-in.component.html', styleUrls: ['./sign-in.component.scss'] })
export class SignInComponent {
  hide = true;
  email = '';
  password = '';
  role: DemoRole = 'Owner';
  rememberMe = true;
  loading = false;
  errorMessage = '';
  constructor(private router: Router, private auth: MockAuthService) {}
  signIn(): void {
    this.errorMessage = '';
    if (!this.email.trim() || !this.password) { this.errorMessage = 'Enter your email or phone and password.'; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.email) && !/^\+?[\d\s()-]{8,}$/.test(this.email)) { this.errorMessage = 'Enter a valid email address or phone number.'; return; }
    if (this.password.length < 6) { this.errorMessage = 'Use a password with at least 6 characters.'; return; }
    if (this.email.toLowerCase().includes('error')) { this.errorMessage = 'Sign-in failed. Please check your details.'; return; }
    this.loading = true;
    this.auth.login(this.role, this.rememberMe);
    window.setTimeout(() => {
      const path = this.role === 'Super Admin' ? '/super-admin/dashboard' : (this.role === 'Student' || this.role === 'Parent') ? '/student/dashboard' : '/client/dashboard';
      this.router.navigateByUrl(path).finally(() => this.loading = false);
    }, 550);
  }
  readonly roles: DemoRole[] = ['Super Admin', 'Owner', 'Teacher', 'Student', 'Parent'];
}

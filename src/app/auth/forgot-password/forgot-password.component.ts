import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../core/auth-api.service';
import { PasswordResetState } from '../password-reset-state';

@Component({ selector: 'app-forgot-password', templateUrl: './forgot-password.component.html' })
export class ForgotPasswordComponent {
  readonly countryCodes = ['+91', '+971', '+966', '+974', '+965', '+968', '+973'];
  loading = false;
  errorMessage = '';
  form = this.fb.nonNullable.group({
    countryCode: ['+91', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{7,12}$/)]]
  });

  constructor(private fb: FormBuilder, private router: Router, private api: AuthApiService, private resetState: PasswordResetState) {}

  get phoneInvalid(): boolean {
    const control = this.form.controls.phoneNumber;
    return control.invalid && control.touched;
  }

  sendOtp(): void {
    this.errorMessage = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    // The backend looks the account up by phone number only.
    const phoneNumber = this.form.controls.phoneNumber.value.trim();
    this.loading = true;
    this.api.forgotPassword(phoneNumber).pipe(finalize(() => this.loading = false)).subscribe({
      next: ({ accessToken }) => {
        this.resetState.set({ phone: `${this.form.controls.countryCode.value} ${phoneNumber}`, phoneNumber, resetToken: accessToken });
        this.router.navigateByUrl('/otp-verification');
      },
      error: (error: Error) => this.errorMessage = error.message
    });
  }
}

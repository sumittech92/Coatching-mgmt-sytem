import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PasswordResetState } from '../password-reset-state';
import { AppValidators, normalizeMobile, validationMessage } from '../../core/app-validators';
import { ToastService } from '../../core/toast.service';
import { AuthApiService } from '../../core/auth-api.service';

@Component({ selector: 'app-forgot-password', templateUrl: './forgot-password.component.html' })
export class ForgotPasswordComponent {
  loading = false;
  errorMessage = '';
  form = this.fb.nonNullable.group({
    phoneNumber: ['', [AppValidators.required, AppValidators.mobile]]
  });

  constructor(private fb: FormBuilder, private router: Router, private resetState: PasswordResetState, private api: AuthApiService, private toast: ToastService) {}

  get phoneError(): string { return validationMessage(this.form.controls.phoneNumber, 'Mobile number'); }

  get phoneInvalid(): boolean {
    const control = this.form.controls.phoneNumber;
    return control.invalid && control.touched;
  }

  sendOtp(): void {
    this.errorMessage = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.invalidForm(); return; }
    if (this.loading) return;
    // The backend looks the account up by phone number only.
    const phoneNumber = normalizeMobile(this.form.controls.phoneNumber.value);
    this.loading = true;
    this.api.forgotPassword(phoneNumber).subscribe({
      next: ({ accessToken }) => {
        this.loading = false;
        this.resetState.set({ phone: phoneNumber, phoneNumber, resetToken: accessToken });
        this.toast.success(`OTP sent to ${phoneNumber}.`);
        this.router.navigateByUrl('/otp-verification');
      },
      error: (error: Error) => {
        this.loading = false;
        this.errorMessage = error.message;
        this.toast.error(error.message);
      }
    });
  }
}

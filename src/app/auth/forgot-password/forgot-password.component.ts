import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PasswordResetState } from '../password-reset-state';
import { AppValidators, normalizeMobile, validationMessage } from '../../core/app-validators';
import { ToastService } from '../../core/toast.service';

@Component({ selector: 'app-forgot-password', templateUrl: './forgot-password.component.html' })
export class ForgotPasswordComponent {
  loading = false;
  errorMessage = '';
  form = this.fb.nonNullable.group({
    phoneNumber: ['', [AppValidators.required, AppValidators.mobile]]
  });

  constructor(private fb: FormBuilder, private router: Router, private resetState: PasswordResetState, private toast: ToastService) {}

  get phoneError(): string { return validationMessage(this.form.controls.phoneNumber, 'Mobile number'); }

  get phoneInvalid(): boolean {
    const control = this.form.controls.phoneNumber;
    return control.invalid && control.touched;
  }

  sendOtp(): void {
    this.errorMessage = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.invalidForm(); return; }
    // The backend looks the account up by phone number only.
    const phoneNumber = normalizeMobile(this.form.controls.phoneNumber.value);
    // UI-testing mode: the auth API is disconnected; the demo OTP is 1234.
    this.resetState.set({ phone: phoneNumber, phoneNumber, resetToken: 'demo-reset' });
    this.toast.success(`OTP sent to ${phoneNumber}. Demo code: 1234`);
    this.router.navigateByUrl('/otp-verification');
  }
}

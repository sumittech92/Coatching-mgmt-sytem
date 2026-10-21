import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PasswordResetState } from '../password-reset-state';
import { passwordStrength, passwordsMatch } from '../signup-validators';
import { ToastService } from '../../core/toast.service';
import { AuthApiService } from '../../core/auth-api.service';

@Component({ selector: 'app-reset-password', templateUrl: './reset-password.component.html' })
export class ResetPasswordComponent implements OnInit {
  hide = true;
  hide2 = true;
  loading = false;
  saved = false;
  errorMessage = '';
  form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });

  constructor(private fb: FormBuilder, private router: Router, private resetState: PasswordResetState, private api: AuthApiService, private toast: ToastService) {}

  ngOnInit(): void {
    // The OTP step must come first; a direct visit restarts the flow.
    if (!this.resetState.value?.verifiedToken) this.router.navigateByUrl('/forgot-password');
  }

  get strength() { return passwordStrength(this.form.controls.password.value); }

  save(): void {
    this.errorMessage = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.invalidForm(); return; }
    const token = this.resetState.value?.verifiedToken;
    if (!token) { this.router.navigateByUrl('/forgot-password'); return; }
    if (this.loading) return;
    const { password, confirmPassword } = this.form.getRawValue();
    this.loading = true;
    this.api.resetPassword(token, password, confirmPassword).subscribe({
      next: () => {
        this.loading = false;
        this.resetState.clear();
        this.saved = true;
        this.toast.success('Password reset successfully. Please sign in.');
      },
      error: (error: Error) => {
        this.loading = false;
        this.errorMessage = error.message;
        this.toast.error(error.message);
      }
    });
  }
}

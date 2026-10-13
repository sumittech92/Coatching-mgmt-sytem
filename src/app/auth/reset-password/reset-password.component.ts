import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../core/auth-api.service';
import { PasswordResetState } from '../password-reset-state';
import { passwordStrength, passwordsMatch } from '../signup-validators';

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

  constructor(private fb: FormBuilder, private router: Router, private api: AuthApiService, private resetState: PasswordResetState) {}

  ngOnInit(): void {
    // The OTP step must come first; a direct visit restarts the flow.
    if (!this.resetState.value?.verifiedToken) this.router.navigateByUrl('/forgot-password');
  }

  get strength() { return passwordStrength(this.form.controls.password.value); }

  save(): void {
    this.errorMessage = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const token = this.resetState.value?.verifiedToken;
    if (!token) { this.router.navigateByUrl('/forgot-password'); return; }
    const { password, confirmPassword } = this.form.getRawValue();
    this.loading = true;
    this.api.resetPassword(token, password, confirmPassword).pipe(finalize(() => this.loading = false)).subscribe({
      next: () => { this.resetState.clear(); this.saved = true; },
      error: (error: Error) => this.errorMessage = /expired|invalid reset token|must be verified/i.test(error.message)
        ? 'Your reset session has expired. Please start again from “Forgot password”.'
        : error.message
    });
  }
}

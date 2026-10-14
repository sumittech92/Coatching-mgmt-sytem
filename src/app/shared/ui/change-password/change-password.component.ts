import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../../core/auth-api.service';
import { MockAuthService } from '../../../core/mock-auth.service';
import { ToastService } from '../../../core/toast.service';

const matchesNewPassword = (group: AbstractControl): ValidationErrors | null =>
  group.get('confirmPassword')?.value && group.get('newPassword')?.value !== group.get('confirmPassword')?.value ? { mismatch: true } : null;

/** "Change password" card used on every panel's profile / settings page. Demo sessions only simulate the change. */
@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent {
  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: matchesNewPassword });
  hide = { currentPassword: true, newPassword: true, confirmPassword: true };
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private fb: FormBuilder, private api: AuthApiService, public auth: MockAuthService, private toast: ToastService) {}

  get sameAsCurrent(): boolean {
    const { currentPassword, newPassword } = this.form.getRawValue();
    return !!newPassword && currentPassword === newPassword;
  }

  submit(): void {
    this.successMessage = this.errorMessage = '';
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.toast.invalidForm(); return; }
    if (this.sameAsCurrent) { this.errorMessage = 'New password must be different from the current one.'; this.toast.error(this.errorMessage); return; }
    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();
    const token = this.auth.token;
    if (!token) {
      this.done('Demo session: the form works, but no account password was changed.');
      return;
    }
    this.loading = true;
    this.api.changePassword(token, currentPassword, newPassword, confirmPassword).pipe(finalize(() => this.loading = false)).subscribe({
      next: () => this.done('Your password has been changed.'),
      error: (error: Error) => { this.errorMessage = error.message; this.toast.error(error.message); }
    });
  }

  private done(message: string): void {
    this.form.reset();
    this.successMessage = message;
    this.toast.success(message);
  }
}

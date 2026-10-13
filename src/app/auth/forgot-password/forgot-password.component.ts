import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({ selector: 'app-forgot-password', templateUrl: './forgot-password.component.html', styleUrls: ['../sign-in/sign-in.component.scss', '../recovery-shared.scss'] })
export class ForgotPasswordComponent {
  readonly countryCodes = ['+91', '+971', '+966', '+974', '+965', '+968', '+973'];
  loading = false;
  form = this.fb.nonNullable.group({
    countryCode: ['+91', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{7,12}$/)]]
  });

  constructor(private fb: FormBuilder, private router: Router) {}

  get phoneInvalid(): boolean {
    const control = this.form.controls.phoneNumber;
    return control.invalid && control.touched;
  }

  sendOtp(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    // UI-only flow: no backend call yet.
    this.loading = true;
    const phone = `${this.form.controls.countryCode.value} ${this.form.controls.phoneNumber.value}`;
    setTimeout(() => {
      this.loading = false;
      this.router.navigate(['/otp-verification'], { state: { phone } });
    }, 700);
  }
}

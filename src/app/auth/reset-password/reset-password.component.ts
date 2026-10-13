import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { passwordStrength, passwordsMatch } from '../signup-validators';

@Component({ selector: 'app-reset-password', templateUrl: './reset-password.component.html', styleUrls: ['../sign-in/sign-in.component.scss', '../recovery-shared.scss'] })
export class ResetPasswordComponent implements OnInit {
  hide = true;
  hide2 = true;
  loading = false;
  saved = false;
  form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    // The OTP step must come first; a direct visit restarts the flow.
    if (!history.state?.verified) this.router.navigateByUrl('/forgot-password');
  }

  get strength() { return passwordStrength(this.form.controls.password.value); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    // UI-only flow: no backend call yet.
    this.loading = true;
    setTimeout(() => { this.loading = false; this.saved = true; }, 700);
  }
}

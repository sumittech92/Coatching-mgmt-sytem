import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MockAuthService } from '../../core/mock-auth.service';
import { passwordStrength, passwordsMatch } from '../signup-validators';

@Component({ selector: 'app-student-signup', templateUrl: './student-signup.component.html', styleUrls: ['../sign-in/sign-in.component.scss', '../signup-shared.scss'] })
export class StudentSignupComponent {
  readonly classes = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly boards = ['CBSE', 'ICSE', 'State Board', 'IB / IGCSE', 'Other'];
  readonly countryCodes = ['+91', '+971', '+966', '+974', '+965', '+968', '+973'];
  hide = true;
  loading = false;
  submitted = false;

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    countryCode: ['+91', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{7,12}$/)]],
    studentClass: [0, Validators.min(1)],
    board: ['CBSE', Validators.required],
    schoolName: ['', Validators.required],
    city: ['', Validators.required],
    parentName: ['', Validators.required],
    parentPhone: ['', [Validators.required, Validators.pattern(/^\d{7,12}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    acceptTerms: [false, Validators.requiredTrue]
  }, { validators: passwordsMatch });

  constructor(private fb: FormBuilder, private router: Router, private auth: MockAuthService) {}

  get strength() { return passwordStrength(this.form.controls.password.value); }

  showError(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  selectClass(value: number): void {
    this.form.controls.studentClass.setValue(value);
    this.form.controls.studentClass.markAsTouched();
  }

  register(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    // UI-only flow: no backend call yet, mirror the demo sign-in delay.
    this.loading = true;
    setTimeout(() => { this.loading = false; this.submitted = true; }, 900);
  }

  continue(): void {
    this.auth.login('Student', true);
    this.router.navigateByUrl(this.auth.landingPath);
  }
}

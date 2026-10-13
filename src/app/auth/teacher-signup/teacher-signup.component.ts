import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MockAuthService } from '../../core/mock-auth.service';
import { passwordStrength, passwordsMatch } from '../signup-validators';

@Component({ selector: 'app-teacher-signup', templateUrl: './teacher-signup.component.html', styleUrls: ['../sign-in/sign-in.component.scss', '../signup-shared.scss'] })
export class TeacherSignupComponent {
  readonly classes = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly subjects = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Science', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Sanskrit', 'EVS', 'Accountancy', 'Economics'];
  readonly qualifications = ['B.Ed', 'M.Ed', 'B.Sc / B.A. / B.Com', 'M.Sc / M.A. / M.Com', 'Ph.D', 'Other'];
  readonly experienceLevels = ['Fresher', '1–3 years', '3–5 years', '5–10 years', '10+ years'];
  readonly countryCodes = ['+91', '+971', '+966', '+974', '+965', '+968', '+973'];
  hide = true;
  loading = false;
  submitted = false;

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    countryCode: ['+91', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{7,12}$/)]],
    subjects: [[] as string[], Validators.required],
    classes: [[] as number[], Validators.required],
    qualification: ['', Validators.required],
    experience: ['', Validators.required],
    city: ['', Validators.required],
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

  isClassSelected(value: number): boolean { return this.form.controls.classes.value.includes(value); }

  toggleClass(value: number): void {
    const current = this.form.controls.classes.value;
    const next = current.includes(value) ? current.filter(c => c !== value) : [...current, value].sort((a, b) => a - b);
    this.form.controls.classes.setValue(next);
    this.form.controls.classes.markAsTouched();
  }

  get classSummary(): string {
    const list = this.form.controls.classes.value;
    return list.length ? `Class ${list.join(', ')}` : '';
  }

  register(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    // UI-only flow: no backend call yet, mirror the demo sign-in delay.
    this.loading = true;
    setTimeout(() => { this.loading = false; this.submitted = true; }, 900);
  }

  continue(): void {
    this.auth.login('Teacher', true);
    this.router.navigateByUrl(this.auth.landingPath);
  }
}

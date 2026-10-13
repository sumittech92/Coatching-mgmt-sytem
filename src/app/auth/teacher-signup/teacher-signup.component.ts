import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { AuthApiService } from '../../core/auth-api.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { BusinessType } from '../../core/models/business-type';
import { TenantContextService } from '../../core/tenant-context.service';
import { COACHING_SUBJECTS, COLLEGE_DEPARTMENTS, COLLEGE_DESIGNATIONS, STUDENT_CLASSES, termsFor } from '../../core/workspace-terms';
import { passwordStrength, passwordsMatch } from '../signup-validators';

const COACHING_ONLY = ['subjects', 'classes'] as const;
const COLLEGE_ONLY = ['department', 'designation', 'specialization', 'employeeId'] as const;

@Component({ selector: 'app-teacher-signup', templateUrl: './teacher-signup.component.html' })
export class TeacherSignupComponent implements OnInit {
  readonly classes = STUDENT_CLASSES;
  readonly subjects = COACHING_SUBJECTS;
  readonly departments = COLLEGE_DEPARTMENTS;
  readonly designations = COLLEGE_DESIGNATIONS;
  readonly countryCodes = ['+91', '+971', '+966', '+974', '+965', '+968', '+973'];
  workspace: BusinessType = 'coaching';
  hide = true;
  loading = false;
  submitted = false;
  errorMessage = '';
  /** False when the account was created but the automatic sign-in failed. */
  signedIn = false;

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    countryCode: ['+91', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{7,12}$/)]],
    // Coaching
    subjects: [[] as string[], Validators.required],
    classes: [[] as number[], Validators.required],
    // College
    department: ['', Validators.required],
    designation: ['', Validators.required],
    specialization: ['', Validators.required],
    employeeId: [''],
    // Common
    qualification: ['', Validators.required],
    experience: ['', Validators.required],
    city: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    acceptTerms: [false, Validators.requiredTrue]
  }, { validators: passwordsMatch });

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private api: AuthApiService, private auth: MockAuthService, private tenant: TenantContextService) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => this.applyWorkspace(params.get('type') === 'college' ? 'college' : 'coaching'));
  }

  get isCollege(): boolean { return this.workspace === 'college'; }
  get terms() { return termsFor(this.workspace); }
  get strength() { return passwordStrength(this.form.controls.password.value); }

  setWorkspace(type: BusinessType): void {
    this.router.navigate([], { queryParams: { type: type === 'college' ? 'college' : null }, replaceUrl: true });
  }

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

  get successDetail(): string {
    const v = this.form.getRawValue();
    return this.isCollege ? `${v.designation}, Department of ${v.department}` : `${v.subjects.join(', ')} (${this.classSummary})`;
  }

  register(): void {
    this.errorMessage = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const email = v.email.trim();
    // The backend only stores these five fields today; the other form fields are UI-only.
    const account = { fullName: v.fullName.trim(), email, password: v.password, countryCode: v.countryCode, phoneNumber: v.phoneNumber.trim() };
    this.loading = true;
    this.api.register({ ...account, role: 'teacher' }).pipe(
      switchMap(() => this.api.login({ email, password: v.password })),
      finalize(() => this.loading = false)
    ).subscribe({
      next: ({ user, accessToken }) => {
        this.tenant.setBusinessType(this.workspace, true);
        this.auth.startSession(user, accessToken, true);
        this.signedIn = true;
        this.submitted = true;
      },
      error: (error: Error) => {
        // Registration succeeded if the failure came from the follow-up login.
        if (this.registeredButNotSignedIn(error)) { this.submitted = true; return; }
        this.errorMessage = error.message;
      }
    });
  }

  continue(): void {
    this.router.navigateByUrl(this.signedIn ? this.auth.landingPath : '/login');
  }

  private registeredButNotSignedIn(error: Error): boolean {
    return error.message.startsWith('Invalid email/phone number or password') || error.message.startsWith('Your account is blocked');
  }

  // Disabled controls are skipped by validation, so only the active workspace's fields are required.
  private applyWorkspace(type: BusinessType): void {
    this.workspace = type;
    const [on, off] = this.isCollege ? [COLLEGE_ONLY, COACHING_ONLY] : [COACHING_ONLY, COLLEGE_ONLY];
    on.forEach(name => this.form.controls[name].enable());
    off.forEach(name => this.form.controls[name].disable());
    // Qualification lists differ, so a value picked for the other workspace is cleared.
    if (!this.terms.qualificationOptions.includes(this.form.controls.qualification.value)) this.form.controls.qualification.setValue('');
  }
}

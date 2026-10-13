import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { AuthApiService } from '../../core/auth-api.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { BusinessType } from '../../core/models/business-type';
import { TenantContextService } from '../../core/tenant-context.service';
import { ADMISSION_QUOTAS, COACHING_BOARDS, COLLEGE_PROGRAMS, COLLEGE_SEMESTERS, COLLEGE_YEARS, STUDENT_CLASSES } from '../../core/workspace-terms';
import { passwordStrength, passwordsMatch } from '../signup-validators';

const COACHING_ONLY = ['studentClass', 'board', 'schoolName'] as const;
const COLLEGE_ONLY = ['program', 'year', 'semester', 'quota', 'enrollmentNo'] as const;

@Component({ selector: 'app-student-signup', templateUrl: './student-signup.component.html' })
export class StudentSignupComponent implements OnInit {
  readonly classes = STUDENT_CLASSES;
  readonly boards = COACHING_BOARDS;
  readonly programs = COLLEGE_PROGRAMS;
  readonly years = COLLEGE_YEARS;
  readonly semesters = COLLEGE_SEMESTERS;
  readonly quotas = ADMISSION_QUOTAS;
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
    studentClass: [0, Validators.min(1)],
    board: ['CBSE', Validators.required],
    schoolName: ['', Validators.required],
    // College
    program: ['', Validators.required],
    year: ['', Validators.required],
    semester: ['', Validators.required],
    quota: ['General merit', Validators.required],
    enrollmentNo: [''],
    // Common
    city: ['', Validators.required],
    parentName: ['', Validators.required],
    parentPhone: ['', [Validators.required, Validators.pattern(/^\d{7,12}$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    acceptTerms: [false, Validators.requiredTrue]
  }, { validators: passwordsMatch });

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private api: AuthApiService, private auth: MockAuthService, private tenant: TenantContextService) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => this.applyWorkspace(params.get('type') === 'college' ? 'college' : 'coaching'));
  }

  get isCollege(): boolean { return this.workspace === 'college'; }
  get strength() { return passwordStrength(this.form.controls.password.value); }
  get placement(): string {
    const v = this.form.getRawValue();
    return this.isCollege ? `${v.program} · ${v.year}, ${v.semester}` : `Class ${v.studentClass}`;
  }

  setWorkspace(type: BusinessType): void {
    this.router.navigate([], { queryParams: { type: type === 'college' ? 'college' : null }, replaceUrl: true });
  }

  showError(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  selectClass(value: number): void {
    this.form.controls.studentClass.setValue(value);
    this.form.controls.studentClass.markAsTouched();
  }

  register(): void {
    this.errorMessage = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const email = v.email.trim();
    // The backend only stores these five fields today; the other form fields are UI-only.
    const account = { fullName: v.fullName.trim(), email, password: v.password, countryCode: v.countryCode, phoneNumber: v.phoneNumber.trim() };
    this.loading = true;
    this.api.register({ ...account, role: 'student' }).pipe(
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
  }
}

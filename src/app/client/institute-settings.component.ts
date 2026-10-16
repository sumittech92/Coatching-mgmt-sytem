import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { TenantContextService } from '../core/tenant-context.service';
import { COACHING_BOARDS, SCHOOL_CLASSES } from '../core/workspace-terms';
import { AppValidators, normalizeMobile, validationMessage } from '../core/app-validators';
import { ToastService } from '../core/toast.service';
import { WebsiteContentService } from '../core/website-content.service';

const THIS_YEAR = new Date().getFullYear();
const req = AppValidators.required;
const text = (max: number) => [req, Validators.maxLength(max)];
const year = [Validators.pattern(/^\d{4}$/), Validators.min(1850), Validators.max(THIS_YEAR)];
/** Office numbers may be a landline with STD code (e.g. 080 4567 8900) or a 10-digit mobile. */
const officePhone = (control: AbstractControl): ValidationErrors | null => { const v = String(control.value ?? '').replace(/[\s-]/g, ''); return !v || /^(0\d{9,11}|[6-9]\d{9})$/.test(v) ? null : { pattern: true }; };

/** Owner-only profile of the institute and its head; labels and fields follow the coaching / school workspace. */
@Component({ selector: 'app-institute-settings', templateUrl: './institute-settings.component.html', styleUrls: ['./students-page.component.scss', './institute-settings.component.scss'] })
export class InstituteSettingsComponent {
  readonly boards = COACHING_BOARDS;
  readonly coachingHeadTitles = ['Director', 'Founder & Director', 'Centre Head', 'Managing Partner'];
  readonly schoolBoards = ['CBSE', 'ICSE', 'State Board'];
  readonly schoolClasses = SCHOOL_CLASSES;
  readonly states = ['Delhi', 'Karnataka', 'Maharashtra', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal', 'Other'];
  saved = false;

  readonly coachingForm = this.fb.nonNullable.group({
    name: ['Northstar Academy', text(100)],
    registrationNo: ['UDYAM-KR-03-0012345', Validators.maxLength(40)],
    gstin: ['29ABCDE1234F1Z5', Validators.pattern(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i)],
    established: ['2014', year],
    boards: [['CBSE', 'ICSE'] as string[]],
    classesFrom: [1], classesTo: [12],
    headName: ['Jordan Davis', [req, AppValidators.personName, Validators.maxLength(60)]],
    headTitle: ['Director', req],
    headPhone: ['9876543210', [req, AppValidators.mobile]],
    headEmail: ['jordan@northstar.edu', [req, AppValidators.email, Validators.maxLength(120)]],
    session: ['April – March'],
    feeCycle: ['Monthly'],
    phone: [this.content.profileFor('coaching').contact['phone'], [req, officePhone]],
    email: ['hello@northstar.edu', [req, AppValidators.email, Validators.maxLength(120)]],
    address: ['14, 100 Feet Road, Indiranagar', text(200)],
    city: ['Bengaluru', [req, AppValidators.personName, Validators.maxLength(60)]], state: ['Karnataka', req], pincode: ['560038', [req, AppValidators.pincode]]
  });

  readonly schoolForm = this.fb.nonNullable.group({
    name: ['Greenfield Public School', text(100)],
    board: ['CBSE', req],
    affiliationNo: ['830412', [Validators.maxLength(20), Validators.pattern(/^[A-Za-z0-9/-]{4,20}$/)]],
    udise: ['29200812345', Validators.pattern(/^\d{11}$/)],
    established: ['1998', year],
    classesFrom: ['Nursery'], classesTo: ['Class 12'],
    headName: ['Mrs. Kavita Menon', [req, AppValidators.personName, Validators.maxLength(60)]],
    headPhone: ['9845022110', [req, AppValidators.mobile]],
    headEmail: ['principal@greenfieldpublic.edu.in', [req, AppValidators.email, Validators.maxLength(120)]],
    session: ['April – March'],
    feeCycle: ['Term-wise'],
    phone: [this.content.profileFor('school').contact['phone'], [req, officePhone]],
    email: ['office@greenfieldpublic.edu.in', [req, AppValidators.email, Validators.maxLength(120)]],
    address: ['22, 9th Main Road, Jayanagar 4th Block', text(200)],
    city: ['Bengaluru', [req, AppValidators.personName, Validators.maxLength(60)]], state: ['Karnataka', req], pincode: ['560011', [req, AppValidators.pincode]]
  });

  constructor(private fb: FormBuilder, public tenant: TenantContextService, private toast: ToastService, private content: WebsiteContentService) {}

  get isSchool(): boolean { return this.tenant.isSchool; }
  get form() { return this.isSchool ? this.schoolForm : this.coachingForm; }
  errorFor(name: string, label: string): string { return validationMessage((this.form as FormGroup).get(name), label); }

  save(): void {
    this.saved = false;
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.toast.invalidForm(); return; }
    if (!this.isSchool && this.coachingForm.controls.classesFrom.value > this.coachingForm.controls.classesTo.value) { this.toast.error('“Classes from” cannot be higher than “Classes to”.'); return; }
    if (this.isSchool && SCHOOL_CLASSES.indexOf(this.schoolForm.controls.classesFrom.value) > SCHOOL_CLASSES.indexOf(this.schoolForm.controls.classesTo.value)) { this.toast.error('“Classes from” cannot be higher than “Classes to”.'); return; }
    this.form.controls.headPhone.setValue(normalizeMobile(this.form.controls.headPhone.value));
    // UI-only: keep the edited name in the header and sidebar for this session.
    this.tenant.current.businessName = this.form.controls.name.value.trim();
    // Office phone is the number used for Call / WhatsApp / support links across the website and portals.
    this.content.setPhone(this.form.controls.phone.value.trim());
    this.saved = true;
    this.toast.success(this.isSchool ? 'School profile saved.' : 'Institute profile saved.');
  }
}

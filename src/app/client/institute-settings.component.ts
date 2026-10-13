import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TenantContextService } from '../core/tenant-context.service';
import { COACHING_BOARDS } from '../core/workspace-terms';

/** Owner-only profile of the institute and its head; labels and fields follow the coaching / college workspace. */
@Component({ selector: 'app-institute-settings', templateUrl: './institute-settings.component.html', styleUrls: ['./students-page.component.scss', './institute-settings.component.scss'] })
export class InstituteSettingsComponent {
  readonly boards = COACHING_BOARDS;
  readonly coachingHeadTitles = ['Director', 'Founder & Director', 'Centre Head', 'Managing Partner'];
  readonly collegeHeadTitles = ['Principal', 'Director', 'Dean', 'Registrar'];
  readonly approvals = ['UGC', 'AICTE', 'State Government', 'NCTE', 'Autonomous'];
  readonly naacGrades = ['A++', 'A+', 'A', 'B++', 'B+', 'B', 'Not accredited'];
  readonly states = ['Delhi', 'Karnataka', 'Maharashtra', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal', 'Other'];
  saved = false;

  readonly coachingForm = this.fb.nonNullable.group({
    name: ['Northstar Academy', Validators.required],
    registrationNo: ['UDYAM-KR-03-0012345'],
    gstin: ['29ABCDE1234F1Z5'],
    established: ['2014'],
    boards: [['CBSE', 'ICSE'] as string[]],
    classesFrom: [1], classesTo: [12],
    headName: ['Jordan Davis', Validators.required],
    headTitle: ['Director', Validators.required],
    headPhone: ['+91 98765 43210', Validators.required],
    headEmail: ['jordan@northstar.edu', [Validators.required, Validators.email]],
    session: ['April – March'],
    feeCycle: ['Monthly'],
    phone: ['+91 80 4567 8900', Validators.required],
    email: ['hello@northstar.edu', [Validators.required, Validators.email]],
    address: ['14, 100 Feet Road, Indiranagar', Validators.required],
    city: ['Bengaluru', Validators.required], state: ['Karnataka', Validators.required], pincode: ['560038', Validators.required]
  });

  readonly collegeForm = this.fb.nonNullable.group({
    name: ['Greenfield College', Validators.required],
    collegeCode: ['C-41872'],
    university: ['Bangalore University', Validators.required],
    approvals: [['UGC'] as string[]],
    naac: ['A+'],
    established: ['1998'],
    headName: ['Dr. Kavita Menon', Validators.required],
    headTitle: ['Principal', Validators.required],
    headPhone: ['+91 98450 22110', Validators.required],
    headEmail: ['principal@greenfield.edu', [Validators.required, Validators.email]],
    academicYear: ['2026–27'],
    system: ['Semester'],
    minAttendance: [75, [Validators.min(0), Validators.max(100)]],
    grading: ['10-point CGPA'],
    phone: ['+91 80 2233 4455', Validators.required],
    email: ['office@greenfield.edu', [Validators.required, Validators.email]],
    address: ['Greenfield Campus, Jayanagar 4th Block', Validators.required],
    city: ['Bengaluru', Validators.required], state: ['Karnataka', Validators.required], pincode: ['560011', Validators.required]
  });

  constructor(private fb: FormBuilder, public tenant: TenantContextService) {}

  get isCollege(): boolean { return this.tenant.isCollege; }
  get form() { return this.isCollege ? this.collegeForm : this.coachingForm; }

  save(): void {
    this.saved = false;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    // UI-only: keep the edited name in the header and sidebar for this session.
    this.tenant.current.businessName = this.form.controls.name.value;
    this.saved = true;
  }
}

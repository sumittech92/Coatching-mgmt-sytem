import { Component, Inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiCourse } from '../../core/course-api.service';
import { ApiBatch } from '../../core/batch-api.service';
import { ApiTeacher } from '../../core/teacher-api.service';
import { ApiSubject, SubjectPayload } from '../../core/subject-api.service';
import { ToastService } from '../../core/toast.service';
import { SCHOOL_SUBJECTS } from '../../core/workspace-terms';

export interface SubjectDialogData {
  subject?: ApiSubject;
  /** School classes. */
  courses: ApiCourse[];
  /** Every section of every class. */
  batches: ApiBatch[];
  teachers: ApiTeacher[];
}

const OTHER = '__other__';

/** Add / edit a school subject: class, name, code, periods per week and the teacher of each section of the class. */
@Component({ selector: 'app-subject-dialog', templateUrl: './subject-dialog.component.html', styleUrls: ['./test-dialog.component.scss'] })
export class SubjectDialogComponent {
  readonly other = OTHER;
  form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: SubjectDialogData, private fb: FormBuilder, private ref: MatDialogRef<SubjectDialogComponent>, private toast: ToastService) {
    const subject = data.subject;
    const standard = subject && !SCHOOL_SUBJECTS.includes(subject.name) ? OTHER : subject?.name || '';
    this.form = this.fb.group({
      courseCode: [subject?.course?.courseCode || '', Validators.required],
      name: [standard, Validators.required],
      customName: [standard === OTHER ? subject!.name : '', Validators.maxLength(60)],
      code: [subject?.code || '', Validators.maxLength(20)],
      periodsPerWeek: [subject?.periodsPerWeek ?? null, [Validators.min(1), Validators.max(60)]],
      status: [subject?.status || 'active', Validators.required],
      optional: [!!subject?.optional],
      sections: this.fb.array([])
    });
    this.buildSections();
  }

  get sections(): FormArray<FormGroup> { return this.form.get('sections') as FormArray<FormGroup>; }
  get subjectOptions(): string[] { return SCHOOL_SUBJECTS; }
  get custom(): boolean { return this.form.value.name === OTHER; }
  /** Active teachers, plus any already assigned (so an inactive teacher still shows by name). */
  get teachers(): ApiTeacher[] {
    const assigned = new Set(this.data.subject?.sections.map(section => section.teacher?.teacherCode).filter(Boolean));
    return this.data.teachers.filter(teacher => teacher.fullName && (teacher.status === 'active' || assigned.has(teacher.teacherCode)));
  }

  /** One row per section of the chosen class, keeping teachers already picked. */
  buildSections(): void {
    const code = this.form.value.courseCode;
    const saved = new Map((this.data.subject?.course?.courseCode === code ? this.data.subject.sections : []).map(section => [section.batchCode, section.teacher?.teacherCode || '']));
    const picked = new Map(this.sections.controls.map(group => [group.value.batchCode, group.value.teacherCode]));
    this.sections.clear();
    this.data.batches.filter(batch => batch.course?.courseCode === code).sort((a, b) => a.name.localeCompare(b.name)).forEach(batch => this.sections.push(this.fb.group({
      batchCode: [batch.batchCode], name: [batch.name], inactive: [batch.status === 'inactive'],
      teacherCode: [picked.get(batch.batchCode) ?? saved.get(batch.batchCode) ?? '']
    })));
  }

  /** Same teacher for every section. */
  assignAll(teacherCode: string): void { this.sections.controls.forEach(group => group.patchValue({ teacherCode })); }

  save(): void {
    this.form.markAllAsTouched();
    const value = this.form.getRawValue();
    const name = String(this.custom ? value.customName : value.name).trim();
    if (this.form.invalid || !name) { this.toast.invalidForm(); return; }
    const payload: SubjectPayload = {
      courseCode: value.courseCode, name,
      code: String(value.code || '').trim() || null,
      periodsPerWeek: value.periodsPerWeek ? Number(value.periodsPerWeek) : null,
      optional: !!value.optional,
      sections: this.sections.controls.map(group => ({ batchCode: group.value.batchCode, teacherCode: group.value.teacherCode || null })),
      status: value.status
    };
    this.ref.close(payload);
  }
}

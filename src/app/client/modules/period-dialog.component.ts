import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiBatch, ApiBatchDay, BatchApiService } from '../../core/batch-api.service';
import { ApiSubject } from '../../core/subject-api.service';
import { ApiPeriod, PeriodPayload } from '../../core/timetable-api.service';
import { ToastService } from '../../core/toast.service';

export interface PeriodDialogData {
  period?: ApiPeriod;
  /** Active school sections. */
  batches: ApiBatch[];
  subjects: ApiSubject[];
}

export const PERIOD_DAYS: { value: ApiBatchDay; label: string }[] = [
  { value: 'Mon', label: 'Monday' }, { value: 'Tue', label: 'Tuesday' }, { value: 'Wed', label: 'Wednesday' },
  { value: 'Thu', label: 'Thursday' }, { value: 'Fri', label: 'Friday' }, { value: 'Sat', label: 'Saturday' }
];

/** Add / edit one timetable period. Subjects follow the section's class; the teacher is the subject's teacher for that section. */
@Component({ selector: 'app-period-dialog', templateUrl: './period-dialog.component.html', styleUrls: ['./test-dialog.component.scss'] })
export class PeriodDialogComponent {
  readonly days = PERIOD_DAYS;
  form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: PeriodDialogData, private fb: FormBuilder, private ref: MatDialogRef<PeriodDialogComponent>, private toast: ToastService) {
    const period = data.period;
    this.form = this.fb.group({
      batchCode: [period?.section?.batchCode || '', Validators.required],
      subjectCode: [period?.subject?.subjectCode || '', Validators.required],
      day: [period?.day || 'Mon', Validators.required],
      startTime: [period?.startTime || '', Validators.required],
      endTime: [period?.endTime || '', Validators.required],
      room: [period?.room || '', Validators.maxLength(40)]
    });
  }

  label(batch: ApiBatch): string { return BatchApiService.label(batch); }
  get section(): ApiBatch | undefined { return this.data.batches.find(batch => batch.batchCode === this.form.value.batchCode); }
  /** Active subjects of the section's class (plus the saved one when editing). */
  get subjects(): ApiSubject[] {
    const course = this.section?.course?.courseCode;
    return this.data.subjects.filter(subject => subject.course?.courseCode === course && (subject.status === 'active' || subject.subjectCode === this.data.period?.subject?.subjectCode));
  }
  teacherFor(subject: ApiSubject): string { return subject.sections.find(section => section.batchCode === this.form.value.batchCode)?.teacher?.fullName || 'No teacher yet'; }
  scheduledFor(subject: ApiSubject): string {
    const done = subject.sections.find(section => section.batchCode === this.form.value.batchCode)?.scheduled ?? 0;
    return subject.periodsPerWeek ? `${done} / ${subject.periodsPerWeek} a week` : `${done} a week`;
  }

  sectionChanged(): void { if (!this.subjects.some(subject => subject.subjectCode === this.form.value.subjectCode)) this.form.patchValue({ subjectCode: '' }); }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.toast.invalidForm(); return; }
    const value = this.form.getRawValue();
    if (value.endTime <= value.startTime) { this.toast.error('End time must be after the start time.'); return; }
    const payload: PeriodPayload = { batchCode: value.batchCode, subjectCode: value.subjectCode, day: value.day, startTime: value.startTime, endTime: value.endTime, room: String(value.room || '').trim() || null };
    this.ref.close(payload);
  }
}

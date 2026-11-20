import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiBatch, BatchApiService } from '../../core/batch-api.service';
import { ApiCourse } from '../../core/course-api.service';
import { ApiTeacher } from '../../core/teacher-api.service';
import { ToastService } from '../../core/toast.service';
import { fromApiDay, isoDay } from '../../core/api-client';
import { ApiOnlineClass, MEET_LINK, OnlineClassPayload } from '../../core/online-class-api.service';

export interface OnlineClassDialogData { item?: ApiOnlineClass; batches: ApiBatch[]; courses: ApiCourse[]; teachers: ApiTeacher[]; owner: boolean; school: boolean; }
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Schedule or edit an online class on Google Meet (repeat weekly when scheduling). Closes with the payload. */
@Component({ selector: 'app-online-class-dialog', templateUrl: './online-class-dialog.component.html', styleUrls: ['./online-class-dialog.component.scss'] })
export class OnlineClassDialogComponent {
  readonly days = DAYS;
  readonly today = new Date(new Date().setHours(0, 0, 0, 0));
  readonly form = this.fb.group({
    batchCodes: [[] as string[], Validators.required],
    subject: ['', [Validators.required, Validators.maxLength(60)]],
    topic: ['', [Validators.required, Validators.maxLength(120)]],
    teacherCode: [''],
    date: [null as Date | null, Validators.required],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    meetLink: ['', [Validators.required, Validators.pattern(MEET_LINK)]],
    description: ['', Validators.maxLength(1000)],
    repeat: [false],
    repeatDays: [[] as string[]],
    repeatWeeks: [4]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: OnlineClassDialogData, private fb: FormBuilder, private ref: MatDialogRef<OnlineClassDialogComponent, OnlineClassPayload>, private toast: ToastService) {
    const item = data.item;
    if (item) this.form.patchValue({
      batchCodes: item.batches.map(batch => batch.batchCode), subject: item.subject, topic: item.topic,
      teacherCode: data.teachers.find(teacher => teacher.fullName === item.teacherName)?.teacherCode || '',
      date: fromApiDay(item.date), startTime: item.startTime, endTime: item.endTime, meetLink: item.meetLink || '', description: item.description || ''
    });
  }

  get groupLabel(): string { return this.data.school ? 'Class & section' : 'Batch'; }
  batchLabel(batch: ApiBatch): string { return this.data.school && batch.course ? `${batch.course.name} · ${batch.name}` : BatchApiService.label(batch); }
  /** Subjects of the chosen classes / courses (plus the current one when editing). */
  get subjects(): string[] {
    const codes = this.form.value.batchCodes || [];
    const courseCodes = new Set(this.data.batches.filter(batch => codes.includes(batch.batchCode)).map(batch => batch.course?.courseCode));
    const list = this.data.courses.filter(course => !codes.length || courseCodes.has(course.courseCode)).flatMap(course => course.subjects);
    return [...new Set([...list, ...(this.form.value.subject ? [this.form.value.subject] : [])])].filter(Boolean).sort();
  }
  get minDate(): Date { const saved = this.data.item ? fromApiDay(this.data.item.date) : null; return saved && saved < this.today ? saved : this.today; }
  toggleDay(day: string): void {
    const days = this.form.value.repeatDays || [];
    this.form.patchValue({ repeatDays: days.includes(day) ? days.filter(item => item !== day) : [...days, day] });
  }
  /** Opens a new Google Meet in a new tab; the teacher copies its link back here. */
  createMeet(): void { window.open('https://meet.google.com/new', '_blank', 'noopener'); this.toast.info('A new Google Meet opened in a new tab. Copy its link and paste it here.'); }
  normaliseLink(): void {
    const value = String(this.form.value.meetLink || '').trim();
    const code = value.match(/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
    if (code && !value.startsWith('https://')) this.form.patchValue({ meetLink: `https://meet.google.com/${code[1]}` });
  }

  save(): void {
    this.normaliseLink();
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.toast.invalidForm(); return; }
    const value = this.form.getRawValue();
    if (value.endTime! <= value.startTime!) { this.toast.error('End time must be after the start time.'); return; }
    if (!this.data.item && value.repeat && !(value.repeatDays || []).length) { this.toast.error('Pick the days to repeat on.'); return; }
    if (!this.data.item && isoDay(value.date) < isoDay(this.today)) { this.toast.error('The class date can’t be in the past.'); return; }
    this.ref.close({
      batchCodes: value.batchCodes || [], subject: value.subject!.trim(), topic: value.topic!.trim(),
      ...(this.data.owner ? { teacherCode: value.teacherCode || null } : {}),
      date: isoDay(value.date), startTime: value.startTime!, endTime: value.endTime!, meetLink: value.meetLink!.trim(), description: (value.description || '').trim() || null,
      ...(!this.data.item && value.repeat ? { repeatDays: value.repeatDays || [], repeatWeeks: Number(value.repeatWeeks) || 1 } : {})
    });
  }
}

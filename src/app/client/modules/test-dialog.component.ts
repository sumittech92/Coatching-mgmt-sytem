import { Component, Inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiTest, TestPayload } from '../../core/test-api.service';
import { ApiBatch } from '../../core/batch-api.service';
import { ApiCourse } from '../../core/course-api.service';
import { ToastService } from '../../core/toast.service';
import { COACHING_SUBJECTS, SCHOOL_SUBJECTS, SCHOOL_TERMS } from '../../core/workspace-terms';

export interface TestDialogData {
  school: boolean;
  test?: ApiTest;
  /** Active courses (school: classes) with their subjects. */
  courses: ApiCourse[];
  /** Active batches (school: sections). */
  batches: ApiBatch[];
  /** Owner (principal): may change the admit card settings. */
  owner?: boolean;
}

/** Local calendar date as YYYY-MM-DD (toISOString would shift it a day back in IST). */
const isoDay = (value: unknown): string => {
  const date = value instanceof Date ? value : new Date(String(value));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
/** "2026-10-19T00:00:00Z" from the API -> a local Date on that calendar day. */
const fromApiDay = (value: string): Date => { const [year, month, day] = value.slice(0, 10).split('-').map(Number); return new Date(year, month - 1, day); };

const DEFAULT_INSTRUCTIONS = 'Report 30 minutes before the exam starts.\nBring this admit card to every paper.\nMobile phones and calculators are not allowed in the exam hall.';

/**
 * Coaching: a test for one batch and one subject.
 * School: an exam for a class (all or some sections) with a date sheet — one row per subject.
 */
@Component({ selector: 'app-test-dialog', templateUrl: './test-dialog.component.html', styleUrls: ['./test-dialog.component.scss'] })
export class TestDialogComponent {
  readonly terms = SCHOOL_TERMS;
  form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: TestDialogData, private fb: FormBuilder, private ref: MatDialogRef<TestDialogComponent>, private toast: ToastService) {
    const test = data.test;
    this.form = this.fb.group({
      name: [test?.name || '', [Validators.required, Validators.maxLength(80)]],
      term: [test?.term || (data.school ? SCHOOL_TERMS[0] : '')],
      courseCode: [test?.course?.courseCode || '', data.school ? Validators.required : []],
      batchCodes: [test?.batches.map(batch => batch.batchCode) || []],
      batchCode: [test?.batches[0]?.batchCode || '', data.school ? [] : Validators.required],
      startTime: [test?.startTime || ''],
      endTime: [test?.endTime || ''],
      released: [!!test?.admitCard?.released],
      feeRequired: [test?.admitCard?.feeRequired ?? true],
      instructions: [test?.admitCard?.instructions || DEFAULT_INSTRUCTIONS, Validators.maxLength(1000)],
      papers: this.fb.array((test?.papers.length ? test.papers : [null]).map(paper => this.paperGroup(paper ? { paperId: paper.paperId, subject: paper.subject, date: fromApiDay(paper.date), maxMarks: paper.maxMarks, passMarks: paper.passMarks } : undefined)))
    });
  }

  get school(): boolean { return this.data.school; }
  get papers(): FormArray<FormGroup> { return this.form.get('papers') as FormArray<FormGroup>; }
  /** Sections of the chosen class (school). */
  get sections(): ApiBatch[] { const code = this.form.value.courseCode; return this.data.batches.filter(batch => batch.course?.courseCode === code); }
  /**
   * Section lists for the multi-select. They are cached until the class or the chosen sections change:
   * a new array on every check makes ngModel write again and again, which froze the dialog.
   */
  private sectionCache = { key: '', names: [] as string[] };
  private chosenCache = { key: '', names: [] as string[] };
  get sectionNames(): string[] {
    const key = `${this.form.value.courseCode}|${this.data.batches.length}`;
    if (key !== this.sectionCache.key) this.sectionCache = { key, names: this.sections.map(batch => batch.name) };
    return this.sectionCache.names;
  }
  get chosenSectionNames(): string[] {
    const codes: string[] = this.form.value.batchCodes || [];
    const key = `${this.form.value.courseCode}|${codes.join(',')}`;
    if (key !== this.chosenCache.key) this.chosenCache = { key, names: this.sections.filter(batch => codes.includes(batch.batchCode)).map(batch => batch.name) };
    return this.chosenCache.names;
  }
  /** Subjects of the chosen course / class, falling back to the standard list. */
  get subjects(): string[] {
    const courseCode = this.school ? this.form.value.courseCode : this.data.batches.find(batch => batch.batchCode === this.form.value.batchCode)?.course?.courseCode;
    const own = this.data.courses.find(course => course.courseCode === courseCode)?.subjects || [];
    const used = this.papers.controls.map(group => group.value.subject).filter(Boolean);
    return [...new Set([...own, ...(this.school ? SCHOOL_SUBJECTS : COACHING_SUBJECTS), ...used])];
  }
  batchLabel(batch: ApiBatch): string { return batch.course ? `${batch.name} · ${batch.course.name}` : batch.name; }

  /** Earliest pickable paper date: today, or the saved date when it is earlier (so editing an old exam stays valid). */
  private paperMins = new WeakMap<FormGroup, Date>();
  paperMin(group: FormGroup): Date { return this.paperMins.get(group) ?? TestDialogComponent.today(); }
  private static today(): Date { const today = new Date(); today.setHours(0, 0, 0, 0); return today; }

  private paperGroup(paper?: { paperId?: string; subject?: string; date?: Date; maxMarks?: number; passMarks?: number | null }): FormGroup {
    const group = this.fb.group({
      paperId: [paper?.paperId || ''],
      subject: [paper?.subject || '', Validators.required],
      date: [paper?.date || null, Validators.required],
      maxMarks: [paper?.maxMarks ?? (this.data.school ? 80 : 50), [Validators.required, Validators.min(1), Validators.max(1000)]],
      passMarks: [paper?.passMarks ?? null, [Validators.min(0), Validators.max(1000)]]
    });
    const today = TestDialogComponent.today();
    this.paperMins.set(group, paper?.date && paper.date < today ? paper.date : today);
    return group;
  }

  addPaper(): void { this.papers.push(this.paperGroup()); }
  removePaper(index: number): void { if (this.papers.length > 1) this.papers.removeAt(index); }

  /** Choosing a class with no date sheet yet fills one row per class subject. */
  classChanged(): void {
    this.form.patchValue({ batchCodes: [] });
    const own = this.data.courses.find(course => course.courseCode === this.form.value.courseCode)?.subjects || [];
    const empty = this.papers.controls.every(group => !group.value.subject);
    if (!empty || !own.length) return;
    this.papers.clear();
    own.forEach(subject => this.papers.push(this.paperGroup({ subject })));
  }

  sectionsChanged(names: string[] | string): void {
    const chosen = Array.isArray(names) ? names : String(names || '').split(',').map(name => name.trim()).filter(Boolean);
    this.form.patchValue({ batchCodes: this.sections.filter(batch => chosen.includes(batch.name)).map(batch => batch.batchCode) });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.toast.invalidForm(); return; }
    const value = this.form.getRawValue();
    const papers = this.papers.controls.map(group => group.getRawValue());
    const subjects = papers.map(paper => String(paper.subject).toLowerCase());
    if (new Set(subjects).size !== subjects.length) { this.toast.error('Each subject can appear only once in the date sheet.'); return; }
    const badPass = papers.find(paper => paper.passMarks !== null && paper.passMarks !== '' && Number(paper.passMarks) > Number(paper.maxMarks));
    if (badPass) { this.toast.error(`Pass marks for ${badPass.subject} cannot be more than the maximum marks.`); return; }
    if (this.school && value.startTime && value.endTime && value.endTime <= value.startTime) { this.toast.error('Exam end time must be after the start time.'); return; }
    const payload: TestPayload = {
      name: String(value.name).trim(),
      term: this.school ? value.term || null : null,
      courseCode: this.school ? value.courseCode : null,
      batchCodes: this.school ? value.batchCodes : [value.batchCode],
      papers: papers.map(paper => ({
        ...(paper.paperId ? { paperId: paper.paperId } : {}),
        subject: paper.subject, date: isoDay(paper.date), maxMarks: Number(paper.maxMarks),
        passMarks: paper.passMarks === null || paper.passMarks === '' ? null : Number(paper.passMarks)
      })),
      ...(this.school ? { startTime: value.startTime || null, endTime: value.endTime || null } : {}),
      ...(this.school && this.data.owner ? { admitCard: { released: !!value.released, feeRequired: !!value.feeRequired, instructions: String(value.instructions || '').trim() || null } } : {})
    };
    this.ref.close(payload);
  }
}

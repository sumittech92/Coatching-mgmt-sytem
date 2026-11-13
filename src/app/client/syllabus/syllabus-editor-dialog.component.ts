import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastService } from '../../core/toast.service';
import { ApiSyllabus, SyllabusChapter, SyllabusPayload } from '../../core/syllabus-api.service';
import { SYLLABUS_PRESETS, SyllabusPreset, presetsFor } from '../../core/syllabus-presets';

export interface SyllabusCourseOption { courseCode: string; name: string; subjects: string[]; }
export interface SyllabusEditorData {
  syllabus?: ApiSyllabus;
  courses: SyllabusCourseOption[];
  /** Pre-selected class / course and subject (from a grid cell). */
  courseCode?: string;
  subject?: string;
  owner: boolean;
  school: boolean;
}
interface ChapterRow extends SyllabusChapter { locked: boolean; }

const monthKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/**
 * Add / edit a syllabus: class / course, subject, then chapters (from a starter list, pasted, or typed) with optional
 * target months and weights. Teachers can add chapters and change only the ones they added.
 */
@Component({ selector: 'app-syllabus-editor-dialog', templateUrl: './syllabus-editor-dialog.component.html', styleUrls: ['../modules/test-dialog.component.scss', './syllabus-editor-dialog.component.scss'] })
export class SyllabusEditorDialogComponent {
  courseCode: string;
  subject: string;
  rows: ChapterRow[];
  presetKey = '';
  paste = '';
  /** "Spread target months" helper: first and last month. */
  spreadFrom: string;
  spreadTo: string;
  error = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: SyllabusEditorData, private ref: MatDialogRef<SyllabusEditorDialogComponent>, private toast: ToastService) {
    const syllabus = data.syllabus;
    this.courseCode = syllabus?.course?.courseCode || data.courseCode || (data.courses.length === 1 ? data.courses[0].courseCode : '');
    this.subject = syllabus?.subject || data.subject || '';
    this.rows = (syllabus?.chapters || []).map(chapter => ({ ...chapter, locked: !data.owner && !chapter.mine }));
    // School sessions run April–March; coaching courses default to the next twelve months.
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    this.spreadFrom = data.school ? `${startYear}-04` : monthKey(now);
    this.spreadTo = data.school ? `${startYear + 1}-02` : monthKey(new Date(now.getFullYear(), now.getMonth() + 11, 1));
  }

  get editing(): boolean { return !!this.data.syllabus; }
  get course(): SyllabusCourseOption | undefined { return this.data.courses.find(course => course.courseCode === this.courseCode); }
  get subjects(): string[] { return this.course?.subjects || []; }
  get classWord(): string { return this.data.school ? 'Class' : 'Course'; }
  /** Starter lists for this subject (best class match first); every list when none matches. */
  get presets(): SyllabusPreset[] { const matched = this.subject ? presetsFor(this.subject, this.course?.name) : []; return matched.length ? matched : SYLLABUS_PRESETS; }

  courseChanged(): void { if (!this.subjects.includes(this.subject)) this.subject = ''; }

  private add(titles: string[]): void {
    const existing = new Set(this.rows.map(row => row.title.trim().toLowerCase()));
    const fresh = titles.map(title => title.trim()).filter(title => title && !existing.has(title.toLowerCase()));
    this.rows = [...this.rows, ...fresh.map(title => ({ title, targetMonth: null, weight: 1, locked: false, mine: true }))];
    if (fresh.length) this.toast.success(`${fresh.length} chapter${fresh.length === 1 ? '' : 's'} added.`); else this.toast.info('Those chapters are already in the list.');
  }
  usePreset(): void { const preset = SYLLABUS_PRESETS.find(item => item.key === this.presetKey); if (preset) this.add(preset.chapters); }
  /** One chapter per line; leading numbers like "1." or "Ch 2 -" are removed. */
  addPasted(): void { this.add(this.paste.split(/\r?\n/).map(line => line.replace(/^\s*(ch(apter)?\.?\s*)?\d+[.):\-\s]+/i, ''))); this.paste = ''; }
  addRow(): void { this.rows = [...this.rows, { title: '', targetMonth: null, weight: 1, locked: false, mine: true }]; }
  removeRow(index: number): void { if (!this.rows[index].locked) this.rows = this.rows.filter((_, i) => i !== index); }
  move(index: number, step: number): void {
    const target = index + step;
    if (target < 0 || target >= this.rows.length) return;
    const rows = [...this.rows];
    [rows[index], rows[target]] = [rows[target], rows[index]];
    this.rows = rows;
  }
  /** Spreads target months evenly over the chosen range (editable chapters only). */
  spread(): void {
    if (!this.spreadFrom || !this.spreadTo || this.spreadTo < this.spreadFrom) { this.toast.error('Choose a first and last month (last on or after first).'); return; }
    const [fromYear, fromMonth] = this.spreadFrom.split('-').map(Number);
    const [toYear, toMonth] = this.spreadTo.split('-').map(Number);
    const months = (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;
    const editable = this.rows.filter(row => !row.locked);
    editable.forEach((row, index) => { row.targetMonth = monthKey(new Date(fromYear, fromMonth - 1 + Math.floor((index * months) / Math.max(1, editable.length)), 1)); });
    this.toast.success(`Target months set from ${this.spreadFrom} to ${this.spreadTo}.`);
  }

  save(): void {
    const rows = this.rows.map(row => ({ ...row, title: row.title.trim() }));
    this.error = !this.courseCode ? `Choose the ${this.classWord.toLowerCase()}.`
      : !this.subject ? 'Choose the subject.'
      : !rows.length ? 'Add at least one chapter.'
      : rows.some(row => !row.title) ? 'Every chapter needs a name (or remove the empty row).'
      : rows.some(row => row.title.length > 150) ? 'Chapter names can be up to 150 characters.'
      : rows.some(row => !(Number(row.weight) >= 1 && Number(row.weight) <= 100)) ? 'Weight must be 1 – 100.' : '';
    if (this.error) return;
    const payload: SyllabusPayload = {
      courseCode: this.courseCode, subject: this.subject,
      chapters: rows.map(row => ({ ...(row.chapterId ? { chapterId: row.chapterId } : {}), title: row.title, targetMonth: row.targetMonth || null, weight: Number(row.weight) || 1 }))
    };
    this.ref.close(payload);
  }
}

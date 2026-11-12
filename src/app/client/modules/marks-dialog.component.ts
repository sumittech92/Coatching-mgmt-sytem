import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiMarkSheet, ApiTest, TestApiService } from '../../core/test-api.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { ToastService } from '../../core/toast.service';

export interface MarksDialogData { test: ApiTest; }

interface MarkRow { studentCode: string; name: string; rollNo: string | null; group: string; marks: number | null; absent: boolean; remarks: string; }

/** Marks sheet for one subject of a test: every student of the batch / class, marks or absent, saved together. */
@Component({ selector: 'app-marks-dialog', templateUrl: './marks-dialog.component.html', styleUrls: ['./test-dialog.component.scss', './marks-dialog.component.scss'] })
export class MarksDialogComponent {
  paperId: string;
  sheet?: ApiMarkSheet;
  rows: MarkRow[] = [];
  loading = false;
  saving = false;
  /** True once anything was saved, so the list behind refreshes its counts. */
  private changed = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: MarksDialogData, private api: TestApiService, private auth: MockAuthService, private toast: ToastService, private ref: MatDialogRef<MarksDialogComponent, boolean>) {
    const papers = data.test.papers;
    this.paperId = (papers.find(paper => paper.canEnterMarks) || papers[0]).paperId;
    this.load();
  }

  get school(): boolean { return this.data.test.workType === 'school'; }
  get groupLabel(): string {
    const test = this.data.test;
    const groups = test.batches.map(batch => batch.name).join(', ');
    return [test.course?.name, groups || (this.school ? 'All sections' : '')].filter(Boolean).join(' · ');
  }
  get maxMarks(): number { return this.sheet?.paper.maxMarks || 0; }
  get entered(): number { return this.rows.filter(row => row.absent || row.marks !== null).length; }
  get average(): string {
    const marks = this.rows.filter(row => !row.absent && row.marks !== null).map(row => Number(row.marks));
    return marks.length ? (marks.reduce((sum, value) => sum + value, 0) / marks.length).toFixed(1) : '—';
  }
  get highest(): string { const marks = this.rows.filter(row => !row.absent && row.marks !== null).map(row => Number(row.marks)); return marks.length ? String(Math.max(...marks)) : '—'; }
  invalid(row: MarkRow): boolean { return !row.absent && row.marks !== null && (Number(row.marks) < 0 || Number(row.marks) > this.maxMarks); }

  load(): void {
    this.loading = true;
    this.api.marks(this.auth.token!, this.data.test.testCode, this.paperId).subscribe({
      next: sheet => { this.loading = false; this.apply(sheet); },
      error: (error: Error) => { this.loading = false; this.toast.error(error.message); }
    });
  }

  private apply(sheet: ApiMarkSheet): void {
    this.sheet = sheet;
    this.rows = sheet.students.map(student => ({
      studentCode: student.studentCode, name: student.fullName || 'Unnamed student', rollNo: student.rollNo,
      group: this.school ? `${student.course} · ${student.batch}` : student.batch, marks: student.marks, absent: student.absent, remarks: student.remarks || ''
    }));
  }

  markAbsent(row: MarkRow): void { if (row.absent) row.marks = null; }
  marksChanged(row: MarkRow, value: string | number | null): void { row.marks = value === '' || value === null ? null : Number(value); if (row.marks !== null) row.absent = false; }

  save(close: boolean): void {
    if (this.saving || !this.sheet?.editable) return;
    const bad = this.rows.find(row => this.invalid(row));
    if (bad) { this.toast.error(`${bad.name}: marks must be between 0 and ${this.maxMarks}.`); return; }
    this.saving = true;
    const entries = this.rows.map(row => ({ studentCode: row.studentCode, marks: row.absent ? null : row.marks, absent: row.absent, remarks: row.remarks.trim() || null }));
    this.api.saveMarks(this.auth.token!, this.data.test.testCode, this.paperId, entries).subscribe({
      next: sheet => {
        this.saving = false; this.changed = true; this.apply(sheet);
        this.toast.success(`Marks saved for ${sheet.paper.subject} (${this.entered} of ${this.rows.length} entered).`);
        if (close) this.ref.close(true);
      },
      error: (error: Error) => { this.saving = false; this.toast.error(error.message); }
    });
  }

  close(): void { this.ref.close(this.changed); }
}

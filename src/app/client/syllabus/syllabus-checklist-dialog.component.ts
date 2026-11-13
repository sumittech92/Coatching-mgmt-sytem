import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MockAuthService } from '../../core/mock-auth.service';
import { ToastService } from '../../core/toast.service';
import { ApiSyllabusDetail, SyllabusApiService } from '../../core/syllabus-api.service';

export interface SyllabusChecklistData { code: string; /** Section / batch to open on (defaults to the first). */ batchCode?: string; }

const today = (): string => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; };

/** Tick chapters a section / batch has finished (with the date), and see its % against the target months. */
@Component({ selector: 'app-syllabus-checklist-dialog', templateUrl: './syllabus-checklist-dialog.component.html', styleUrls: ['../modules/test-dialog.component.scss', './syllabus-checklist-dialog.component.scss'] })
export class SyllabusChecklistDialogComponent implements OnInit {
  detail?: ApiSyllabusDetail;
  batchCode = '';
  loading = true;
  saving = '';
  /** Set when anything changed, so the page reloads its grid. */
  changed = false;
  readonly maxDate = today();

  constructor(@Inject(MAT_DIALOG_DATA) public data: SyllabusChecklistData, private api: SyllabusApiService, private auth: MockAuthService, private toast: ToastService) {}

  ngOnInit(): void {
    this.api.detail(this.auth.token!, this.data.code).subscribe({
      next: detail => {
        this.loading = false;
        this.detail = detail;
        this.batchCode = detail.batches.some(batch => batch.batchCode === this.data.batchCode) ? this.data.batchCode! : detail.batches[0]?.batchCode || '';
      },
      error: (error: Error) => { this.loading = false; this.toast.error(error.message); }
    });
  }

  get batch() { return this.detail?.batches.find(item => item.batchCode === this.batchCode); }
  completedOn(chapterId?: string): string { return chapterId ? (this.batch?.completed[chapterId] || '').slice(0, 10) : ''; }
  /** "Overdue" when the chapter's target month has passed and it isn't done. */
  overdue(targetMonth: string | null, chapterId?: string): boolean { return !!targetMonth && !this.completedOn(chapterId) && targetMonth < today().slice(0, 7); }
  monthLabel(month: string | null): string {
    if (!month) return '';
    const [year, value] = month.split('-').map(Number);
    return new Date(year, value - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }

  /** Tick / untick (done = today), or move a ticked chapter's date. */
  toggle(chapterId: string | undefined, done: boolean, completedOn?: string): void {
    const batch = this.batch;
    if (!chapterId || !batch || this.saving) return;
    if (completedOn && completedOn > this.maxDate) { this.toast.error('Completion date cannot be in the future.'); return; }
    this.saving = chapterId;
    this.api.mark(this.auth.token!, this.data.code, { batchCode: batch.batchCode, chapterId, done, completedOn: done ? (completedOn || today()) : null }).subscribe({
      next: result => {
        this.saving = '';
        this.changed = true;
        if (done) batch.completed[chapterId] = completedOn || today(); else delete batch.completed[chapterId];
        Object.assign(batch, { percent: result.percent, expected: result.expected, status: result.status, done: result.done, total: result.total });
      },
      error: (error: Error) => { this.saving = ''; this.toast.error(error.message); }
    });
  }

  tone(status: string): 'success' | 'danger' | 'neutral' | 'info' { return status === 'On track' ? 'success' : status === 'Behind' ? 'danger' : status === 'No targets' ? 'info' : 'neutral'; }
}

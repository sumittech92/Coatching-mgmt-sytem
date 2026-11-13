import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MockAuthService } from '../../core/mock-auth.service';
import { ToastService } from '../../core/toast.service';
import { ApiTaskSubmissionRow, TaskApiService } from '../../core/task-api.service';
import { dayLabel } from '../../core/api-client';

export interface SubmissionsDialogData { taskCode: string; title: string; group: string; }

/** Teacher: who submitted an assignment, their files, and marking each one checked (with an optional remark). */
@Component({ selector: 'app-submissions-dialog', templateUrl: './submissions-dialog.component.html', styleUrls: ['./test-dialog.component.scss'] })
export class SubmissionsDialogComponent implements OnInit {
  rows: ApiTaskSubmissionRow[] = [];
  loading = true;
  /** Remarks being typed, per student. */
  remarks: Record<string, string> = {};
  /** Set when anything changed, so the page can refresh its counts. */
  changed = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: SubmissionsDialogData, private api: TaskApiService, private auth: MockAuthService, private toast: ToastService) {}

  ngOnInit(): void {
    this.api.submissions(this.auth.token!, this.data.taskCode).subscribe({
      next: result => {
        this.loading = false;
        // Submitted work first, then students still to submit.
        this.rows = [...result.students].sort((a, b) => Number(!!b.submission) - Number(!!a.submission));
        this.rows.forEach(row => this.remarks[row.studentCode] = row.submission?.remark || '');
      },
      error: (error: Error) => { this.loading = false; this.toast.error(error.message); }
    });
  }

  get submittedCount(): number { return this.rows.filter(row => row.submission).length; }
  get checkedCount(): number { return this.rows.filter(row => row.submission?.status === 'checked').length; }
  when(value: string): string { return dayLabel(value); }

  /** Saves an edited remark when the field loses focus (keeps the checked state). */
  saveRemark(row: ApiTaskSubmissionRow): void {
    const remark = this.remarks[row.studentCode]?.trim() || null;
    if (!row.submission || remark === (row.submission.remark || null)) return;
    this.api.review(this.auth.token!, this.data.taskCode, row.studentCode, { checked: row.submission.status === 'checked', remark }).subscribe({
      next: saved => { row.submission = { ...row.submission!, remark: saved.remark }; this.changed = true; this.toast.success(`Remark saved for ${row.fullName}.`); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }

  setChecked(row: ApiTaskSubmissionRow, checked: boolean): void {
    const remark = this.remarks[row.studentCode]?.trim() || null;
    this.api.review(this.auth.token!, this.data.taskCode, row.studentCode, { checked, remark }).subscribe({
      next: saved => {
        row.submission = { ...row.submission!, status: saved.status as 'submitted' | 'checked', remark: saved.remark };
        this.changed = true;
        this.toast.success(checked ? `${row.fullName}'s work marked checked.` : `${row.fullName}'s work moved back to submitted.`);
      },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
}

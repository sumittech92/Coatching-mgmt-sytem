import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiApplicant, ApiCandidateResult, ApiEntrance, ApiEntranceCandidate, CANDIDATE_RESULT_LABELS, EntranceApiService } from '../../core/entrance-api.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { ToastService } from '../../core/toast.service';
import { normalizeMobile } from '../../core/app-validators';

interface CandidateRow { rollNo: string | null; enquiryCode: string | null; studentName: string; parentName: string; phoneNumber: string; marks: number | null; remarks: string; }

/** Candidates of one entrance test: add applicants from Admissions (same class) or by hand, enter marks, see the result. */
@Component({ selector: 'app-entrance-candidates-dialog', templateUrl: './entrance-candidates-dialog.component.html', styleUrls: ['./entrance-candidates-dialog.component.scss'] })
export class EntranceCandidatesDialogComponent implements OnInit {
  rows: CandidateRow[];
  applicants: ApiApplicant[] = [];
  applicantCode = '';
  loadingApplicants = false;
  saving = false;
  readonly resultLabels = CANDIDATE_RESULT_LABELS;

  constructor(@Inject(MAT_DIALOG_DATA) public test: ApiEntrance, private ref: MatDialogRef<EntranceCandidatesDialogComponent, ApiEntrance>, private api: EntranceApiService, private auth: MockAuthService, private toast: ToastService) {
    this.rows = test.candidates.map(candidate => ({ rollNo: candidate.rollNo || null, enquiryCode: candidate.enquiryCode, studentName: candidate.studentName, parentName: candidate.parentName || '', phoneNumber: candidate.phoneNumber || '', marks: candidate.marks, remarks: candidate.remarks || '' }));
  }

  ngOnInit(): void {
    const token = this.auth.token;
    if (!token) return;
    this.loadingApplicants = true;
    this.api.applicants(token, this.test.className).subscribe({
      next: list => { this.loadingApplicants = false; this.applicants = list; },
      error: () => this.loadingApplicants = false
    });
  }

  /** Applicants of this class not added yet. */
  get available(): ApiApplicant[] { return this.applicants.filter(item => !this.rows.some(row => row.enquiryCode === item.enquiryCode)); }
  get qualified(): number { return this.rows.filter(row => this.result(row) === 'qualified').length; }
  get marked(): number { return this.rows.filter(row => row.marks !== null && row.marks !== undefined && String(row.marks) !== '').length; }

  get school(): boolean { return this.test.workType !== 'coaching'; }
  /** Live rank by marks (ties share a rank); blank until marks are entered. */
  rank(row: CandidateRow): number | null {
    if (!this.hasMarks(row)) return null;
    const scores = this.rows.filter(item => this.hasMarks(item)).map(item => Number(item.marks)).sort((a, b) => b - a);
    return scores.indexOf(Number(row.marks)) + 1;
  }
  private hasMarks(row: CandidateRow): boolean { return row.marks !== null && row.marks !== undefined && String(row.marks) !== ''; }
  result(row: CandidateRow): ApiCandidateResult {
    if (row.marks === null || row.marks === undefined || String(row.marks) === '') return 'pending';
    return Number(row.marks) >= this.test.passMarks ? 'qualified' : 'notQualified';
  }
  addApplicant(): void {
    const applicant = this.available.find(item => item.enquiryCode === this.applicantCode);
    if (!applicant) return;
    this.rows.push({ rollNo: null, enquiryCode: applicant.enquiryCode, studentName: applicant.studentName, parentName: applicant.parentName || '', phoneNumber: normalizeMobile(applicant.phoneNumber || '').slice(-10), marks: null, remarks: '' });
    this.applicantCode = '';
  }
  addAll(): void { this.available.forEach(item => { this.applicantCode = item.enquiryCode; this.addApplicant(); }); }
  addManual(): void { this.rows.push({ rollNo: null, enquiryCode: null, studentName: '', parentName: '', phoneNumber: '', marks: null, remarks: '' }); }
  remove(index: number): void { this.rows.splice(index, 1); }

  /** First problem with the list, or '' when it can be saved. */
  private problem(): string {
    for (const [index, row] of this.rows.entries()) {
      const name = row.studentName.trim() || `Row ${index + 1}`;
      if (!row.studentName.trim()) return `Enter the student name in row ${index + 1}.`;
      if (row.phoneNumber && !/^\d{10}$/.test(normalizeMobile(row.phoneNumber))) return `${name}: enter a valid 10-digit mobile number.`;
      const marks = row.marks;
      if (marks !== null && marks !== undefined && String(marks) !== '' && (Number(marks) < 0 || Number(marks) > this.test.maxMarks || Number.isNaN(Number(marks)))) return `${name}: marks must be between 0 and ${this.test.maxMarks}.`;
    }
    return '';
  }

  save(): void {
    const token = this.auth.token;
    const problem = this.problem();
    if (problem) { this.toast.error(problem); return; }
    if (!token || this.saving) return;
    const candidates: ApiEntranceCandidate[] = this.rows.map(row => ({
      rollNo: row.rollNo,
      enquiryCode: row.enquiryCode, studentName: row.studentName.trim(), parentName: row.parentName.trim() || null,
      phoneNumber: row.phoneNumber ? normalizeMobile(row.phoneNumber) : null,
      marks: row.marks === null || row.marks === undefined || String(row.marks) === '' ? null : Number(row.marks), remarks: row.remarks.trim() || null
    }));
    this.saving = true;
    this.api.saveCandidates(token, this.test.entranceCode, candidates).subscribe({
      next: saved => { this.saving = false; this.ref.close(saved); },
      error: (error: Error) => { this.saving = false; this.toast.error(error.message); }
    });
  }
}

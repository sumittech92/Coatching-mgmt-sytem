import { Injectable } from '@angular/core';

export type FeeSubmissionStatus = 'Pending verification' | 'Approved' | 'Rejected';
export interface FeeSubmission {
  id: number;
  workspace: string;
  studentId: string;
  student: string;
  period: string;
  amount: number;
  mode: string;
  reference: string;
  proof: string;
  note: string;
  submittedBy: string;
  submittedOn: string;
  status: FeeSubmissionStatus;
  reviewNote?: string;
}

const STORAGE_KEY = 'demo-fee-submissions';

/** Fee payments a student or parent submits from the portal; the office verifies them on the Fees page. Kept in browser storage so the demo survives switching logins. */
@Injectable({ providedIn: 'root' })
export class FeeSubmissionService {
  private items: FeeSubmission[] = this.load();

  forWorkspace(workspace: string): FeeSubmission[] { return this.items.filter(item => item.workspace === workspace); }
  forStudent(workspace: string, studentId: string): FeeSubmission[] { return this.forWorkspace(workspace).filter(item => item.studentId === studentId); }
  pending(workspace: string): FeeSubmission[] { return this.forWorkspace(workspace).filter(item => item.status === 'Pending verification'); }

  submit(entry: Omit<FeeSubmission, 'id' | 'submittedOn' | 'status'>): FeeSubmission {
    const submission: FeeSubmission = { ...entry, id: Date.now(), submittedOn: FeeSubmissionService.today(), status: 'Pending verification' };
    this.items.unshift(submission);
    this.save();
    return submission;
  }

  review(id: number, status: 'Approved' | 'Rejected', reviewNote = ''): FeeSubmission | undefined {
    const item = this.items.find(entry => entry.id === id);
    if (!item) return undefined;
    item.status = status;
    item.reviewNote = reviewNote;
    this.save();
    return item;
  }

  static today(): string { return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }

  private load(): FeeSubmission[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  }
  private save(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items)); } catch { /* storage unavailable: keep in memory */ }
  }
}

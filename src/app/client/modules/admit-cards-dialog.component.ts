import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ADMIT_STATUS_LABELS, AdmitCard, AdmitStatus, ApiAdmitList, ApiAdmitStudent, ApiTest, TestApiService } from '../../core/test-api.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { ToastService } from '../../core/toast.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { WebsiteContentService } from '../../core/website-content.service';
import { BatchApiService } from '../../core/batch-api.service';
import { AdmitCardPrintComponent, AdmitCardPrintData } from '../../shared/ui/admit-card/admit-card-print.component';

export interface AdmitCardsDialogData { test: ApiTest; }

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';
const TONES: Record<AdmitStatus, Tone> = { eligible: 'success', allowed: 'info', fee_pending: 'danger', not_released: 'neutral', cancelled: 'danger' };

/**
 * Admit cards of one school exam. The owner (principal) sees every student and can let a fee-pending student download;
 * a class teacher sees their sections. Both print cards for any of their students (one, selected or all) and set
 * the optional subjects each student takes. Every print is logged.
 */
@Component({ selector: 'app-admit-cards-dialog', templateUrl: './admit-cards-dialog.component.html', styleUrls: ['./test-dialog.component.scss', './marks-dialog.component.scss', './admit-cards-dialog.component.scss'] })
export class AdmitCardsDialogComponent {
  list?: ApiAdmitList;
  loading = false;
  busy = false;
  search = '';
  filter: '' | AdmitStatus | 'downloaded' | 'not_downloaded' = '';
  readonly selected = new Set<string>();
  /** Optional subjects being edited, per student (saved when the picker closes). */
  readonly picks = new Map<string, string[]>();
  readonly labels = ADMIT_STATUS_LABELS;

  constructor(@Inject(MAT_DIALOG_DATA) public data: AdmitCardsDialogData, private api: TestApiService, private auth: MockAuthService, private toast: ToastService,
    private dialog: MatDialog, private tenant: TenantContextService, private content: WebsiteContentService, private ref: MatDialogRef<AdmitCardsDialogComponent>) {
    this.load();
  }

  get students(): ApiAdmitStudent[] { return this.list?.students || []; }
  get filtered(): ApiAdmitStudent[] {
    const query = this.search.trim().toLowerCase();
    return this.students.filter(student =>
      (!query || [student.fullName, student.studentCode, student.rollNumber, student.section].join(' ').toLowerCase().includes(query))
      && (!this.filter || (this.filter === 'downloaded' ? student.downloads > 0 : this.filter === 'not_downloaded' ? !student.downloads : student.status === this.filter)));
  }
  get counts() {
    const students = this.students;
    return {
      total: students.length,
      can: students.filter(student => student.status === 'eligible' || student.status === 'allowed').length,
      pending: students.filter(student => student.status === 'fee_pending').length,
      downloaded: students.filter(student => student.downloads > 0).length
    };
  }
  get timeLabel(): string {
    const list = this.list;
    return list?.startTime ? `${BatchApiService.clock(list.startTime)}${list.endTime ? ` – ${BatchApiService.clock(list.endTime)}` : ''}` : 'Time not set';
  }
  get allShownSelected(): boolean { return this.filtered.length > 0 && this.filtered.every(student => this.selected.has(student.studentCode)); }

  tone(status: AdmitStatus): Tone { return TONES[status]; }
  roleLabel(role: string): string { return role === 'student' ? 'student' : role; }

  load(): void {
    this.loading = true;
    this.api.admitCards(this.auth.token!, this.data.test.testCode).subscribe({
      next: list => { this.loading = false; this.apply(list); },
      error: (error: Error) => { this.loading = false; this.toast.error(error.message); this.ref.close(); }
    });
  }

  private apply(list: ApiAdmitList): void {
    this.list = list;
    this.picks.clear();
    list.students.forEach(student => this.picks.set(student.studentCode, [...student.optionalSubjects]));
    const codes = new Set(list.students.map(student => student.studentCode));
    [...this.selected].forEach(code => { if (!codes.has(code)) this.selected.delete(code); });
  }

  toggle(code: string, on: boolean): void { if (on) this.selected.add(code); else this.selected.delete(code); }
  toggleAll(on: boolean): void { this.filtered.forEach(student => this.toggle(student.studentCode, on)); }

  /** Owner: let a fee-pending student download their own card, or take that back. */
  allow(student: ApiAdmitStudent, allowed: boolean): void {
    if (this.busy) return;
    this.busy = true;
    this.api.allowAdmitCard(this.auth.token!, this.data.test.testCode, student.studentCode, allowed).subscribe({
      next: list => { this.busy = false; this.apply(list); this.toast.success(allowed ? `${student.fullName} can now download the admit card.` : `${student.fullName} needs to clear fees again to download.`); },
      error: (error: Error) => { this.busy = false; this.toast.error(error.message); }
    });
  }

  /** Saves the optional subjects when the picker closes, if they changed. */
  subjectsClosed(student: ApiAdmitStudent, open: boolean): void {
    if (open) return;
    const chosen = this.picks.get(student.studentCode) || [];
    if ([...chosen].sort().join('|') === [...student.optionalSubjects].sort().join('|')) return;
    this.busy = true;
    this.api.setOptionalSubjects(this.auth.token!, this.data.test.testCode, student.studentCode, chosen).subscribe({
      next: list => { this.busy = false; this.apply(list); this.toast.success(`Optional subjects saved for ${student.fullName}.`); },
      error: (error: Error) => { this.busy = false; this.picks.set(student.studentCode, [...student.optionalSubjects]); this.toast.error(error.message); }
    });
  }

  printOne(student: ApiAdmitStudent): void { this.print([student.studentCode]); }
  printSelected(): void { this.print([...this.selected]); }
  printAll(): void { this.print(this.filtered.map(student => student.studentCode)); }

  private print(codes: string[]): void {
    if (!codes.length || this.busy) return;
    this.busy = true;
    this.api.downloadAdmitCards(this.auth.token!, this.data.test.testCode, codes).subscribe({
      next: cards => { this.busy = false; this.openPrint(cards); this.load(); },
      error: (error: Error) => { this.busy = false; this.toast.error(error.message); }
    });
  }

  private openPrint(cards: AdmitCard[]): void {
    const profile = this.content.profile;
    const data: AdmitCardPrintData = {
      cards, institution: profile.settings['name'] || this.tenant.current.businessName, logo: this.content.customLogo,
      address: profile.settings['address'] || profile.contact['address'], registration: WebsiteContentService.registrationLine(profile, true)
    };
    this.dialog.open(AdmitCardPrintComponent, { width: '860px', maxWidth: 'calc(100vw - 24px)', data });
  }
}

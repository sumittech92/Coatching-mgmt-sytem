import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RecordDialogComponent, RecordField } from './management/record-dialog.component';
import { ConfirmationDialogService } from '../core/confirmation-dialog.service';
import { MockDataService } from '../core/mock-data.service';
import { TenantContextService } from '../core/tenant-context.service';
import { ToastService } from '../core/toast.service';
import { FeeSubmission, FeeSubmissionService } from '../core/fee-submission.service';
import { WhatsAppService } from '../core/whatsapp.service';
import { FeeReminderDialogComponent, ReminderRow } from './fee-reminder-dialog.component';
import { WebsiteContentService } from '../core/website-content.service';
import { MockAuthService } from '../core/mock-auth.service';
import { ApiFee, ApiFeeSummary, FeeApiService } from '../core/fee-api.service';
import { ApiStudentSummary, StudentApiService } from '../core/student-api.service';
interface FeeRecord { id: number | string; receiptNo?: string; phone?: string; studentId: string; student: string; month: string; total: number; discount: number; paid: number; due: number; date: string; mode: string; status: 'Paid'|'Partial'|'Pending'|'Overdue'; }
@Component({ selector: 'app-receipt-preview', template: '<div class="receipt-wrap"><div class="receipt-brand"><span class="receipt-logo"><img *ngIf="data.logo; else initial" [src]="data.logo" alt=""><ng-template #initial>{{(data.institution || "E").charAt(0)}}</ng-template></span><div><strong>{{data.institution}}</strong><small *ngIf="data.address">{{data.address}}</small><small *ngIf="data.registration">{{data.registration}}</small></div></div><div class="receipt-kind">PAYMENT RECEIPT</div><div class="receipt-success"><mat-icon>check_circle</mat-icon><strong>Payment received</strong></div><div class="receipt-total">₹{{data.paid | number}}</div><p class="receipt-muted">Receipt no. {{data.receiptNo}}</p><mat-divider></mat-divider><div class="receipt-line"><span>Student</span><strong>{{data.student}}</strong></div><div class="receipt-line"><span>Student ID</span><strong>{{data.studentId}}</strong></div><div class="receipt-line"><span>Fee period</span><strong>{{data.month}}</strong></div><div class="receipt-line"><span>Payment date</span><strong>{{data.date}}</strong></div><div class="receipt-line"><span>Payment method</span><strong>{{data.mode}}</strong></div><div class="receipt-line"><span>Discount</span><strong>₹{{data.discount | number}}</strong></div><div class="receipt-line total-line"><span>Amount paid</span><strong>₹{{data.paid | number}}</strong></div><p class="receipt-footer">Thank you for your payment.</p><div class="receipt-wa" *ngIf="data.phone !== undefined"><span *ngIf="sentOn">Sent on WhatsApp · {{sentOn}}</span><span *ngIf="!sentOn && !validPhone" class="bad">No valid mobile number for this student</span></div><div class="receipt-actions"><button mat-stroked-button mat-dialog-close>Close</button><button mat-stroked-button (click)="print()"><mat-icon>print</mat-icon> Print</button><button mat-flat-button class="wa-button" *ngIf="data.phone !== undefined" [disabled]="!validPhone" (click)="sendWhatsApp()"><mat-icon>chat</mat-icon> {{sentOn ? "Send again" : "Send on WhatsApp"}}</button></div></div>', styles: [':host{display:block}.receipt-wrap{padding:26px;min-width:min(400px,80vw);color:#29374a}.receipt-brand{display:flex;align-items:center;gap:12px;border-bottom:1px solid #edf0f3;padding-bottom:15px}.receipt-logo{flex:none;width:48px;height:48px;border-radius:12px;background:#272f62;color:#fff;display:grid;place-items:center;font:700 22px Georgia,serif;overflow:hidden}.receipt-logo img{width:100%;height:100%;object-fit:contain;background:#fff}.receipt-brand strong{display:block;color:#272f62;font-size:16px}.receipt-brand small{display:block;color:#7f8593;font-size:12px;line-height:1.4;margin-top:2px}.receipt-kind{margin:14px 0 0;text-align:center;font-size:12px;letter-spacing:.14em;color:#858c9c}.receipt-success{text-align:center;display:flex;align-items:center;justify-content:center;gap:7px;color:#4166ce;font-size:clamp(12px, 11.648px + 0.0939vw, 13px);margin-top:25px}.receipt-total{text-align:center;font-size:clamp(24px, 21.183px + 0.7512vw, 32px);font-weight:750;margin-top:10px}.receipt-muted{text-align:center;font-size:12px;color:#929daa;margin:4px 0 18px}.receipt-line{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f2f4;font-size:12px}.receipt-line span{color:#8491a0}.receipt-line strong{color:#3a485b}.total-line{border:0;font-weight:700;padding-top:15px}.total-line strong{color:#4770e3}.receipt-footer{text-align:center;color:#8a96a3;font-size:12px;margin:15px 0}.receipt-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;flex-wrap:wrap}.wa-button{background:#1fa855!important;color:#fff!important}.wa-button[disabled]{opacity:.5}.receipt-wa{text-align:right;font-size:12px;color:#1f8a4c;margin-top:8px}.receipt-wa .bad{color:#b5443d}.receipt-actions button{font-size:12px}@media print{body *{visibility:hidden!important}.receipt-wrap,.receipt-wrap *{visibility:visible!important}.receipt-wrap{position:absolute;left:0;top:0;width:100%;box-shadow:none!important}}'] })
export class ReceiptPreviewComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: FeeRecord & { receiptNo: string; institution: string; phone?: string; workspace?: string; logo?: string | null; address?: string; registration?: string }, private ref: MatDialogRef<ReceiptPreviewComponent>, private whatsapp: WhatsAppService, private toast: ToastService) {}
  get key(): string { return `${this.data.workspace}:${this.data.receiptNo}:${this.data.paid}`; }
  get validPhone(): boolean { return !!WhatsAppService.mobile(this.data.phone); }
  get sentOn(): string { const entry = this.whatsapp.lastSent('receipt', this.key); return entry ? WhatsAppService.when(entry) : ''; }
  print(): void { window.print(); }
  sendWhatsApp(): void {
    if (!this.whatsapp.send('receipt', this.key, this.data.phone, this.whatsapp.receiptText(this.data))) { this.toast.error(`${this.data.student} has no valid mobile number. Update it on the Students page.`); return; }
    this.toast.success(`WhatsApp opened with ${this.data.student}'s receipt. Tap Send in WhatsApp.`);
  }
}
@Component({ selector: 'app-fees-page', templateUrl: './fees-page.component.html', styleUrls: ['./fees-page.component.scss'] })
export class FeesPageComponent implements OnInit {
  search = ''; statusFilter = ''; monthFilter = ''; studentFilter = '';
  private readonly coachingRecords: FeeRecord[] = [
    { id: 1, studentId: 'NS-2401', student: 'Aarav Sharma', month: 'September 2026', total: 4000, discount: 0, paid: 2000, due: 2000, date: '02 Sep 2026', mode: 'UPI', status: 'Partial' },
    { id: 2, studentId: 'NS-2402', student: 'Meera Kapoor', month: 'September 2026', total: 4000, discount: 0, paid: 2000, due: 2000, date: '—', mode: '—', status: 'Partial' },
    { id: 3, studentId: 'NS-2403', student: 'Rohan Verma', month: 'September 2026', total: 4500, discount: 0, paid: 0, due: 4500, date: '—', mode: '—', status: 'Overdue' },
    { id: 4, studentId: 'NS-2404', student: 'Diya Iyer', month: 'September 2026', total: 3200, discount: 200, paid: 3000, due: 0, date: '27 Sep 2026', mode: 'Cash', status: 'Paid' },
    { id: 5, studentId: 'NS-2405', student: 'Kabir Singh', month: 'September 2026', total: 3500, discount: 0, paid: 0, due: 3500, date: '—', mode: '—', status: 'Pending' },
    { id: 6, studentId: 'NS-2402', student: 'Meera Kapoor', month: 'August 2026', total: 4000, discount: 0, paid: 4000, due: 0, date: '08 Aug 2026', mode: 'Bank Transfer', status: 'Paid' }
  ];
  detailStudent?: string;
  /** Live (API) state: used when signed in with a real account. */
  loading = false; liveRecords: FeeRecord[] = []; liveSummary?: ApiFeeSummary; apiStudents: ApiStudentSummary[] = [];
  private readonly baseFields: RecordField[] = [
    { key: 'student', label: 'Students', type: 'multiselect', options: ['Aarav Sharma', 'Meera Kapoor', 'Rohan Verma', 'Diya Iyer', 'Kabir Singh'], required: true },
    { key: 'month', label: 'Fee month', type: 'select', options: ['September 2026', 'October 2026', 'August 2026'], required: true },
    { key: 'amount', label: 'Amount received (₹)', type: 'number', required: true },
    { key: 'discount', label: 'Discount (₹)', type: 'number' },
    { key: 'mode', label: 'Payment mode', type: 'select', options: ['Cash', 'UPI', 'Card', 'Bank Transfer'], required: true },
    { key: 'date', label: 'Payment date', type: 'date', required: true },
    { key: 'notes', label: 'Notes', type: 'textarea' }
  ];
  private readonly schoolRecords: FeeRecord[] = [
    { id: 21, studentId: 'GPS-2601', student: 'Ishita Rao', month: 'Term 1 · 2026–27', total: 18500, discount: 0, paid: 18500, due: 0, date: '08 Apr 2026', mode: 'Bank Transfer', status: 'Paid' },
    { id: 22, studentId: 'GPS-2602', student: 'Aditya Menon', month: 'Term 1 · 2026–27', total: 19500, discount: 1500, paid: 9000, due: 9000, date: '12 Apr 2026', mode: 'UPI', status: 'Partial' },
    { id: 23, studentId: 'GPS-2603', student: 'Sana Ahmed', month: 'Term 1 · 2026–27', total: 15000, discount: 0, paid: 0, due: 15000, date: '—', mode: '—', status: 'Overdue' },
    { id: 24, studentId: 'GPS-2604', student: 'Rohan Das', month: 'Term 1 · 2026–27', total: 22000, discount: 0, paid: 22000, due: 0, date: '05 Apr 2026', mode: 'Cheque', status: 'Paid' },
    { id: 25, studentId: 'GPS-2605', student: 'Anika Sharma', month: 'Term 1 · 2026–27', total: 13500, discount: 0, paid: 13500, due: 0, date: '10 Apr 2026', mode: 'Cash', status: 'Paid' },
    { id: 26, studentId: 'GPS-2601', student: 'Ishita Rao', month: 'Term 2 · 2026–27', total: 18500, discount: 0, paid: 0, due: 18500, date: '—', mode: '—', status: 'Pending' }
  ];
  constructor(public router: Router, private route: ActivatedRoute, private dialog: MatDialog, private confirm: ConfirmationDialogService, private tenant: TenantContextService, private studentData: MockDataService, private toast: ToastService, private submissions: FeeSubmissionService, private whatsapp: WhatsAppService, private content: WebsiteContentService, private auth: MockAuthService, private feeApi: FeeApiService, private studentApi: StudentApiService) { if (!this.live) this.applyApproved(); }
  /** Real account: fees come from the API. Demo sessions keep the sample fees. */
  get live(): boolean { return !!this.auth.token; }
  get isSchool(): boolean { return this.tenant.current.businessType === 'school'; }
  get records(): FeeRecord[] { return this.live ? this.liveRecords : this.isSchool ? this.schoolRecords : this.coachingRecords; }
  get fields(): RecordField[] { return this.live ? this.liveFields : this.baseFields.map(field => field.key === 'student' ? { ...field, options: this.studentData.students.map(student => student.name) } : field.key === 'month' && this.isSchool ? { ...field, label: 'Term', options: ['Term 1 · 2026–27', 'Term 2 · 2026–27', 'Annual charges · 2026–27'] } : field.key === 'discount' && this.isSchool ? { ...field, label: 'Concession (₹)' } : field.key === 'mode' && this.isSchool ? { ...field, options: ['Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer'] } : field); }
  /** Collect-fee form for live data: students by name + ID, total fee for a period that is not set up yet, reference. */
  private get liveFields(): RecordField[] {
    const fields: RecordField[] = this.baseFields.map(field => field.key === 'student' ? { ...field, options: this.studentLabels } : field.key === 'month' ? { ...field, label: this.periodLabel, options: this.periodChoices } : field.key === 'discount' && this.isSchool ? { ...field, label: 'Concession (₹)' } : field.key === 'mode' ? { ...field, options: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Net banking'] } : field);
    const at = fields.findIndex(field => field.key === 'amount');
    fields.splice(at, 0, { key: 'totalFee', label: 'Total fee (₹)', type: 'number', hint: `Only needed when this ${this.isSchool ? 'term' : 'month'}'s fee is not set up yet` });
    fields.splice(fields.findIndex(field => field.key === 'date') + 1, 0, { key: 'reference', label: 'Reference / UTR no.', type: 'text' });
    return fields;
  }
  /** "Aarav Sharma · 123456" so students with the same name stay distinct. */
  get studentLabels(): string[] { return this.apiStudents.map(student => `${student.fullName || 'Unnamed student'} · ${student.studentCode}`); }
  private codesFrom(value: unknown): string[] { return String(value || '').split(',').map(part => part.trim().match(/(\d{6})$/)?.[1] || '').filter(Boolean); }
  /** Coaching: a few months either side of today. School: the terms of the current session. Plus every period already used. */
  get periodChoices(): string[] {
    const now = new Date(); let choices: string[];
    if (this.isSchool) { const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; const session = `${start}–${String(start + 1).slice(-2)}`; choices = [`Term 1 · ${session}`, `Term 2 · ${session}`, `Annual charges · ${session}`]; }
    else choices = [-3, -2, -1, 0, 1, 2].map(offset => new Date(now.getFullYear(), now.getMonth() + offset, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
    return [...new Set([...choices, ...this.records.map(row => row.month)])];
  }
  get periodLabel(): string { return this.isSchool ? 'Term' : 'Fee month'; }
  get periodOptions(): string[] { return [...new Set(this.records.map(row => row.month))]; }
  get pendingStudentCount(): number { if (this.live) return this.liveSummary?.pendingStudentCount ?? 0; return this.records.filter(row => row.due > 0).length; }
  ngOnInit(): void { const studentId = this.route.snapshot.paramMap.get('studentId'); if (studentId) this.detailStudent = studentId; if (this.live) { this.load(); this.loadStudents(() => { if (this.router.url.endsWith('/collect')) this.collect(); }); return; } if (this.router.url.endsWith('/collect')) setTimeout(() => this.collect(), 0); }
  initials(name: string): string { return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
  get filtered(): FeeRecord[] { const q = this.search.toLowerCase().trim(); return this.records.filter(row => (!q || `${row.student} ${row.studentId}`.toLowerCase().includes(q)) && (!this.statusFilter || row.status === this.statusFilter) && (!this.monthFilter || row.month === this.monthFilter) && (!this.studentFilter || row.studentId === this.studentFilter) && (!this.detailStudent || row.studentId === this.detailStudent)); }
  get todayCollection(): number { if (this.live) return this.liveSummary?.todayCollection ?? 0; return this.isSchool ? this.records.reduce((sum, row) => sum + row.paid, 0) : this.records.filter(row => row.date === '28 Sep 2026').reduce((sum, row) => sum + row.paid, 0); }
  get monthCollection(): number { if (this.live) return this.liveSummary?.monthCollection ?? 0; return this.isSchool ? this.records.filter(row => row.month.startsWith('Term 1')).reduce((sum, row) => sum + row.paid, 0) : this.records.filter(row => row.month === 'September 2026').reduce((sum, row) => sum + row.paid, 0); }
  get pendingFees(): number { if (this.live) return this.liveSummary?.pendingFees ?? 0; return this.records.filter(row => row.due > 0).reduce((sum, row) => sum + row.due, 0); }
  get overdueFees(): number { if (this.live) return this.liveSummary?.overdueFees ?? 0; return this.records.filter(row => row.status === 'Overdue').reduce((sum, row) => sum + row.due, 0); }
  collect(row?: FeeRecord, draft?: Record<string, unknown>): void { if (this.live) { this.collectLive(row, draft); return; } if (row && row.due <= 0) { this.toast.info(`${row.student}'s fee for ${row.month} is already fully paid.`); return; } const fields = this.fields.map(field => field.key === 'amount' && row ? { ...field, hint: `Amount due: ₹${row.due.toLocaleString('en-IN')}` } : field); const ref = this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: 'Collect fee', submitLabel: 'Record payment', fields, record: draft || { date: '2026-09-28', discount: 0, ...(row ? { student: row.student, month: row.month } : {}) }, successMessage: '' } }); ref.afterClosed().subscribe(value => { const leaveCollect = () => { if (this.router.url.endsWith('/collect')) this.router.navigate(['/client/fees']); }; if (!value) { leaveCollect(); return; } const names: string[] = String(value.student || '').split(',').map((name: string) => name.trim()).filter(Boolean); const paid = Number(value.amount) || 0; const discount = Number(value.discount) || 0; const paidOn = new Date(value.date); if (Number.isNaN(paidOn.getTime()) || paidOn.getTime() > Date.now()) { this.toast.error('Payment date cannot be in the future.'); this.collect(row, value); return; }
    // The same payment is recorded for every selected student, so check them all before saving any.
    const entries = names.map(name => { const studentId = this.studentData.students.find(student => student.name === name)?.studentId || ''; return { name, studentId, existing: this.records.find(item => item.studentId === studentId && item.month === value.month) }; });
    const paidUp = entries.find(entry => entry.existing && entry.existing.due <= 0); if (paidUp?.existing) { this.toast.error(`${paidUp.existing.student}'s fee for ${paidUp.existing.month} is already fully paid.`); this.collect(row, value); return; }
    const over = entries.find(entry => entry.existing && paid + discount > entry.existing.due); if (over?.existing) { this.toast.error(`Amount received${discount ? (this.isSchool ? ' plus concession' : ' plus discount') : ''} (₹${(paid + discount).toLocaleString('en-IN')}) cannot exceed the amount due of ₹${over.existing.due.toLocaleString('en-IN')} for ${over.existing.student} (${over.existing.month}).`); this.collect(row, value); return; }
    const date = paidOn.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const saved = entries.map(({ name, studentId, existing }, index) => { if (existing) { existing.paid += paid; existing.discount += discount; existing.due = Math.max(0, existing.total - existing.discount - existing.paid); existing.date = date; existing.mode = value.mode; existing.status = existing.due === 0 ? 'Paid' : 'Partial'; return existing; } const record: FeeRecord = { id: Date.now() + index, studentId, student: name, month: value.month, total: paid + discount, discount, paid, due: 0, date, mode: value.mode, status: 'Paid' }; this.records.unshift(record); return record; });
    if (saved.length === 1) this.showReceipt(saved[0]);
    this.toast.success(saved.length === 1 ? `Payment of ₹${paid.toLocaleString('en-IN')} recorded for ${names[0]}.` : `Payment of ₹${paid.toLocaleString('en-IN')} each recorded for ${saved.length} students.`); leaveCollect(); }); }
  showReceipt(record: FeeRecord): void { this.dialog.open(ReceiptPreviewComponent, { width: '450px', maxWidth: 'calc(100vw - 20px)', data: { ...record, receiptNo: this.receiptNo(record), institution: this.content.profile.settings['name'] || this.tenant.current.businessName, logo: this.content.customLogo, address: this.content.profile.settings['address'] || this.content.profile.contact['address'], registration: WebsiteContentService.registrationLine(this.content.profile, this.isSchool), phone: this.phoneFor(record), workspace: this.tenant.current.businessType } }); }
  private receiptNo(record: FeeRecord): string { if (record.receiptNo) return record.receiptNo; return `${this.isSchool ? 'GPS' : 'NSA'}-2026-${String(record.id).slice(-4)}`; }
  /** Student's own mobile from the student record (used for WhatsApp). */
  phoneFor(record: FeeRecord): string { if (this.live) return record.phone || ''; return this.studentData.students.find(student => student.studentId === record.studentId)?.phone || ''; }
  private reminderKey(record: FeeRecord): string { return `${this.tenant.current.businessType}:${record.studentId}:${record.month}`; }
  get dueRecords(): FeeRecord[] { return this.records.filter(row => row.due > 0); }
  reminderSentToday(record: FeeRecord): boolean { return this.whatsapp.sentToday('reminder', this.reminderKey(record)); }
  /** Bulk: queue of every unpaid fee (overdue first). */
  openReminders(): void {
    const order = { Overdue: 0, Pending: 1, Partial: 2, Paid: 3 };
    const rows: ReminderRow[] = [...this.dueRecords].sort((a, b) => order[a.status] - order[b.status]).map(fee => ({ fee, phone: this.phoneFor(fee), key: this.reminderKey(fee) }));
    if (!rows.length) { this.toast.info('No pending fees. Nobody needs a reminder.'); return; }
    this.dialog.open(FeeReminderDialogComponent, { width: '720px', maxWidth: 'calc(100vw - 20px)', data: { rows, isSchool: this.isSchool } });
  }
  /** Single reminder from the row menu. */
  remind(record: FeeRecord): void {
    if (!this.whatsapp.send('reminder', this.reminderKey(record), this.phoneFor(record), this.whatsapp.reminderText(record))) { this.toast.error(`${record.student} has no valid mobile number. Update it on the Students page.`); return; }
    this.toast.success(`WhatsApp opened for ${record.student}. Tap Send in WhatsApp.`);
  }
  sendReceipt(record: FeeRecord): void {
    const data = { ...record, receiptNo: this.receiptNo(record) };
    if (!this.whatsapp.send('receipt', `${this.tenant.current.businessType}:${data.receiptNo}:${record.paid}`, this.phoneFor(record), this.whatsapp.receiptText(data))) { this.toast.error(`${record.student} has no valid mobile number. Update it on the Students page.`); return; }
    this.toast.success(`WhatsApp opened with ${record.student}'s receipt. Tap Send in WhatsApp.`);
  }
  viewHistory(row: FeeRecord): void { this.router.navigate(['/client/fees', row.studentId]); }
  resetDetail(): void { this.detailStudent = undefined; this.router.navigate(['/client/fees']); }
  /** Payments students / parents submitted from the portal, waiting for the office to check them. */
  get pendingSubmissions(): FeeSubmission[] { return this.submissions.pending(this.tenant.current.businessType); }
  approveSubmission(item: FeeSubmission): void {
    const existing = this.records.find(row => row.studentId === item.studentId && row.month === item.period);
    if (this.live) { this.approveLive(item); return; }
    if (existing && item.amount > existing.due) { this.toast.error(`₹${item.amount.toLocaleString('en-IN')} is more than the ₹${existing.due.toLocaleString('en-IN')} due for ${item.period}. Reject it and collect the fee manually.`); return; }
    this.confirm.confirm({ title: 'Approve payment?', message: `Confirm that ₹${item.amount.toLocaleString('en-IN')} from ${item.student} (${item.mode}${item.reference ? ' · ' + item.reference : ''}) has been received for ${item.period}.`, confirmLabel: 'Approve & issue receipt' }).subscribe(ok => {
      if (!ok) return;
      this.submissions.review(item.id, 'Approved', 'Verified by the office');
      this.showReceipt(this.applySubmission(item));
      this.toast.success(`Payment of ₹${item.amount.toLocaleString('en-IN')} from ${item.student} approved.`);
    });
  }
  rejectSubmission(item: FeeSubmission): void {
    this.confirm.confirm({ title: 'Reject payment?', message: `Reject ₹${item.amount.toLocaleString('en-IN')} from ${item.student}? They will see that the office could not verify this payment.`, confirmLabel: 'Reject', destructive: true }).subscribe(ok => {
      if (!ok) return;
      this.submissions.review(item.id, 'Rejected', 'Could not verify this payment. Please contact the office.');
      this.toast.info(`Payment from ${item.student} rejected.`);
    });
  }
  /** Records are rebuilt on every visit, so re-apply payments the office already approved. */
  private applyApproved(): void {
    (['school', 'coaching'] as const).forEach(type => this.submissions.forWorkspace(type).filter(item => item.status === 'Approved').forEach(item => this.applySubmission(item, type === 'school' ? this.schoolRecords : this.coachingRecords)));
  }
  private applySubmission(item: FeeSubmission, records = this.records): FeeRecord {
    const existing = records.find(row => row.studentId === item.studentId && row.month === item.period);
    if (existing) {
      existing.paid += item.amount; existing.due = Math.max(0, existing.total - existing.discount - existing.paid); existing.date = item.submittedOn; existing.mode = item.mode; existing.status = existing.due === 0 ? 'Paid' : 'Partial';
      return existing;
    }
    const record: FeeRecord = { id: item.id, studentId: item.studentId, student: item.student, month: item.period, total: item.amount, discount: 0, paid: item.amount, due: 0, date: item.submittedOn, mode: item.mode, status: 'Paid' };
    records.unshift(record);
    return record;
  }
  /* ---------- Live (API) mode ---------- */
  get summaryLabels(): { today: string; todayHint: string; month: string; monthHint: string } {
    if (!this.live) return { today: this.isSchool ? 'Collected this session' : "Today's collection", todayHint: this.isSchool ? 'Term fees · 2026–27' : 'Across today', month: this.isSchool ? 'Term 1 collected' : 'This month', monthHint: this.isSchool ? 'April – September 2026' : 'September 2026' };
    return { today: "Today's collection", todayHint: 'Across today', month: 'This month', monthHint: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) };
  }
  load(): void {
    const token = this.auth.token; if (!token) return;
    this.loading = true;
    this.feeApi.list(token).subscribe({ next: rows => { this.loading = false; this.liveRecords = rows.map(row => FeesPageComponent.fromApi(row)); }, error: (error: Error) => { this.loading = false; this.toast.error(error.message); } });
    this.feeApi.summary(token).subscribe({ next: summary => this.liveSummary = summary, error: () => { /* the list call already reports errors */ } });
  }
  private loadStudents(done?: () => void): void {
    const token = this.auth.token; if (!token) return;
    this.studentApi.list(token).subscribe({ next: students => { this.apiStudents = students; done?.(); }, error: (error: Error) => this.toast.error(error.message) });
  }
  private static fromApi(row: ApiFee): FeeRecord {
    const last = row.lastPayment;
    return { id: row.id, studentId: row.studentId, student: row.student, month: row.period, total: row.totalFee, discount: row.discount, paid: row.paid, due: row.due, date: last ? FeesPageComponent.displayDate(last.date) : '—', mode: last?.mode || '—', status: row.status, receiptNo: last?.receiptNo, phone: row.phone };
  }
  private static displayDate(value: string): string { return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  private static dayKey(value: unknown): string { const date = value instanceof Date ? value : new Date(String(value)); return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private labelFor(row: FeeRecord): string { return this.studentLabels.find(label => label.endsWith(row.studentId)) || ''; }
  private collectLive(row?: FeeRecord, draft?: Record<string, unknown>): void {
    const token = this.auth.token; if (!token) return;
    if (row && row.due <= 0) { this.toast.info(`${row.student}'s fee for ${row.month} is already fully paid.`); return; }
    if (!this.apiStudents.length) { this.toast.warning('Add students first, then collect their fees.'); return; }
    const fields = this.fields.filter(field => !(row && field.key === 'totalFee')).map(field => field.key === 'amount' && row ? { ...field, hint: `Amount due: ₹${row.due.toLocaleString('en-IN')}` } : field);
    const record = draft || { date: new Date(), discount: 0, month: this.periodChoices[3] && !this.isSchool ? this.periodChoices[3] : this.periodChoices[0], ...(row ? { student: [this.labelFor(row)], month: row.month } : {}) };
    const ref = this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: 'Collect fee', submitLabel: 'Record payment', fields, record, successMessage: '' } });
    ref.afterClosed().subscribe(value => {
      const leaveCollect = () => { if (this.router.url.endsWith('/collect')) this.router.navigate(['/client/fees']); };
      if (!value) { leaveCollect(); return; }
      const studentIds = this.codesFrom(value.student); const date = FeesPageComponent.dayKey(value.date);
      if (!studentIds.length) { this.toast.error('Choose at least one student.'); this.collectLive(row, value); return; }
      if (!date || new Date(`${date}T00:00:00`).getTime() > Date.now()) { this.toast.error('Payment date cannot be in the future.'); this.collectLive(row, value); return; }
      const amount = Number(value.amount) || 0; const totalFee = value.totalFee === '' || value.totalFee == null ? null : Number(value.totalFee);
      this.feeApi.collect(token, { studentIds, period: value.month, amount, discount: Number(value.discount) || 0, mode: value.mode, date, reference: value.reference || null, note: value.notes || null, totalFee }).subscribe({
        next: saved => {
          const rows = saved.map(item => FeesPageComponent.fromApi(item));
          if (rows.length === 1) this.showReceipt({ ...rows[0], paid: amount, discount: Number(value.discount) || 0, date: FeesPageComponent.displayDate(date), mode: value.mode });
          this.toast.success(rows.length === 1 ? `Payment of ₹${amount.toLocaleString('en-IN')} recorded for ${rows[0].student}.` : `Payment of ₹${amount.toLocaleString('en-IN')} each recorded for ${rows.length} students.`);
          leaveCollect(); this.load();
        },
        error: (error: Error) => { this.toast.error(error.message); this.collectLive(row, value); }
      });
    });
  }
  /** Set up what students owe for a month / term, before any payment. */
  addFee(draft?: Record<string, unknown>): void {
    const token = this.auth.token; if (!token) return;
    if (!this.apiStudents.length) { this.toast.warning('Add students first, then set up their fees.'); return; }
    const fields: RecordField[] = [
      { key: 'student', label: 'Students', type: 'multiselect', options: this.studentLabels, required: true },
      { key: 'month', label: this.periodLabel, type: 'select', options: this.periodChoices, required: true },
      { key: 'totalFee', label: 'Total fee (₹)', type: 'number', required: true },
      { key: 'discount', label: this.isSchool ? 'Concession (₹)' : 'Discount (₹)', type: 'number' },
      { key: 'dueDate', label: 'Due date', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ];
    const ref = this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: 'Add fee', submitLabel: 'Add fee', fields, record: draft || { discount: 0 }, successMessage: '' } });
    ref.afterClosed().subscribe(value => {
      if (!value) return;
      const studentIds = this.codesFrom(value.student);
      if (!studentIds.length) { this.toast.error('Choose at least one student.'); this.addFee(value); return; }
      this.feeApi.create(token, { studentIds, period: value.month, totalFee: Number(value.totalFee), discount: Number(value.discount) || 0, dueDate: value.dueDate ? FeesPageComponent.dayKey(value.dueDate) : null, note: value.notes || null }).subscribe({
        next: rows => { this.toast.success(`Fee for ${value.month} added for ${rows.length} student${rows.length === 1 ? '' : 's'}.`); this.load(); },
        error: (error: Error) => { this.toast.error(error.message); this.addFee(value); }
      });
    });
  }
  deleteFee(row: FeeRecord): void {
    const token = this.auth.token; if (!token || typeof row.id !== 'string') return;
    this.confirm.confirm({ title: 'Delete fee?', message: `Delete ${row.student}'s fee of ₹${row.total.toLocaleString('en-IN')} for ${row.month}?`, confirmLabel: 'Delete', destructive: true }).subscribe(ok => {
      if (!ok) return;
      this.feeApi.remove(token, row.id as string).subscribe({ next: () => { this.toast.success('Fee deleted.'); this.load(); }, error: (error: Error) => this.toast.error(error.message) });
    });
  }
  /** Portal submissions only match live students by their 6-digit ID. */
  private approveLive(item: FeeSubmission): void {
    const token = this.auth.token; if (!token) return;
    if (!/^\d{6}$/.test(item.studentId)) { this.toast.error(`${item.student} is not a student in your records. Reject it and collect the fee manually.`); return; }
    this.confirm.confirm({ title: 'Approve payment?', message: `Confirm that ₹${item.amount.toLocaleString('en-IN')} from ${item.student} (${item.mode}${item.reference ? ' · ' + item.reference : ''}) has been received for ${item.period}.`, confirmLabel: 'Approve & issue receipt' }).subscribe(ok => {
      if (!ok) return;
      const mode = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Net banking'].includes(item.mode) ? item.mode : 'UPI';
      this.feeApi.collect(token, { studentIds: [item.studentId], period: item.period, amount: item.amount, mode, date: FeesPageComponent.dayKey(new Date()), reference: item.reference || null, note: item.note || null }).subscribe({
        next: saved => { this.submissions.review(item.id, 'Approved', 'Verified by the office'); if (saved[0]) this.showReceipt({ ...FeesPageComponent.fromApi(saved[0]), paid: item.amount }); this.toast.success(`Payment of ₹${item.amount.toLocaleString('en-IN')} from ${item.student} approved.`); this.load(); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }
  statusTone(status: string): 'success'|'warning'|'danger'|'neutral' { return status === 'Paid' ? 'success' : status === 'Overdue' ? 'danger' : status === 'Partial' ? 'warning' : 'neutral'; }
}

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
interface FeeRecord { id: number; studentId: string; student: string; month: string; total: number; discount: number; paid: number; due: number; date: string; mode: string; status: 'Paid'|'Partial'|'Pending'|'Overdue'; }
@Component({ selector: 'app-receipt-preview', template: '<div class="receipt-wrap"><div class="receipt-brand"><span>EDUNEXA</span><small>PAYMENT RECEIPT</small></div><div class="receipt-success"><mat-icon>check_circle</mat-icon><strong>Payment received</strong></div><div class="receipt-total">₹{{data.paid | number}}</div><p class="receipt-muted">Receipt no. {{data.receiptNo}}</p><mat-divider></mat-divider><div class="receipt-line"><span>Student</span><strong>{{data.student}}</strong></div><div class="receipt-line"><span>Student ID</span><strong>{{data.studentId}}</strong></div><div class="receipt-line"><span>Fee period</span><strong>{{data.month}}</strong></div><div class="receipt-line"><span>Payment date</span><strong>{{data.date}}</strong></div><div class="receipt-line"><span>Payment method</span><strong>{{data.mode}}</strong></div><div class="receipt-line"><span>Discount</span><strong>₹{{data.discount | number}}</strong></div><div class="receipt-line total-line"><span>Amount paid</span><strong>₹{{data.paid | number}}</strong></div><p class="receipt-footer">{{data.institution}} · Thank you for your payment.</p><div class="receipt-wa" *ngIf="data.phone !== undefined"><span *ngIf="sentOn">Sent on WhatsApp · {{sentOn}}</span><span *ngIf="!sentOn && !validPhone" class="bad">No valid mobile number for this student</span></div><div class="receipt-actions"><button mat-stroked-button mat-dialog-close>Close</button><button mat-stroked-button (click)="print()"><mat-icon>print</mat-icon> Print</button><button mat-flat-button class="wa-button" *ngIf="data.phone !== undefined" [disabled]="!validPhone" (click)="sendWhatsApp()"><mat-icon>chat</mat-icon> {{sentOn ? "Send again" : "Send on WhatsApp"}}</button></div></div>', styles: [':host{display:block}.receipt-wrap{padding:26px;min-width:min(400px,80vw);color:#29374a}.receipt-brand{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #edf0f3;padding-bottom:15px}.receipt-brand span{font-weight:800;letter-spacing:1px;color:#4770e3}.receipt-brand small{font-size:12px;color:#8290a0;letter-spacing:1px}.receipt-success{text-align:center;display:flex;align-items:center;justify-content:center;gap:7px;color:#4166ce;font-size:clamp(12px, 11.648px + 0.0939vw, 13px);margin-top:25px}.receipt-total{text-align:center;font-size:clamp(24px, 21.183px + 0.7512vw, 32px);font-weight:750;margin-top:10px}.receipt-muted{text-align:center;font-size:12px;color:#929daa;margin:4px 0 18px}.receipt-line{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f2f4;font-size:12px}.receipt-line span{color:#8491a0}.receipt-line strong{color:#3a485b}.total-line{border:0;font-weight:700;padding-top:15px}.total-line strong{color:#4770e3}.receipt-footer{text-align:center;color:#8a96a3;font-size:12px;margin:15px 0}.receipt-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;flex-wrap:wrap}.wa-button{background:#1fa855!important;color:#fff!important}.wa-button[disabled]{opacity:.5}.receipt-wa{text-align:right;font-size:12px;color:#1f8a4c;margin-top:8px}.receipt-wa .bad{color:#b5443d}.receipt-actions button{font-size:12px}@media print{body *{visibility:hidden!important}.receipt-wrap,.receipt-wrap *{visibility:visible!important}.receipt-wrap{position:absolute;left:0;top:0;width:100%;box-shadow:none!important}}'] })
export class ReceiptPreviewComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: FeeRecord & { receiptNo: string; institution: string; phone?: string; workspace?: string }, private ref: MatDialogRef<ReceiptPreviewComponent>, private whatsapp: WhatsAppService, private toast: ToastService) {}
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
  constructor(public router: Router, private route: ActivatedRoute, private dialog: MatDialog, private confirm: ConfirmationDialogService, private tenant: TenantContextService, private studentData: MockDataService, private toast: ToastService, private submissions: FeeSubmissionService, private whatsapp: WhatsAppService) { this.applyApproved(); }
  get isSchool(): boolean { return this.tenant.current.businessType === 'school'; }
  get records(): FeeRecord[] { return this.isSchool ? this.schoolRecords : this.coachingRecords; }
  get fields(): RecordField[] { return this.baseFields.map(field => field.key === 'student' ? { ...field, options: this.studentData.students.map(student => student.name) } : field.key === 'month' && this.isSchool ? { ...field, label: 'Term', options: ['Term 1 · 2026–27', 'Term 2 · 2026–27', 'Annual charges · 2026–27'] } : field.key === 'discount' && this.isSchool ? { ...field, label: 'Concession (₹)' } : field.key === 'mode' && this.isSchool ? { ...field, options: ['Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer'] } : field); }
  get periodLabel(): string { return this.isSchool ? 'Term' : 'Fee month'; }
  get periodOptions(): string[] { return [...new Set(this.records.map(row => row.month))]; }
  get pendingStudentCount(): number { return this.records.filter(row => row.due > 0).length; }
  ngOnInit(): void { const studentId = this.route.snapshot.paramMap.get('studentId'); if (studentId) this.detailStudent = studentId; if (this.router.url.endsWith('/collect')) setTimeout(() => this.collect(), 0); }
  initials(name: string): string { return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
  get filtered(): FeeRecord[] { const q = this.search.toLowerCase().trim(); return this.records.filter(row => (!q || `${row.student} ${row.studentId}`.toLowerCase().includes(q)) && (!this.statusFilter || row.status === this.statusFilter) && (!this.monthFilter || row.month === this.monthFilter) && (!this.studentFilter || row.studentId === this.studentFilter) && (!this.detailStudent || row.studentId === this.detailStudent)); }
  get todayCollection(): number { return this.isSchool ? this.records.reduce((sum, row) => sum + row.paid, 0) : this.records.filter(row => row.date === '28 Sep 2026').reduce((sum, row) => sum + row.paid, 0); }
  get monthCollection(): number { return this.isSchool ? this.records.filter(row => row.month.startsWith('Term 1')).reduce((sum, row) => sum + row.paid, 0) : this.records.filter(row => row.month === 'September 2026').reduce((sum, row) => sum + row.paid, 0); }
  get pendingFees(): number { return this.records.filter(row => row.due > 0).reduce((sum, row) => sum + row.due, 0); }
  get overdueFees(): number { return this.records.filter(row => row.status === 'Overdue').reduce((sum, row) => sum + row.due, 0); }
  collect(row?: FeeRecord, draft?: Record<string, unknown>): void { if (row && row.due <= 0) { this.toast.info(`${row.student}'s fee for ${row.month} is already fully paid.`); return; } const fields = this.fields.map(field => field.key === 'amount' && row ? { ...field, hint: `Amount due: ₹${row.due.toLocaleString('en-IN')}` } : field); const ref = this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: 'Collect fee', submitLabel: 'Record payment', fields, record: draft || { date: '2026-09-28', discount: 0, ...(row ? { student: row.student, month: row.month } : {}) }, successMessage: '' } }); ref.afterClosed().subscribe(value => { const leaveCollect = () => { if (this.router.url.endsWith('/collect')) this.router.navigate(['/client/fees']); }; if (!value) { leaveCollect(); return; } const names: string[] = String(value.student || '').split(',').map((name: string) => name.trim()).filter(Boolean); const paid = Number(value.amount) || 0; const discount = Number(value.discount) || 0; const paidOn = new Date(value.date); if (Number.isNaN(paidOn.getTime()) || paidOn.getTime() > Date.now()) { this.toast.error('Payment date cannot be in the future.'); this.collect(row, value); return; }
    // The same payment is recorded for every selected student, so check them all before saving any.
    const entries = names.map(name => { const studentId = this.studentData.students.find(student => student.name === name)?.studentId || ''; return { name, studentId, existing: this.records.find(item => item.studentId === studentId && item.month === value.month) }; });
    const paidUp = entries.find(entry => entry.existing && entry.existing.due <= 0); if (paidUp?.existing) { this.toast.error(`${paidUp.existing.student}'s fee for ${paidUp.existing.month} is already fully paid.`); this.collect(row, value); return; }
    const over = entries.find(entry => entry.existing && paid + discount > entry.existing.due); if (over?.existing) { this.toast.error(`Amount received${discount ? (this.isSchool ? ' plus concession' : ' plus discount') : ''} (₹${(paid + discount).toLocaleString('en-IN')}) cannot exceed the amount due of ₹${over.existing.due.toLocaleString('en-IN')} for ${over.existing.student} (${over.existing.month}).`); this.collect(row, value); return; }
    const date = paidOn.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const saved = entries.map(({ name, studentId, existing }, index) => { if (existing) { existing.paid += paid; existing.discount += discount; existing.due = Math.max(0, existing.total - existing.discount - existing.paid); existing.date = date; existing.mode = value.mode; existing.status = existing.due === 0 ? 'Paid' : 'Partial'; return existing; } const record: FeeRecord = { id: Date.now() + index, studentId, student: name, month: value.month, total: paid + discount, discount, paid, due: 0, date, mode: value.mode, status: 'Paid' }; this.records.unshift(record); return record; });
    if (saved.length === 1) this.showReceipt(saved[0]);
    this.toast.success(saved.length === 1 ? `Payment of ₹${paid.toLocaleString('en-IN')} recorded for ${names[0]}.` : `Payment of ₹${paid.toLocaleString('en-IN')} each recorded for ${saved.length} students.`); leaveCollect(); }); }
  showReceipt(record: FeeRecord): void { this.dialog.open(ReceiptPreviewComponent, { width: '450px', maxWidth: 'calc(100vw - 20px)', data: { ...record, receiptNo: this.receiptNo(record), institution: this.tenant.current.businessName, phone: this.phoneFor(record), workspace: this.tenant.current.businessType } }); }
  private receiptNo(record: FeeRecord): string { return `${this.isSchool ? 'GPS' : 'NSA'}-2026-${String(record.id).slice(-4)}`; }
  /** Student's own mobile from the student record (used for WhatsApp). */
  phoneFor(record: FeeRecord): string { return this.studentData.students.find(student => student.studentId === record.studentId)?.phone || ''; }
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
  statusTone(status: string): 'success'|'warning'|'danger'|'neutral' { return status === 'Paid' ? 'success' : status === 'Overdue' ? 'danger' : status === 'Partial' ? 'warning' : 'neutral'; }
}

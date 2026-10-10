import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RecordDialogComponent, RecordField } from './management/record-dialog.component';
import { ConfirmationDialogService } from '../core/confirmation-dialog.service';
import { MockDataService } from '../core/mock-data.service';
import { TenantContextService } from '../core/tenant-context.service';
interface FeeRecord { id: number; studentId: string; student: string; month: string; total: number; discount: number; paid: number; due: number; date: string; mode: string; status: 'Paid'|'Partial'|'Pending'|'Overdue'; }
@Component({ selector: 'app-receipt-preview', template: '<div class="receipt-wrap"><div class="receipt-brand"><span>AGEON</span><small>PAYMENT RECEIPT</small></div><div class="receipt-success"><mat-icon>check_circle</mat-icon><strong>Payment received</strong></div><div class="receipt-total">₹{{data.paid | number}}</div><p class="receipt-muted">Receipt no. {{data.receiptNo}}</p><mat-divider></mat-divider><div class="receipt-line"><span>Student</span><strong>{{data.student}}</strong></div><div class="receipt-line"><span>Student ID</span><strong>{{data.studentId}}</strong></div><div class="receipt-line"><span>Fee period</span><strong>{{data.month}}</strong></div><div class="receipt-line"><span>Payment date</span><strong>{{data.date}}</strong></div><div class="receipt-line"><span>Payment method</span><strong>{{data.mode}}</strong></div><div class="receipt-line"><span>Discount</span><strong>₹{{data.discount | number}}</strong></div><div class="receipt-line total-line"><span>Amount paid</span><strong>₹{{data.paid | number}}</strong></div><p class="receipt-footer">{{data.institution}} · Thank you for your payment.</p><div class="receipt-actions"><button mat-stroked-button mat-dialog-close>Close</button><button mat-flat-button color="primary" (click)="print()"><mat-icon>print</mat-icon> Print receipt</button></div></div>', styles: [':host{display:block}.receipt-wrap{padding:26px;min-width:min(400px,80vw);color:#29374a}.receipt-brand{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #edf0f3;padding-bottom:15px}.receipt-brand span{font-weight:800;letter-spacing:1px;color:#0b8e78}.receipt-brand small{font-size:9px;color:#8290a0;letter-spacing:1px}.receipt-success{text-align:center;display:flex;align-items:center;justify-content:center;gap:7px;color:#188169;font-size:12px;margin-top:25px}.receipt-total{text-align:center;font-size:32px;font-weight:750;margin-top:10px}.receipt-muted{text-align:center;font-size:9px;color:#929daa;margin:4px 0 18px}.receipt-line{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f2f4;font-size:10px}.receipt-line span{color:#8491a0}.receipt-line strong{color:#3a485b}.total-line{border:0;font-weight:700;padding-top:15px}.total-line strong{color:#0b8e78}.receipt-footer{text-align:center;color:#8a96a3;font-size:9px;margin:15px 0}.receipt-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.receipt-actions button{font-size:10px}@media print{body *{visibility:hidden!important}.receipt-wrap,.receipt-wrap *{visibility:visible!important}.receipt-wrap{position:absolute;left:0;top:0;width:100%;box-shadow:none!important}}'] })
export class ReceiptPreviewComponent { constructor(@Inject(MAT_DIALOG_DATA) public data: FeeRecord & { receiptNo: string; institution: string }, private ref: MatDialogRef<ReceiptPreviewComponent>) {} print(): void { window.print(); } }
@Component({ selector: 'app-fees-page', templateUrl: './fees-page.component.html', styleUrls: ['./fees-page.component.scss'] })
export class FeesPageComponent implements OnInit {
  search = ''; statusFilter = ''; monthFilter = ''; studentFilter = '';
  private readonly coachingRecords: FeeRecord[] = [
    { id: 1, studentId: 'NS-2401', student: 'Aarav Sharma', month: 'September 2026', total: 4500, discount: 500, paid: 4000, due: 0, date: '28 Sep 2026', mode: 'UPI', status: 'Paid' },
    { id: 2, studentId: 'NS-2402', student: 'Meera Kapoor', month: 'September 2026', total: 4000, discount: 0, paid: 2000, due: 2000, date: '—', mode: '—', status: 'Partial' },
    { id: 3, studentId: 'NS-2403', student: 'Rohan Verma', month: 'September 2026', total: 4500, discount: 0, paid: 0, due: 4500, date: '—', mode: '—', status: 'Overdue' },
    { id: 4, studentId: 'NS-2404', student: 'Diya Iyer', month: 'September 2026', total: 3200, discount: 200, paid: 3000, due: 0, date: '27 Sep 2026', mode: 'Cash', status: 'Paid' },
    { id: 5, studentId: 'NS-2405', student: 'Kabir Singh', month: 'September 2026', total: 3500, discount: 0, paid: 0, due: 3500, date: '—', mode: '—', status: 'Pending' },
    { id: 6, studentId: 'NS-2402', student: 'Meera Kapoor', month: 'August 2026', total: 4000, discount: 0, paid: 4000, due: 0, date: '08 Aug 2026', mode: 'Bank Transfer', status: 'Paid' }
  ];
  detailStudent?: string;
  private readonly baseFields: RecordField[] = [
    { key: 'student', label: 'Student', type: 'select', options: ['Aarav Sharma', 'Meera Kapoor', 'Rohan Verma', 'Diya Iyer', 'Kabir Singh'], required: true },
    { key: 'month', label: 'Fee month', type: 'select', options: ['September 2026', 'October 2026', 'August 2026'], required: true },
    { key: 'amount', label: 'Amount received (₹)', type: 'number', required: true },
    { key: 'discount', label: 'Discount (₹)', type: 'number' },
    { key: 'mode', label: 'Payment mode', type: 'select', options: ['Cash', 'UPI', 'Card', 'Bank Transfer'], required: true },
    { key: 'date', label: 'Payment date', type: 'date', required: true },
    { key: 'notes', label: 'Notes', type: 'textarea' }
  ];
  private readonly collegeRecords: FeeRecord[] = [
    { id: 21, studentId: 'GC-2601', student: 'Ishita Rao', month: 'Tuition installment 1 · 2026–27', total: 42000, discount: 0, paid: 28000, due: 14000, date: '18 Sep 2026', mode: 'Bank Transfer', status: 'Partial' },
    { id: 22, studentId: 'GC-2602', student: 'Aditya Menon', month: 'Tuition installment 1 · 2026–27', total: 34000, discount: 2000, paid: 32000, due: 0, date: '15 Sep 2026', mode: 'UPI', status: 'Paid' },
    { id: 23, studentId: 'GC-2603', student: 'Sana Ahmed', month: 'Tuition installment 1 · 2026–27', total: 38000, discount: 0, paid: 0, due: 38000, date: '—', mode: '—', status: 'Overdue' },
    { id: 24, studentId: 'GC-2604', student: 'Rohan Das', month: 'Tuition installment 1 · 2026–27', total: 48000, discount: 0, paid: 24000, due: 24000, date: '—', mode: '—', status: 'Partial' }
  ];
  constructor(public router: Router, private route: ActivatedRoute, private dialog: MatDialog, private confirm: ConfirmationDialogService, private tenant: TenantContextService, private studentData: MockDataService) {}
  get isCollege(): boolean { return this.tenant.current.businessType === 'college'; }
  get records(): FeeRecord[] { return this.isCollege ? this.collegeRecords : this.coachingRecords; }
  get fields(): RecordField[] { return this.baseFields.map(field => field.key === 'student' ? { ...field, options: this.studentData.students.map(student => student.name) } : field.key === 'month' && this.isCollege ? { ...field, label: 'Tuition installment', options: ['Tuition installment 1 · 2026–27', 'Tuition installment 2 · 2026–27', 'Tuition installment 3 · 2026–27'] } : field); }
  get periodLabel(): string { return this.isCollege ? 'Tuition period' : 'Fee month'; }
  get periodOptions(): string[] { return [...new Set(this.records.map(row => row.month))]; }
  get pendingStudentCount(): number { return this.records.filter(row => row.due > 0).length; }
  ngOnInit(): void { const studentId = this.route.snapshot.paramMap.get('studentId'); if (studentId) this.detailStudent = studentId; if (this.router.url.endsWith('/collect')) setTimeout(() => this.collect(), 0); }
  initials(name: string): string { return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
  get filtered(): FeeRecord[] { const q = this.search.toLowerCase().trim(); return this.records.filter(row => (!q || `${row.student} ${row.studentId}`.toLowerCase().includes(q)) && (!this.statusFilter || row.status === this.statusFilter) && (!this.monthFilter || row.month === this.monthFilter) && (!this.studentFilter || row.studentId === this.studentFilter) && (!this.detailStudent || row.studentId === this.detailStudent)); }
  get todayCollection(): number { return this.isCollege ? this.monthCollection : this.records.filter(row => row.date === '28 Sep 2026').reduce((sum, row) => sum + row.paid, 0); }
  get monthCollection(): number { return this.isCollege ? this.records.reduce((sum, row) => sum + row.paid, 0) : this.records.filter(row => row.month === 'September 2026').reduce((sum, row) => sum + row.paid, 0); }
  get pendingFees(): number { return this.records.filter(row => row.due > 0).reduce((sum, row) => sum + row.due, 0); }
  get overdueFees(): number { return this.records.filter(row => row.status === 'Overdue').reduce((sum, row) => sum + row.due, 0); }
  collect(): void { const ref = this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: 'Collect fee', submitLabel: 'Record payment', fields: this.fields, record: { date: '2026-09-28', discount: 0 } } }); ref.afterClosed().subscribe(value => { if (!value) { if (this.router.url.endsWith('/collect')) this.router.navigate(['/client/fees']); return; } const studentId = this.studentData.students.find(student => student.name === value.student)?.studentId || ''; const existing = this.records.find(item => item.studentId === studentId && item.month === value.month); const paid = Number(value.amount) || 0; const discount = Number(value.discount) || 0; if (existing) { existing.paid += paid; existing.discount += discount; existing.due = Math.max(0, existing.total - existing.discount - existing.paid); existing.date = new Date(value.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); existing.mode = value.mode; existing.status = existing.due === 0 ? 'Paid' : 'Partial'; this.showReceipt(existing); } else { const record: FeeRecord = { id: Date.now(), studentId, student: value.student, month: value.month, total: paid + discount, discount, paid, due: 0, date: new Date(value.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), mode: value.mode, status: 'Paid' }; this.records.unshift(record); this.showReceipt(record); } if (this.router.url.endsWith('/collect')) this.router.navigate(['/client/fees']); }); }
  showReceipt(record: FeeRecord): void { this.dialog.open(ReceiptPreviewComponent, { width: '450px', maxWidth: 'calc(100vw - 20px)', data: { ...record, receiptNo: `${this.isCollege ? 'GFC' : 'NSA'}-2026-${String(record.id).slice(-4)}`, institution: this.tenant.current.businessName } }); }
  viewHistory(row: FeeRecord): void { this.router.navigate(['/client/fees', row.studentId]); }
  resetDetail(): void { this.detailStudent = undefined; this.router.navigate(['/client/fees']); }
  statusTone(status: string): 'success'|'warning'|'danger'|'neutral' { return status === 'Paid' ? 'success' : status === 'Overdue' ? 'danger' : status === 'Partial' ? 'warning' : 'neutral'; }
}

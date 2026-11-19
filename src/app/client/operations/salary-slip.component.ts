import { Component, ElementRef, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiSalary, SALARY_MODE_LABELS, SalaryApiService } from '../../core/salary-api.service';
import { dayLabel } from '../../core/api-client';

export interface SalarySlipData { salary: ApiSalary; institution: string; logo?: string | null; }

const TEMPLATE = `
<div class="slip-wrap">
  <div class="slip-brand"><span class="slip-logo"><img *ngIf="data.logo; else initial" [src]="data.logo" alt=""><ng-template #initial>{{ (data.institution || 'E').charAt(0) }}</ng-template></span><div><strong>{{ data.institution }}</strong><small>Salary slip · {{ month }}</small></div></div>
  <div class="slip-head"><div><span>Teacher</span><strong>{{ s.teacherName }}</strong><small>ID {{ s.teacherCode }}</small></div><div class="text-end"><span>Slip no.</span><strong>{{ s.salaryCode }}</strong><small [class.paid]="s.status === 'paid'">{{ s.status === 'paid' ? 'Paid on ' + paidOn : 'Payment pending' }}</small></div></div>
  <table class="slip-table">
    <thead><tr><th>Earnings</th><th class="num">Amount</th></tr></thead>
    <tbody>
      <tr><td>Basic pay</td><td class="num">{{ rupees(s.basic) }}</td></tr>
      <tr><td>Allowances</td><td class="num">{{ rupees(s.allowances) }}</td></tr>
      <tr><td>Bonus</td><td class="num">{{ rupees(s.bonus) }}</td></tr>
      <tr class="sub"><td>Gross pay</td><td class="num">{{ rupees(gross) }}</td></tr>
      <tr><td>Deductions</td><td class="num minus">− {{ rupees(s.deductions) }}</td></tr>
    </tbody>
  </table>
  <div class="slip-net"><span>Net pay</span><strong>{{ rupees(s.netPay) }}</strong></div>
  <div class="slip-line" *ngIf="s.status === 'paid'"><span>Paid by</span><strong>{{ mode }}<ng-container *ngIf="s.reference"> · {{ s.reference }}</ng-container></strong></div>
  <div class="slip-line" *ngIf="s.note"><span>Note</span><strong>{{ s.note }}</strong></div>
  <div class="slip-sign"><span></span><small>Authorised signatory</small></div>
  <p class="slip-footer">This is a computer-generated salary slip.</p>
  <div class="slip-actions no-print"><button mat-stroked-button mat-dialog-close>Close</button><button mat-flat-button color="primary" (click)="print()"><mat-icon>print</mat-icon> Print</button></div>
</div>`;

const STYLES = `:host{display:block}.slip-wrap{padding:26px;min-width:min(440px,80vw);color:#29374a}.slip-brand{display:flex;align-items:center;gap:12px;border-bottom:1px solid #edf0f3;padding-bottom:14px}.slip-brand strong{display:block;font-size:17px}.slip-brand small{color:#5b6778;font-size:12px}.slip-logo{flex:none;width:46px;height:46px;border-radius:12px;background:#272f62;color:#fff;display:grid;place-items:center;font:700 21px Georgia,serif;overflow:hidden}.slip-logo img{width:100%;height:100%;object-fit:cover}.slip-head{display:flex;justify-content:space-between;gap:16px;margin:16px 0}.slip-head span{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#5b6778}.slip-head strong{display:block;font-size:15px}.slip-head small{font-size:12px;color:#b45309}.slip-head small.paid{color:#15803d}.slip-table{width:100%;border-collapse:collapse;font-size:13px}.slip-table th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#5b6778;border-bottom:1px solid #e3e8ef;padding:6px 0;text-align:left}.slip-table td{padding:7px 0;border-bottom:1px dashed #edf0f3}.slip-table .num{text-align:right}.slip-table .sub td{font-weight:700}.slip-table .minus{color:#b91c1c}.slip-net{display:flex;justify-content:space-between;align-items:center;margin:14px 0 8px;padding:12px 14px;border-radius:12px;background:linear-gradient(90deg,#fff0f7,#fff5ec)}.slip-net strong{font-size:22px;color:#263447}.slip-line{display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:5px 0}.slip-line span{color:#5b6778}.slip-sign{margin-top:34px;text-align:right}.slip-sign span{display:inline-block;width:160px;border-bottom:1px solid #9aa5b1}.slip-sign small{display:block;font-size:11px;color:#5b6778;margin-top:4px}.slip-footer{font-size:11px;color:#5b6778;text-align:center;margin:18px 0 0}.slip-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}`;

/** Printable salary slip for one teacher and month. */
@Component({ selector: 'app-salary-slip', template: TEMPLATE, styles: [STYLES] })
export class SalarySlipComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: SalarySlipData, private host: ElementRef<HTMLElement>) {}
  get s(): ApiSalary { return this.data.salary; }
  get month(): string { return SalaryApiService.monthLabel(this.s.month); }
  get gross(): number { return this.s.basic + this.s.allowances + this.s.bonus; }
  get paidOn(): string { return dayLabel(this.s.paidOn); }
  get mode(): string { return this.s.mode ? SALARY_MODE_LABELS[this.s.mode] : '—'; }
  rupees(value: number): string { return SalaryApiService.rupees(value); }
  /** Prints only the slip (same approach as the fee receipt). */
  print(): void {
    const slip = this.host.nativeElement.querySelector('.slip-wrap');
    if (!slip) { window.print(); return; }
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(node => node.outerHTML).join('');
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Salary slip ${this.s.salaryCode}</title>${styles}<style>@page{size:A5 portrait;margin:12mm}html,body{background:#fff!important;margin:0}.no-print{display:none!important}.slip-wrap{min-width:0!important;max-width:480px;margin:0 auto;padding:0!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${slip.outerHTML}</body></html>`);
    doc.close();
    setTimeout(() => { frame.contentWindow?.focus(); frame.contentWindow?.print(); setTimeout(() => frame.remove(), 1000); }, 400);
  }
}

import { Component, ElementRef, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FeeMessageData, WhatsAppService } from '../../../core/whatsapp.service';
import { ToastService } from '../../../core/toast.service';

/** One month / term covered by a receipt. */
export interface ReceiptItem { month: string; paid: number; discount: number; due: number; receiptNo?: string; }

/** What a fee receipt shows. Leave `phone` out to hide the WhatsApp section (e.g. in the student / parent portal). */
export interface ReceiptData extends FeeMessageData {
  receiptNo: string; institution: string; phone?: string; workspace?: string; logo?: string | null; address?: string; registration?: string;
  /** Who took the payment. */
  receivedBy?: string;
  /** Everything the student still owes across all months / terms after this payment. */
  pending?: number;
  /** Months / terms paid with this receipt; shown as a breakdown when there is more than one. */
  items?: ReceiptItem[];
}

const TEMPLATE = `
<div class="receipt-wrap">
  <div class="receipt-brand"><span class="receipt-logo"><img *ngIf="data.logo; else initial" [src]="data.logo" alt=""><ng-template #initial>{{(data.institution || "E").charAt(0)}}</ng-template></span><div><strong>{{data.institution}}</strong><small *ngIf="data.address">{{data.address}}</small><small *ngIf="data.registration">{{data.registration}}</small></div></div>
  <div class="receipt-kind">PAYMENT RECEIPT</div>
  <div class="receipt-success"><mat-icon>check_circle</mat-icon><strong>Payment received</strong></div>
  <div class="receipt-total">₹{{data.paid | number}}</div>
  <p class="receipt-muted">Receipt no. {{data.receiptNo}}</p>
  <mat-divider></mat-divider>
  <div class="receipt-line"><span>Student</span><strong>{{data.student}}</strong></div>
  <div class="receipt-line"><span>Student ID</span><strong>{{data.studentId}}</strong></div>
  <div class="receipt-line" *ngIf="!multi"><span>Fee period</span><strong>{{data.month}}</strong></div>
  <div class="receipt-line"><span>Payment date</span><strong>{{data.date}}</strong></div>
  <div class="receipt-line"><span>Payment method</span><strong>{{data.mode}}</strong></div>
  <div class="receipt-line" *ngIf="data.receivedBy"><span>Received by</span><strong>{{data.receivedBy}}</strong></div>
  <table class="receipt-items" *ngIf="multi">
    <thead><tr><th>Period</th><th>Discount</th><th>Paid</th><th>Balance</th></tr></thead>
    <tbody><tr *ngFor="let item of data.items"><td>{{item.month}}<small *ngIf="item.receiptNo && item.receiptNo !== data.receiptNo">{{item.receiptNo}}</small></td><td>₹{{item.discount | number}}</td><td>₹{{item.paid | number}}</td><td>₹{{item.due | number}}</td></tr></tbody>
  </table>
  <div class="receipt-line"><span>Discount</span><strong>₹{{data.discount | number}}</strong></div>
  <div class="receipt-line total-line"><span>Amount paid</span><strong>₹{{data.paid | number}}</strong></div>
  <div class="receipt-line pending-line" *ngIf="data.pending !== undefined" [class.clear]="!data.pending"><span>Pending fees (all periods)</span><strong>{{data.pending ? '₹' + (data.pending | number) : 'Nil – fully paid'}}</strong></div>
  <div class="receipt-sign" *ngIf="data.receivedBy"><span>{{data.receivedBy}}</span><small>Authorised signatory</small></div>
  <p class="receipt-footer">Thank you for your payment.</p>
  <div class="receipt-wa no-print" *ngIf="data.phone !== undefined"><span *ngIf="sentOn">Sent on WhatsApp · {{sentOn}}</span><span *ngIf="!sentOn && !validPhone" class="bad">No valid mobile number for this student</span></div>
  <div class="receipt-actions no-print"><button mat-stroked-button mat-dialog-close>Close</button><button mat-stroked-button (click)="print()"><mat-icon>print</mat-icon> Print</button><button mat-flat-button class="wa-button" *ngIf="data.phone !== undefined" [disabled]="!validPhone" (click)="sendWhatsApp()"><mat-icon>chat</mat-icon> {{sentOn ? "Send again" : "Send on WhatsApp"}}</button></div>
</div>`;

const STYLES = `:host{display:block}.receipt-wrap{padding:26px;min-width:min(400px,80vw);color:#29374a}.receipt-brand{display:flex;align-items:center;gap:12px;border-bottom:1px solid #edf0f3;padding-bottom:15px}.receipt-logo{flex:none;width:48px;height:48px;border-radius:12px;background:#272f62;color:#fff;display:grid;place-items:center;font:700 22px Georgia,serif;overflow:hidden}.receipt-logo img{width:100%;height:100%;object-fit:contain;background:#fff}.receipt-brand strong{display:block;color:#272f62;font-size:16px}.receipt-brand small{display:block;color:#7f8593;font-size:12px;line-height:1.4;margin-top:2px}.receipt-kind{margin:14px 0 0;text-align:center;font-size:12px;letter-spacing:.14em;color:#858c9c}.receipt-success{text-align:center;display:flex;align-items:center;justify-content:center;gap:7px;color:#4166ce;font-size:clamp(12px, 11.648px + 0.0939vw, 13px);margin-top:25px}.receipt-total{text-align:center;font-size:clamp(24px, 21.183px + 0.7512vw, 32px);font-weight:750;margin-top:10px}.receipt-muted{text-align:center;font-size:12px;color:#929daa;margin:4px 0 18px}.receipt-line{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #f0f2f4;font-size:12px}.receipt-line span{color:#8491a0}.receipt-line strong{color:#3a485b;text-align:right}.total-line{border:0;font-weight:700;padding-top:15px}.total-line strong{color:#4770e3}.pending-line{border:1px solid #f3d9c4;background:#fff7f0;border-radius:8px;padding:10px 12px;margin-top:4px}.pending-line strong{color:#b4561c}.pending-line.clear{border-color:#cfe9d8;background:#f2fbf5}.pending-line.clear strong{color:#1f8a4c}.receipt-items{width:100%;border-collapse:collapse;font-size:12px;margin:10px 0 4px}.receipt-items th{text-align:right;color:#8491a0;font-weight:600;padding:7px 4px;border-bottom:1px solid #e6e9ee}.receipt-items td{text-align:right;padding:7px 4px;border-bottom:1px solid #f0f2f4;color:#3a485b}.receipt-items th:first-child,.receipt-items td:first-child{text-align:left}.receipt-items small{display:block;color:#98a2ae;font-size:11px}.receipt-sign{margin:26px 0 0 auto;width:180px;text-align:center;border-top:1px solid #c9d0d8;padding-top:6px;font-size:12px}.receipt-sign span{display:block;font-weight:650;color:#3a485b}.receipt-sign small{color:#8a96a3}.receipt-footer{text-align:center;color:#8a96a3;font-size:12px;margin:15px 0}.receipt-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;flex-wrap:wrap}.wa-button{background:#1fa855!important;color:#fff!important}.wa-button[disabled]{opacity:.5}.receipt-wa{text-align:right;font-size:12px;color:#1f8a4c;margin-top:8px}.receipt-wa .bad{color:#b5443d}.receipt-actions button{font-size:12px}`;

/** Fee payment receipt dialog (owner Fees page and the student / parent portal). */
@Component({ selector: 'app-receipt-preview', template: TEMPLATE, styles: [STYLES] })
export class ReceiptPreviewComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: ReceiptData, private ref: MatDialogRef<ReceiptPreviewComponent>, private whatsapp: WhatsAppService, private toast: ToastService, private host: ElementRef<HTMLElement>) {}
  get multi(): boolean { return (this.data.items?.length || 0) > 1; }
  get key(): string { return `${this.data.workspace}:${this.data.receiptNo}:${this.data.paid}`; }
  get validPhone(): boolean { return !!WhatsAppService.mobile(this.data.phone); }
  get sentOn(): string { const entry = this.whatsapp.lastSent('receipt', this.key); return entry ? WhatsAppService.when(entry) : ''; }
  /** Prints only the receipt: copies it (with the app's styles) into a hidden frame and prints that. */
  print(): void {
    const receipt = this.host.nativeElement.querySelector('.receipt-wrap');
    if (!receipt) { window.print(); return; }
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(node => node.outerHTML).join('');
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${this.data.receiptNo}</title>${styles}<style>@page{size:A5 portrait;margin:12mm}html,body{background:#fff!important;margin:0}.no-print{display:none!important}.receipt-wrap{min-width:0!important;max-width:480px;margin:0 auto;padding:0!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${receipt.outerHTML}</body></html>`);
    doc.close();
    const run = () => { frame.contentWindow?.focus(); frame.contentWindow?.print(); setTimeout(() => frame.remove(), 1000); };
    // Give the logo and icon font a moment to load before printing.
    setTimeout(run, 400);
  }
  sendWhatsApp(): void {
    if (!this.whatsapp.send('receipt', this.key, this.data.phone, this.whatsapp.receiptText(this.data))) { this.toast.error(`${this.data.student} has no valid mobile number. Update it on the Students page.`); return; }
    this.toast.success(`WhatsApp opened with ${this.data.student}'s receipt. Tap Send in WhatsApp.`);
  }
}

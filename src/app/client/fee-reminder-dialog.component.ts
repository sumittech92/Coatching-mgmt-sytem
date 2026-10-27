import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FeeMessageData, WhatsAppService } from '../core/whatsapp.service';
import { ToastService } from '../core/toast.service';

export interface ReminderRow { fee: FeeMessageData; phone: string; key: string; }
export interface FeeReminderDialogData { rows: ReminderRow[]; isSchool: boolean; }

/** WhatsApp fee reminders: one row per unpaid fee. Each "Send" opens WhatsApp with the message ready; the office taps Send there. */
@Component({
  selector: 'app-fee-reminder-dialog',
  template: `
<h2 mat-dialog-title class="title"><mat-icon>chat</mat-icon>Send fee reminders on WhatsApp</h2>
<mat-dialog-content class="content">
  <p class="intro">WhatsApp opens with the message ready for each student. Tap <strong>Send</strong> in WhatsApp, then come back here for the next one. Messages go from the WhatsApp account signed in on this device.</p>
  <div class="bar">
    <mat-button-toggle-group [(ngModel)]="show" aria-label="Which fees">
      <mat-button-toggle value="all">All dues ({{ data.rows.length }})</mat-button-toggle>
      <mat-button-toggle value="overdue">Overdue ({{ overdueCount }})</mat-button-toggle>
      <mat-button-toggle value="unsent">Not sent today ({{ unsentCount }})</mat-button-toggle>
    </mat-button-toggle-group>
    <span class="progress">{{ sentCount }} of {{ data.rows.length }} sent today</span>
  </div>
  <mat-progress-bar mode="determinate" [value]="data.rows.length ? sentCount / data.rows.length * 100 : 0"></mat-progress-bar>

  <div class="list" *ngIf="rows.length; else empty">
    <div class="row" *ngFor="let row of rows" [class.done]="whatsapp.sentToday('reminder', row.key)">
      <div class="who">
        <strong>{{ row.fee.student }}</strong>
        <small>{{ row.fee.studentId }} · {{ row.fee.month }}</small>
        <small [class.bad]="!valid(row)">{{ valid(row) ? '+91 ' + mobile(row) : 'No valid mobile number – update the student record' }}</small>
      </div>
      <div class="amount"><strong>₹{{ row.fee.due | number }}</strong><app-status-badge [label]="row.fee.status" [tone]="row.fee.status === 'Overdue' ? 'danger' : row.fee.status === 'Partial' ? 'warning' : 'neutral'"></app-status-badge></div>
      <div class="action">
        <small class="sent" *ngIf="last(row) as entry"><mat-icon>done_all</mat-icon>{{ when(entry) }}</small>
        <button mat-stroked-button class="wa" [disabled]="!valid(row)" (click)="send(row)"><mat-icon>send</mat-icon>{{ last(row) ? 'Send again' : 'Send' }}</button>
      </div>
    </div>
  </div>
  <ng-template #empty><app-empty-state icon="task_alt" title="Nothing to send" description="No students match this view."></app-empty-state></ng-template>

  <details class="preview" *ngIf="rows.length">
    <summary>Preview message</summary>
    <pre>{{ whatsapp.reminderText(rows[0].fee) }}</pre>
  </details>
</mat-dialog-content>
<mat-dialog-actions align="end" class="actions">
  <button mat-button mat-dialog-close>Close</button>
  <button mat-flat-button color="primary" [disabled]="!nextRow" (click)="sendNext()"><mat-icon>skip_next</mat-icon>{{ nextRow ? 'Send next: ' + nextRow.fee.student : 'All sent today' }}</button>
</mat-dialog-actions>`,
  styles: [`:host{display:block}.title{display:flex;align-items:center;gap:8px;font-size:clamp(17px, 16.296px + 0.1878vw, 19px);font-weight:700;color:#263447}.title mat-icon{color:#1fa855}
.content{min-width:min(640px,86vw);max-height:70vh}.intro{font-size:12px;color:#6f7d90;margin:0 0 12px;line-height:1.55}
.bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}.bar mat-button-toggle-group{font-size:12px}.progress{margin-left:auto;font-size:12px;color:#6f7d90}
.list{margin-top:10px;border:1px solid #edf0f3;border-radius:10px}.row{display:grid;grid-template-columns:minmax(0,1.6fr) auto minmax(0,1fr);gap:10px;align-items:center;padding:10px 12px;border-top:1px solid #f0f2f4}.row:first-child{border-top:0}.row.done{background:#f4fbf6}
.who strong,.who small{display:block}.who strong{font-size:clamp(12px, 11.648px + 0.0939vw, 13px);color:#344256}.who small{font-size:12px;color:#8a96a3;margin-top:2px}.who small.bad{color:#b5443d}
.amount{display:flex;flex-direction:column;align-items:flex-end;gap:4px}.amount strong{font-size:clamp(12px, 11.648px + 0.0939vw, 13px);color:#b5534a}
.action{display:flex;flex-direction:column;align-items:flex-end;gap:4px}.sent{display:flex;align-items:center;gap:3px;font-size:12px;color:#1f8a4c}.sent mat-icon{font-size:15px;width:15px;height:15px}
.wa{font-size:12px;height:32px;color:#178a47;border-color:#9fd8b5}.wa mat-icon{font-size:16px;width:16px;height:16px}
.preview{margin-top:12px;font-size:12px;color:#536176}.preview summary{cursor:pointer;font-weight:650}.preview pre{white-space:pre-wrap;font:12px/1.55 inherit;background:#effaf2;border-radius:10px;padding:12px;margin-top:8px;color:#29374a}
.actions{padding:12px 24px 18px;gap:8px}.actions button{font-size:12px}
@media(max-width:600px){.content{min-width:0}.row{grid-template-columns:1fr auto}.action{grid-column:1/-1;flex-direction:row;justify-content:space-between;align-items:center}.progress{margin-left:0}}`]
})
export class FeeReminderDialogComponent {
  show: 'all' | 'overdue' | 'unsent' = 'all';
  constructor(@Inject(MAT_DIALOG_DATA) public data: FeeReminderDialogData, public whatsapp: WhatsAppService, private toast: ToastService) {}

  get rows(): ReminderRow[] {
    return this.data.rows.filter(row => this.show === 'all' || (this.show === 'overdue' ? row.fee.status === 'Overdue' : !this.whatsapp.sentToday('reminder', row.key)));
  }
  get overdueCount(): number { return this.data.rows.filter(row => row.fee.status === 'Overdue').length; }
  get sentCount(): number { return this.data.rows.filter(row => this.whatsapp.sentToday('reminder', row.key)).length; }
  get unsentCount(): number { return this.data.rows.length - this.sentCount; }
  get nextRow(): ReminderRow | undefined { return this.rows.find(row => this.valid(row) && !this.whatsapp.sentToday('reminder', row.key)); }

  mobile(row: ReminderRow): string { return WhatsAppService.mobile(row.phone); }
  valid(row: ReminderRow): boolean { return !!this.mobile(row); }
  last(row: ReminderRow) { return this.whatsapp.lastSent('reminder', row.key); }
  when = WhatsAppService.when;

  send(row: ReminderRow): void {
    if (!this.whatsapp.send('reminder', row.key, row.phone, this.whatsapp.reminderText(row.fee))) { this.toast.error(`${row.fee.student} has no valid mobile number. Update it on the Students page.`); return; }
    this.toast.success(`WhatsApp opened for ${row.fee.student}. Tap Send in WhatsApp.`);
  }
  sendNext(): void { const row = this.nextRow; if (row) this.send(row); }
}

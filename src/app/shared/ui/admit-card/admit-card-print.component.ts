import { Component, ElementRef, Inject, ViewChild, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AdmitCard } from '../../../core/test-api.service';

/** School branding and the cards to show. One card per student; printing puts each on its own page. */
export interface AdmitCardPrintData {
  cards: AdmitCard[];
  institution: string;
  logo?: string | null;
  address?: string;
  registration?: string;
}

/** Card styles: used on screen (unscoped, under .admit-sheet) and copied into the print frame. */
const CARD_CSS = `
.admit-sheet{color:#24324a;font-family:Inter,'Segoe UI',Arial,sans-serif}
.admit-card{border:1.5px solid #2c3a66;border-radius:10px;padding:18px 20px;margin:0 0 18px;background:#fff;page-break-after:always;break-after:page}
.admit-card:last-child{page-break-after:auto;break-after:auto;margin-bottom:0}
.ac-head{display:flex;align-items:center;gap:14px;border-bottom:1.5px solid #2c3a66;padding-bottom:12px}
.ac-logo{flex:none;width:54px;height:54px;border-radius:10px;background:#272f62;color:#fff;display:grid;place-items:center;font:700 24px Georgia,serif;overflow:hidden}
.ac-logo img{width:100%;height:100%;object-fit:contain;background:#fff}
.ac-school{flex:1;min-width:0}
.ac-school strong{display:block;font-size:18px;color:#272f62;line-height:1.2}
.ac-school small{display:block;font-size:11px;color:#6d7787;margin-top:2px}
.ac-title{text-align:center;margin:12px 0 4px;font-size:15px;font-weight:800;letter-spacing:.16em;color:#272f62}
.ac-exam{text-align:center;font-size:12px;color:#4d5a70;margin-bottom:12px}
.ac-body{display:flex;gap:16px;align-items:flex-start}
.ac-details{flex:1;min-width:0;display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;font-size:12px}
.ac-details div{display:flex;gap:6px;border-bottom:1px dotted #d3d9e2;padding:3px 0;min-width:0}
.ac-details span{color:#6d7787;white-space:nowrap}
.ac-details b{color:#1f2b40;font-weight:650;overflow-wrap:anywhere}
.ac-photo{flex:none;width:96px;height:116px;border:1px solid #9aa5b5;border-radius:4px;display:grid;place-items:center;text-align:center;font-size:10px;color:#8a94a3;overflow:hidden}
.ac-photo img{width:100%;height:100%;object-fit:cover}
.ac-time{margin:12px 0 8px;font-size:12px;background:#f1f4fa;border-radius:6px;padding:7px 10px}
.ac-table{width:100%;border-collapse:collapse;font-size:12px}
.ac-table th,.ac-table td{border:1px solid #b9c2cf;padding:6px 8px;text-align:left}
.ac-table th{background:#eef1f7;font-size:11px;letter-spacing:.04em;color:#3a4760}
.ac-table td.sign{width:22%}
.ac-instructions{margin:12px 0 0;font-size:11px;color:#3d4a60}
.ac-instructions strong{display:block;margin-bottom:3px;font-size:12px}
.ac-instructions ol{margin:0;padding-left:18px}
.ac-signs{display:flex;justify-content:space-between;gap:12px;margin-top:38px;font-size:11px;color:#4d5a70}
.ac-signs div{flex:1;text-align:center;border-top:1px solid #7d8899;padding-top:4px}
.ac-foot{margin-top:10px;font-size:10px;color:#8a94a3;text-align:right}
@media (max-width:600px){.ac-body{flex-direction:column-reverse}.ac-details{grid-template-columns:1fr}}
`;

/** Admit card preview with Print (staff: a whole class at once; student: their own card). */
@Component({
  selector: 'app-admit-card-print',
  encapsulation: ViewEncapsulation.None,
  styles: [CARD_CSS + `.admit-print-wrap{padding:22px 24px;min-width:min(760px,86vw)}
.admit-print-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.admit-print-head h2{margin:0;font-size:18px;font-weight:700;color:#263447}
.admit-print-head p{margin:2px 0 0;font-size:12px;color:#8290a0}
.admit-print-actions{display:flex;gap:8px}
.admit-print-scroll{max-height:68vh;overflow:auto;padding:2px}`],
  template: `<div class="admit-print-wrap">
  <div class="admit-print-head">
    <div><h2>Admit card{{ data.cards.length > 1 ? 's' : '' }}</h2><p>{{ data.cards.length }} card{{ data.cards.length === 1 ? '' : 's' }} · each prints on its own page</p></div>
    <div class="admit-print-actions"><button mat-stroked-button mat-dialog-close>Close</button><button mat-flat-button color="primary" (click)="print()"><mat-icon>print</mat-icon> Print / Save PDF</button></div>
  </div>
  <div class="admit-print-scroll">
    <div class="admit-sheet" #sheet>
      <div class="admit-card" *ngFor="let card of data.cards">
        <div class="ac-head">
          <span class="ac-logo"><img *ngIf="data.logo; else initial" [src]="data.logo" alt=""><ng-template #initial>{{ (data.institution || 'S').charAt(0) }}</ng-template></span>
          <div class="ac-school"><strong>{{ data.institution }}</strong><small *ngIf="data.address">{{ data.address }}</small><small *ngIf="data.registration">{{ data.registration }}</small></div>
        </div>
        <div class="ac-title">ADMIT CARD</div>
        <div class="ac-exam">{{ card.exam.name }}<ng-container *ngIf="card.exam.term"> · {{ card.exam.term }}</ng-container> · {{ card.exam.className }}</div>
        <div class="ac-body">
          <div class="ac-details">
            <div><span>Admit card no.</span><b>{{ card.admitNo }}</b></div>
            <div><span>Student ID</span><b>{{ card.student.studentCode }}</b></div>
            <div><span>Name</span><b>{{ card.student.fullName || '—' }}</b></div>
            <div><span>Roll no.</span><b>{{ card.student.rollNumber || '—' }}</b></div>
            <div><span>Class</span><b>{{ card.student.className }}</b></div>
            <div><span>Section</span><b>{{ card.student.section }}</b></div>
            <div><span>Father's name</span><b>{{ card.student.fatherName || '—' }}</b></div>
            <div><span>Mother's name</span><b>{{ card.student.motherName || '—' }}</b></div>
            <div><span>Date of birth</span><b>{{ card.student.dateOfBirth ? (card.student.dateOfBirth | date: 'dd MMM yyyy' : 'UTC') : '—' }}</b></div>
          </div>
          <div class="ac-photo"><img *ngIf="card.student.profileImage; else noPhoto" [src]="card.student.profileImage" alt=""><ng-template #noPhoto>Paste recent<br>passport photo</ng-template></div>
        </div>
        <div class="ac-time" *ngIf="card.exam.startTime">Exam time for every paper: <b>{{ clock(card.exam.startTime) }}<ng-container *ngIf="card.exam.endTime"> – {{ clock(card.exam.endTime) }}</ng-container></b></div>
        <table class="ac-table" [style.margin-top.px]="card.exam.startTime ? 0 : 12">
          <thead><tr><th>#</th><th>DATE</th><th>DAY</th><th>SUBJECT</th><th>MAX MARKS</th><th>INVIGILATOR'S SIGN</th></tr></thead>
          <tbody>
            <tr *ngFor="let paper of card.papers; let i = index"><td>{{ i + 1 }}</td><td>{{ paper.date | date: 'dd MMM yyyy' : 'UTC' }}</td><td>{{ paper.date | date: 'EEEE' : 'UTC' }}</td><td>{{ paper.subject }}</td><td>{{ paper.maxMarks }}</td><td class="sign"></td></tr>
          </tbody>
        </table>
        <div class="ac-instructions" *ngIf="lines(card.exam.instructions).length"><strong>Instructions</strong><ol><li *ngFor="let line of lines(card.exam.instructions)">{{ line }}</li></ol></div>
        <div class="ac-signs"><div>Student's signature</div><div>Class teacher</div><div>Principal</div></div>
        <div class="ac-foot">Issued on {{ card.issuedAt | date: 'dd MMM yyyy, h:mm a' }}</div>
      </div>
    </div>
  </div>
</div>`
})
export class AdmitCardPrintComponent {
  @ViewChild('sheet', { static: true }) sheet!: ElementRef<HTMLElement>;
  constructor(@Inject(MAT_DIALOG_DATA) public data: AdmitCardPrintData) {}

  clock(time: string | null): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'am' : 'pm'}`;
  }
  lines(text: string | null): string[] { return String(text || '').split('\n').map(line => line.trim()).filter(Boolean); }

  /** Prints the cards from a hidden frame so every card gets its own A4 page (the dialog itself would clip them). */
  print(): void {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    const title = this.data.cards.length === 1 ? `Admit card ${this.data.cards[0].admitNo}` : `Admit cards ${this.data.cards[0]?.exam.name || ''}`;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, '&lt;')}</title><style>@page{size:A4;margin:12mm}body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}${CARD_CSS}.admit-card{border-radius:0}</style></head><body><div class="admit-sheet">${this.sheet.nativeElement.innerHTML}</div></body></html>`);
    doc.close();
    const images = Array.from(doc.images).filter(image => !image.complete);
    const ready = Promise.all(images.map(image => new Promise(resolve => { image.onload = image.onerror = resolve; })));
    // Don't wait forever for a slow photo.
    Promise.race([ready, new Promise(resolve => setTimeout(resolve, 3000))]).then(() => {
      frame.contentWindow!.focus();
      frame.contentWindow!.print();
      setTimeout(() => frame.remove(), 1000);
    });
  }
}

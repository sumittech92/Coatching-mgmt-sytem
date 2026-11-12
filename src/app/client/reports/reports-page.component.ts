import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import { MockAuthService } from '../../core/mock-auth.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { ToastService } from '../../core/toast.service';
import { Report, ReportApiService, ReportColumn, ReportType } from '../../core/report-api.service';

type RangeKey = 'thisMonth' | 'lastMonth' | 'session' | 'custom';
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Owner reports (fees, attendance, admissions, academic) for a date range, with Excel export and a print view. */
@Component({ selector: 'app-reports-page', templateUrl: './reports-page.component.html', styleUrls: ['./reports-page.component.scss'] })
export class ReportsPageComponent implements OnInit {
  readonly types: { key: ReportType; label: string; icon: string }[] = [
    { key: 'fees', label: 'Fees', icon: 'payments' }, { key: 'attendance', label: 'Attendance', icon: 'event_available' },
    { key: 'admissions', label: 'Admissions', icon: 'person_add_alt' }, { key: 'academic', label: 'Academic', icon: 'emoji_events' }
  ];
  readonly ranges: { key: RangeKey; label: string }[] = [{ key: 'thisMonth', label: 'This month' }, { key: 'lastMonth', label: 'Last month' }, { key: 'session', label: 'This session (Apr – Mar)' }, { key: 'custom', label: 'Custom range' }];
  type: ReportType = 'fees';
  range: RangeKey = 'thisMonth';
  from: Date = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  to: Date = new Date();
  report?: Report;
  loading = false;

  constructor(private api: ReportApiService, private auth: MockAuthService, private tenant: TenantContextService, private toast: ToastService) {}

  get live(): boolean { return !!this.auth.token; }
  get isSchool(): boolean { return this.tenant.isSchool; }
  get workspaceLabel(): string { return this.isSchool ? 'School' : 'Coaching'; }
  get typeLabel(): string { return this.types.find(item => item.key === this.type)?.label || ''; }
  get rangeLabel(): string { return this.report ? `${this.day(this.report.from)} – ${this.day(this.report.to)}` : ''; }

  ngOnInit(): void { if (this.live) this.load(); }

  selectType(type: ReportType): void { this.type = type; this.load(); }

  /** Quick ranges set the dates; "Custom" waits for the date pickers. */
  selectRange(range: RangeKey): void {
    this.range = range;
    const now = new Date();
    if (range === 'thisMonth') { this.from = new Date(now.getFullYear(), now.getMonth(), 1); this.to = now; }
    if (range === 'lastMonth') { this.from = new Date(now.getFullYear(), now.getMonth() - 1, 1); this.to = new Date(now.getFullYear(), now.getMonth(), 0); }
    if (range === 'session') { const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; this.from = new Date(year, 3, 1); this.to = now; }
    if (range !== 'custom') this.load();
  }

  load(): void {
    if (!this.live) return;
    if (!this.from || !this.to) { this.toast.error('Choose both dates.'); return; }
    if (this.to < this.from) { this.toast.error('“To” date must be on or after the “from” date.'); return; }
    this.loading = true;
    this.api.report(this.auth.token!, this.type, iso(this.from), iso(this.to)).subscribe({
      next: report => { this.loading = false; this.report = report; },
      error: (error: Error) => { this.loading = false; this.report = undefined; this.toast.error(error.message); }
    });
  }

  /** Display text for one cell. */
  cell(value: unknown, column: ReportColumn): string {
    if (value === null || value === undefined || value === '') return '—';
    if (column.type === 'money') return `₹${Number(value).toLocaleString('en-IN')}`;
    if (column.type === 'percent') return `${value}%`;
    if (column.type === 'number') return Number(value).toLocaleString('en-IN');
    if (column.type === 'date') return this.day(String(value));
    return String(value);
  }
  summaryValue(value: string | number, label: string): string { return typeof value === 'number' && /collected|pending/i.test(label) ? `₹${value.toLocaleString('en-IN')}` : String(value); }
  day(value: string): string { return new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }

  /** One sheet for the summary and one per table; numbers stay numbers so Excel can total them. */
  exportExcel(): void {
    if (!this.report) return;
    const book = XLSX.utils.book_new();
    const name = this.tenant.current.businessName || 'Institute';
    const summary = [[`${name} · ${this.typeLabel} report`], [`${this.rangeLabel}`], [], ['Measure', 'Value', 'Note'], ...this.report.summary.map(item => [item.label, item.value, item.hint || ''])];
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(summary), 'Summary');
    this.report.tables.forEach(table => {
      const rows = [table.columns.map(column => column.label), ...table.rows.map(row => table.columns.map(column => column.type === 'date' && row[column.key] ? this.day(String(row[column.key])) : row[column.key] ?? ''))];
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), table.title.replace(/[\\/?*[\]:]/g, '').slice(0, 31));
    });
    XLSX.writeFile(book, `${this.typeLabel.toLowerCase()}-report-${this.report.from}-to-${this.report.to}.xlsx`);
  }

  /** The browser's print dialog (choose "Save as PDF"); print styles hide the panel chrome. */
  print(): void { window.print(); }
}

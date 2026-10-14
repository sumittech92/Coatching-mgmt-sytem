import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { RecordDialogComponent } from '../management/record-dialog.component';
import { ConfirmationDialogService } from '../../core/confirmation-dialog.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { ToastService } from '../../core/toast.service';
import { ModuleConfig, ModuleRow, moduleConfig } from './module-registry';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';
const TONES: Record<string, Tone> = {
  active: 'success', current: 'success', published: 'success', submitted: 'success', completed: 'neutral', closed: 'neutral',
  upcoming: 'info', scheduled: 'info', assigned: 'info', draft: 'warning', inactive: 'neutral', cancelled: 'danger'
};

/** Generic academic page (Classes, Sections, Homework, Tests, Marks entry…) driven by module-registry. */
@Component({ selector: 'app-module-page', templateUrl: './module-page.component.html', styleUrls: ['./module-page.component.scss'] })
export class ModulePageComponent implements OnInit {
  key = '';
  config!: ModuleConfig;
  search = '';
  filter = '';

  constructor(private route: ActivatedRoute, private router: Router, private dialog: MatDialog, private confirm: ConfirmationDialogService, private auth: MockAuthService, private tenant: TenantContextService, private toast: ToastService) {}

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      this.key = segments[segments.length - 1]?.path || '';
      const config = moduleConfig(this.key, this.tenant.current.businessType);
      if (!config) { this.router.navigateByUrl('/client/dashboard'); return; }
      this.config = config;
      this.search = this.filter = '';
    });
  }

  get canEdit(): boolean { return this.config.editors.includes(this.auth.role); }
  get workspaceLabel(): string { return this.tenant.isSchool ? 'School' : 'Coaching'; }
  get filterLabel(): string { return this.config.columns.find(column => column.key === this.config.filterKey)?.label || 'Filter'; }
  get filterOptions(): string[] {
    const key = this.config.filterKey;
    return key ? [...new Set(this.config.rows.map(row => String(row[key] ?? '')).filter(Boolean))] : [];
  }
  get filtered(): ModuleRow[] {
    const query = this.search.trim().toLowerCase();
    const key = this.config.filterKey;
    return this.config.rows.filter(row => (!query || Object.values(row).join(' ').toLowerCase().includes(query)) && (!this.filter || !key || String(row[key]) === this.filter));
  }
  /** Small summary chips above the table: total plus a count per status. */
  get summary(): { label: string; value: number }[] {
    const chips = [{ label: `Total ${this.config.title.toLowerCase()}`, value: this.config.rows.length }];
    if (!this.config.columns.some(column => column.key === 'status')) return chips;
    const counts = new Map<string, number>();
    this.config.rows.forEach(row => counts.set(row['status'], (counts.get(row['status']) || 0) + 1));
    counts.forEach((value, label) => label && chips.push({ label, value }));
    return chips.slice(0, 4);
  }

  tone(value: unknown): Tone { return TONES[String(value).toLowerCase()] || 'neutral'; }
  trackById(_: number, row: ModuleRow): number { return row.id; }

  open(row?: ModuleRow, draft?: Record<string, unknown>): void {
    if (!this.canEdit) return;
    const ref = this.dialog.open(RecordDialogComponent, {
      width: '640px', maxWidth: 'calc(100vw - 24px)',
      data: { title: `${row ? 'Edit' : 'Add'} ${this.config.singular}`, submitLabel: row ? 'Save changes' : this.config.action, fields: this.config.fields, record: draft || row, successMessage: '' }
    });
    ref.afterClosed().subscribe((value: Record<string, unknown> | undefined) => {
      if (!value) return;
      const problem = this.problem(value);
      if (problem) { this.toast.error(problem); this.open(row, value); return; }
      this.config.fields.forEach(field => { if (field.type === 'date' && value[field.key] instanceof Date) value[field.key] = (value[field.key] as Date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); });
      const label = String(value['name'] || value['title'] || value['student'] || this.config.singular);
      if (row) Object.assign(row, value); else this.config.rows.unshift({ ...value, id: Date.now() });
      this.toast.success(`${this.capital(this.config.singular)} “${label}” ${row ? 'updated' : 'added'}.`);
    });
  }

  view(row: ModuleRow): void {
    this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: `${this.capital(this.config.singular)} details`, submitLabel: 'Done', fields: this.config.fields, record: row, readonly: true } });
  }

  remove(row: ModuleRow): void {
    if (!this.canEdit) return;
    const label = row['name'] || row['title'] || row['student'] || this.config.singular;
    this.confirm.confirm({ title: `Delete ${this.config.singular}?`, message: `Delete “${label}”? This demo action cannot be undone.`, confirmLabel: 'Delete', destructive: true }).subscribe(ok => {
      if (!ok) return;
      this.config.rows.splice(this.config.rows.indexOf(row), 1);
      this.toast.success(`${this.capital(this.config.singular)} “${label}” deleted.`);
    });
  }

  go(route: string): void { this.router.navigateByUrl(route); }

  /** Checks that compare two fields, which the shared dialog can't express. */
  private problem(value: Record<string, unknown>): string {
    const time = (v: unknown): number => v instanceof Date ? v.getTime() : v ? new Date(String(v)).getTime() : NaN;
    if (value['start'] && value['end'] && time(value['end']) < time(value['start'])) return 'End date must be on or after the start date.';
    if (value['marks'] !== undefined && value['maxMarks'] !== undefined && value['marks'] !== '') {
      const marks = Number(value['marks']), max = Number(value['maxMarks']);
      if (!(max > 0)) return 'Maximum marks must be greater than 0.';
      if (marks < 0 || marks > max) return `Marks obtained must be between 0 and ${max}.`;
    }
    if (value['maxMarks'] !== undefined && !(Number(value['maxMarks']) > 0)) return 'Maximum marks must be greater than 0.';
    return '';
  }

  private capital(text: string): string { return text.charAt(0).toUpperCase() + text.slice(1); }
}

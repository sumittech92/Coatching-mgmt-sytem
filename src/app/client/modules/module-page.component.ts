import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { RecordDialogComponent } from '../management/record-dialog.component';
import { ConfirmationDialogService } from '../../core/confirmation-dialog.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { ToastService } from '../../core/toast.service';
import { ModuleConfig, ModuleRow, moduleConfig } from './module-registry';
import { ModuleApiAdapter, ModuleApiService, ModulePageAction, ModuleRowAction } from './module-api.service';
import { RecordField } from '../management/record-dialog.component';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';
const TONES: Record<string, Tone> = {
  active: 'success', current: 'success', published: 'success', submitted: 'success', completed: 'neutral', closed: 'neutral',
  upcoming: 'info', scheduled: 'info', overdue: 'danger', 'results published': 'success', assigned: 'info', draft: 'warning', inactive: 'neutral', cancelled: 'danger',
  paid: 'success', pending: 'warning', working: 'success', damaged: 'danger', 'under repair': 'warning'
};

/** Generic academic page (Classes, Sections, Homework, Tests, Marks entry…) driven by module-registry. */
@Component({ selector: 'app-module-page', templateUrl: './module-page.component.html', styleUrls: ['./module-page.component.scss'] })
export class ModulePageComponent implements OnInit {
  key = '';
  config!: ModuleConfig;
  search = '';
  filter = '';
  /** Set when this page reads and writes crm-backend (signed-in account); demo sessions use the registry's sample rows. */
  api?: ModuleApiAdapter;
  loading = false;

  constructor(private route: ActivatedRoute, private router: Router, private dialog: MatDialog, private confirm: ConfirmationDialogService, private auth: MockAuthService, private tenant: TenantContextService, private toast: ToastService, private moduleApi: ModuleApiService) {}

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      this.key = segments[segments.length - 1]?.path || '';
      const config = moduleConfig(this.key, this.tenant.current.businessType);
      if (!config) { this.router.navigateByUrl('/client/dashboard'); return; }
      this.config = config;
      this.search = this.filter = '';
      this.api = this.moduleApi.adapter(this.key, this.tenant.current.businessType);
      if (this.api) this.load(config);
    });
  }

  private load(config: ModuleConfig): void {
    const api = this.api!;
    this.config = { ...config, columns: api.columns || config.columns, rows: [] };
    this.loading = true;
    api.load().subscribe({
      next: rows => { this.loading = false; if (this.api === api) this.config.rows = rows; },
      error: (error: Error) => { this.loading = false; this.toast.error(error.message); }
    });
  }

  get fields(): RecordField[] { return this.api ? this.api.fields() : this.config.fields; }

  get canEdit(): boolean { return this.config.editors.includes(this.auth.role); }
  get canCreate(): boolean { return this.canEdit && this.api?.canCreate !== false; }
  canEditRow(row: ModuleRow): boolean { return this.canEdit && (this.api?.canEditRow?.(row) ?? true); }
  actionsFor(row: ModuleRow): ModuleRowAction[] { return this.api?.rowActions?.(row) || []; }
  runAction(row: ModuleRow, action: ModuleRowAction): void {
    action.run().subscribe({
      next: saved => { if (!saved) return; Object.assign(row, saved); if (action.done) this.toast.success(action.done); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  /** Page buttons from the adapter (only for people who may edit). */
  get pageActions(): ModulePageAction[] { return this.canEdit ? this.api?.pageActions || [] : []; }
  runPageAction(action: ModulePageAction): void {
    action.run().subscribe({
      next: rows => { if (rows) this.config.rows = rows; },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
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
  get summary(): { label: string; value: number | string }[] {
    if (this.api?.summary) return this.api.summary(this.config.rows);
    const chips: { label: string; value: number | string }[] = [{ label: `Total ${this.config.title.toLowerCase()}`, value: this.config.rows.length }];
    if (!this.config.columns.some(column => column.key === 'status')) return chips;
    const counts = new Map<string, number>();
    this.config.rows.forEach(row => counts.set(row['status'], (counts.get(row['status']) || 0) + 1));
    counts.forEach((value, label) => label && chips.push({ label, value }));
    return chips.slice(0, 4);
  }

  tone(value: unknown): Tone { return TONES[String(value).toLowerCase()] || 'neutral'; }
  trackById(_: number, row: ModuleRow): number { return row.id; }
  /** Row actions are rebuilt on every check; keeping their buttons by label stops a click landing on a replaced button. */
  trackByLabel(_: number, action: ModuleRowAction): string { return action.label; }

  open(row?: ModuleRow, draft?: Record<string, unknown>): void {
    if (!this.canEdit) return;
    const blocker = row ? '' : this.api?.blocker?.();
    if (blocker) { this.toast.warning(blocker); return; }
    if (this.api?.edit) {
      this.api.edit(row).subscribe({
        next: saved => {
          if (!saved) return;
          if (row) Object.assign(row, saved); else this.config.rows = [saved, ...this.config.rows];
          this.toast.success(`${this.capital(this.config.singular)} “${saved['name'] || saved['title'] || this.config.singular}” ${row ? 'updated' : this.api?.createdVerb || 'added'}.`);
        },
        error: (error: Error) => this.toast.error(error.message)
      });
      return;
    }
    const ref = this.dialog.open(RecordDialogComponent, {
      width: '640px', maxWidth: 'calc(100vw - 24px)',
      data: { title: `${row ? 'Edit' : 'Add'} ${this.config.singular}`, submitLabel: row ? 'Save changes' : this.config.action, fields: this.fields, record: draft || row, successMessage: '' }
    });
    ref.afterClosed().subscribe((value: Record<string, unknown> | undefined) => {
      if (!value) return;
      const problem = this.problem(value);
      if (problem) { this.toast.error(problem); this.open(row, value); return; }
      if (this.api) { this.saveApi(value, row); return; }
      this.config.fields.forEach(field => { if (field.type === 'date' && value[field.key] instanceof Date) value[field.key] = (value[field.key] as Date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); });
      const label = String(value['name'] || value['title'] || value['student'] || this.config.singular);
      if (row) Object.assign(row, value); else this.config.rows.unshift({ ...value, id: Date.now() });
      this.toast.success(`${this.capital(this.config.singular)} “${label}” ${row ? 'updated' : 'added'}.`);
    });
  }

  view(row: ModuleRow): void {
    this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: `${this.capital(this.config.singular)} details`, submitLabel: 'Done', fields: this.fields, record: row, readonly: true } });
  }

  remove(row: ModuleRow): void {
    if (!this.canEdit) return;
    const label = row['name'] || row['title'] || row['student'] || this.config.singular;
    this.confirm.confirm({ title: `Delete ${this.config.singular}?`, message: `Delete “${label}”? ${this.api ? 'This action' : 'This demo action'} cannot be undone.`, confirmLabel: 'Delete', destructive: true }).subscribe(ok => {
      if (!ok) return;
      if (this.api) {
        this.api.remove(row).subscribe({
          next: () => { this.config.rows = this.config.rows.filter(item => item !== row); this.toast.success(`${this.capital(this.config.singular)} “${label}” deleted.`); },
          error: (error: Error) => this.toast.error(error.message)
        });
        return;
      }
      this.config.rows.splice(this.config.rows.indexOf(row), 1);
      this.toast.success(`${this.capital(this.config.singular)} “${label}” deleted.`);
    });
  }

  private saveApi(value: Record<string, unknown>, row?: ModuleRow): void {
    let request;
    // Adapters may reject the values before calling the server; keep the form open with what was typed.
    try { request = this.api!.save(value, row); } catch (error) { this.toast.error((error as Error).message); this.open(row, value); return; }
    request.subscribe({
      next: saved => {
        if (row) Object.assign(row, saved); else this.config.rows = [...this.config.rows, saved];
        this.toast.success(`${this.capital(this.config.singular)} “${saved['name'] || saved['title'] || this.config.singular}” ${row ? 'updated' : this.api?.createdVerb || 'added'}.`);
        if (this.api?.refreshAfterSave) this.load(this.config);
      },
      // Reopen with the entered values so nothing is lost.
      error: (error: Error) => { this.toast.error(error.message); this.open(row, value); }
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

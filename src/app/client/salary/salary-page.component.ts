import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';
import { RecordDialogComponent } from '../management/record-dialog.component';
import { SalarySlipComponent, SalarySlipData } from '../operations/salary-slip.component';
import { ConfirmationDialogService } from '../../core/confirmation-dialog.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { ToastService } from '../../core/toast.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { WebsiteContentService } from '../../core/website-content.service';
import { dayLabel, isoDay } from '../../core/api-client';
import { ApiSalary, ApiSalaryMode, SALARY_MODE_LABELS, SalaryApiService, SalaryPayload, TeacherSalarySetup } from '../../core/salary-api.service';

const MODE_VALUES = Object.fromEntries(Object.entries(SALARY_MODE_LABELS).map(([value, label]) => [label, value])) as Record<string, ApiSalaryMode>;
const monthKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const num = (value: unknown): number => Number(value) || 0;
const text = (value: unknown): string | null => String(value ?? '').trim() || null;

/** Owner payroll: monthly salaries, each teacher's regular pay, and salary history. */
@Component({ selector: 'app-salary-page', templateUrl: './salary-page.component.html', styleUrls: ['./salary-page.component.scss'] })
export class SalaryPageComponent implements OnInit {
  tab = 0;
  loading = false; busy = false;
  month = monthKey(new Date());
  salaries: ApiSalary[] = [];
  setups: TeacherSalarySetup[] = [];
  search = ''; statusFilter = '';
  historyTeacher = ''; historyYear = String(new Date().getFullYear());
  readonly payrollColumns = ['teacher', 'basic', 'allowances', 'bonus', 'deductions', 'net', 'status', 'paid', 'action'];
  readonly setupColumns = ['teacher', 'basic', 'allowances', 'deductions', 'net', 'payment', 'action'];
  readonly historyColumns = ['month', 'teacher', 'gross', 'deductions', 'net', 'status', 'paid'];
  readonly modeLabels = SALARY_MODE_LABELS;

  constructor(private api: SalaryApiService, private dialog: MatDialog, private confirm: ConfirmationDialogService, public auth: MockAuthService, private toast: ToastService, private tenant: TenantContextService, private content: WebsiteContentService) {}

  private get token(): string | null { return this.auth.token; }

  ngOnInit(): void { this.load(); }

  load(): void {
    const token = this.token;
    if (!token) return;
    this.loading = true;
    forkJoin({ salaries: this.api.list(token), setups: this.api.structures(token) }).subscribe({
      next: result => { this.loading = false; this.salaries = result.salaries; this.setups = result.setups; },
      error: (error: Error) => { this.loading = false; this.toast.error(error.message); }
    });
  }

  // ---------------------------------------------------------------- Month

  get monthLabel(): string { return SalaryApiService.monthLabel(this.month); }
  shiftMonth(step: number): void { const [year, value] = this.month.split('-').map(Number); this.month = monthKey(new Date(year, value - 1 + step, 1)); }
  get isFutureMonth(): boolean { return this.month > monthKey(new Date()); }
  /** Months to jump to: 12 back and 2 ahead, plus any month that has salaries. */
  get monthOptions(): { key: string; label: string }[] {
    // Cached: new option objects on every check make the month dropdown reset its selection endlessly.
    const cacheKey = `${this.month}|${this.salaries.length}`;
    if (cacheKey === this.monthCache.key) return this.monthCache.options;
    const now = new Date();
    const keys = new Set([...Array.from({ length: 15 }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() + 2 - i, 1))), ...this.salaries.map(item => item.month), this.month]);
    this.monthCache = { key: cacheKey, options: [...keys].sort().reverse().map(key => ({ key, label: SalaryApiService.monthLabel(key) })) };
    return this.monthCache.options;
  }
  private monthCache = { key: '', options: [] as { key: string; label: string }[] };

  // ---------------------------------------------------------------- Payroll (selected month)

  get monthSalaries(): ApiSalary[] { return this.salaries.filter(item => item.month === this.month); }
  get payroll(): ApiSalary[] {
    const q = this.search.trim().toLowerCase();
    return this.monthSalaries.filter(item => (!this.statusFilter || item.status === this.statusFilter) && (!q || `${item.teacherName} ${item.teacherCode}`.toLowerCase().includes(q)));
  }
  total(list: ApiSalary[]): number { return list.reduce((sum, item) => sum + item.netPay, 0); }
  get paid(): ApiSalary[] { return this.monthSalaries.filter(item => item.status === 'paid'); }
  get pending(): ApiSalary[] { return this.monthSalaries.filter(item => item.status === 'pending'); }
  get activeTeachers(): TeacherSalarySetup[] { return this.setups.filter(item => item.status !== 'inactive'); }
  get withoutSetup(): TeacherSalarySetup[] { return this.activeTeachers.filter(item => !item.structure); }
  /** Active teachers with no salary yet for the month. */
  get missing(): TeacherSalarySetup[] { return this.activeTeachers.filter(teacher => !this.monthSalaries.some(item => item.teacherCode === teacher.teacherCode)); }
  get paidPercent(): number { const all = this.total(this.monthSalaries); return all ? Math.round(this.total(this.paid) / all * 100) : 0; }
  rupees(value: number): string { return SalaryApiService.rupees(value); }
  day(value: string | null): string { return dayLabel(value); }
  hasSalary(code: string): boolean { return this.monthSalaries.some(item => item.teacherCode === code); }
  setupOf(code: string): TeacherSalarySetup | undefined { return this.setups.find(item => item.teacherCode === code); }

  generate(): void {
    const token = this.token;
    if (!token || this.busy) return;
    if (!this.activeTeachers.length) { this.toast.warning('Add teachers first, then set their salary.'); return; }
    this.busy = true;
    this.api.generate(token, this.month).subscribe({
      next: result => {
        this.busy = false;
        const made = result.created ? `${result.created} salar${result.created === 1 ? 'y' : 'ies'} created for ${this.monthLabel}.` : `No new salaries for ${this.monthLabel}.`;
        const skipped = result.skipped.length ? ` Set the salary of ${result.skipped.length === 1 ? result.skipped[0] : result.skipped.length + ' teachers'} in “Salary setup” first.` : '';
        (result.created ? this.toast.success.bind(this.toast) : this.toast.info.bind(this.toast))(made + skipped);
        if (result.skipped.length && !result.created) this.tab = 1;
        this.load();
      },
      error: (error: Error) => { this.busy = false; this.toast.error(error.message); }
    });
  }

  payAll(): void {
    const token = this.token;
    const pending = this.pending;
    if (!token || !pending.length) return;
    this.dialog.open(RecordDialogComponent, {
      width: '520px', maxWidth: 'calc(100vw - 24px)',
      data: { title: `Mark all paid · ${this.monthLabel}`, submitLabel: `Pay ${pending.length} · ${this.rupees(this.total(pending))}`, successMessage: '', record: { mode: 'Bank transfer', paidOn: new Date() },
        fields: [{ key: 'mode', label: 'Paid by', type: 'select', options: Object.values(SALARY_MODE_LABELS), required: true }, { key: 'paidOn', label: 'Paid on', type: 'date', required: true }, { key: 'reference', label: 'Reference / batch no.', hint: 'Optional, saved on every slip' }] }
    }).afterClosed().subscribe(value => {
      if (!value) return;
      if (isoDay(value.paidOn) > isoDay(new Date())) { this.toast.error('Paid date cannot be in the future.'); return; }
      this.api.payAll(token, { month: this.month, mode: MODE_VALUES[value.mode] || 'bank', paidOn: isoDay(value.paidOn), reference: text(value.reference) }).subscribe({
        next: result => { this.toast.success(`${result.paid} salar${result.paid === 1 ? 'y' : 'ies'} marked as paid.`); this.load(); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }

  markPaid(salary: ApiSalary): void {
    const token = this.token;
    if (!token) return;
    const setup = this.setupOf(salary.teacherCode)?.structure;
    this.dialog.open(RecordDialogComponent, {
      width: '520px', maxWidth: 'calc(100vw - 24px)',
      data: { title: `Pay ${salary.teacherName} · ${this.rupees(salary.netPay)}`, submitLabel: 'Mark as paid', successMessage: '', record: { mode: SALARY_MODE_LABELS[setup?.mode || 'bank'], paidOn: new Date() },
        fields: [{ key: 'mode', label: 'Paid by', type: 'select', options: Object.values(SALARY_MODE_LABELS), required: true, hint: setup?.account ? `Account: ${setup.account}` : undefined }, { key: 'paidOn', label: 'Paid on', type: 'date', required: true }, { key: 'reference', label: 'Reference / UTR no.' }] }
    }).afterClosed().subscribe(value => {
      if (!value) return;
      if (isoDay(value.paidOn) > isoDay(new Date())) { this.toast.error('Paid date cannot be in the future.'); return; }
      this.api.update(token, salary.salaryCode, { status: 'paid', paidOn: isoDay(value.paidOn), mode: MODE_VALUES[value.mode] || 'bank', reference: text(value.reference) }).subscribe({
        next: saved => { this.replace(saved); this.toast.success(`${salary.teacherName}'s salary marked as paid.`); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }

  markPending(salary: ApiSalary): void {
    const token = this.token;
    if (!token) return;
    this.confirm.confirm({ title: 'Mark as pending?', message: `Move ${salary.teacherName}'s ${this.monthLabel} salary back to pending? The payment details are cleared.`, confirmLabel: 'Mark pending' }).subscribe(ok => {
      if (!ok) return;
      this.api.update(token, salary.salaryCode, { status: 'pending' }).subscribe({ next: saved => { this.replace(saved); this.toast.success('Moved back to pending.'); }, error: (error: Error) => this.toast.error(error.message) });
    });
  }

  slip(salary: ApiSalary): void {
    const data: SalarySlipData = { salary, institution: this.content.profile.settings['name'] || this.auth.user?.instituteName || this.tenant.current.businessName, logo: this.content.customLogo };
    this.dialog.open(SalarySlipComponent, { width: '520px', maxWidth: 'calc(100vw - 24px)', data });
  }

  /** Add (for a teacher, prefilled from their setup) or edit one month's salary. */
  openSalary(salary?: ApiSalary, teacherCode?: string, draft?: Record<string, unknown>): void {
    const token = this.token;
    if (!token) return;
    const teachers = this.activeTeachers.filter(item => salary || !this.monthSalaries.some(entry => entry.teacherCode === item.teacherCode));
    if (!salary && !teachers.length) { this.toast.info(this.activeTeachers.length ? `Every teacher already has a salary for ${this.monthLabel}.` : 'Add teachers first.'); return; }
    const label = (item: { teacherName: string; teacherCode: string }) => `${item.teacherName} · ${item.teacherCode}`;
    const setup = this.setupOf(salary?.teacherCode || teacherCode || '')?.structure;
    const record = draft || (salary
      ? { teacher: label(salary), basic: salary.basic, allowances: salary.allowances, bonus: salary.bonus, deductions: salary.deductions, note: salary.note || '' }
      : { teacher: teacherCode ? label(this.setupOf(teacherCode)!) : '', basic: setup?.basic ?? '', allowances: setup?.allowances ?? 0, bonus: 0, deductions: setup?.deductions ?? 0, note: '' });
    this.dialog.open(RecordDialogComponent, {
      width: '620px', maxWidth: 'calc(100vw - 24px)',
      data: { title: salary ? `Edit salary · ${salary.teacherName} · ${SalaryApiService.monthLabel(salary.month)}` : `Add salary · ${this.monthLabel}`, submitLabel: salary ? 'Save changes' : 'Add salary', successMessage: '', record,
        fields: [
          { key: 'teacher', label: 'Teacher', type: 'select', options: salary ? [label(salary)] : teachers.map(label), required: true, hint: salary ? undefined : 'Empty amounts are filled from the teacher’s salary setup' },
          { key: 'basic', label: 'Basic pay (₹)', type: 'number' },
          { key: 'allowances', label: 'Allowances (₹)', type: 'number', hint: 'Travel, house rent…' },
          { key: 'bonus', label: 'Bonus (₹)', type: 'number', hint: 'This month only' },
          { key: 'deductions', label: 'Deductions (₹)', type: 'number', hint: 'Leave, advance, PF…' },
          { key: 'note', label: 'Note', type: 'textarea' }
        ] }
    }).afterClosed().subscribe((value?: Record<string, unknown>) => {
      if (!value) return;
      const code = salary?.teacherCode || String(value['teacher']).split(' · ').pop() || '';
      const base = this.setupOf(code)?.structure;
      const pick = (key: 'basic' | 'allowances' | 'deductions') => value[key] === '' || value[key] == null ? base?.[key] ?? 0 : num(value[key]);
      const amounts = { basic: pick('basic'), allowances: pick('allowances'), bonus: num(value['bonus']), deductions: pick('deductions') };
      if (!(amounts.basic > 0)) { this.toast.error('Enter the basic pay, or set the teacher’s salary in “Salary setup”.'); this.openSalary(salary, teacherCode, value); return; }
      if (amounts.deductions > amounts.basic + amounts.allowances + amounts.bonus) { this.toast.error('Deductions cannot be more than the total pay.'); this.openSalary(salary, teacherCode, value); return; }
      const request = salary
        ? this.api.update(token, salary.salaryCode, { ...amounts, note: text(value['note']) })
        : this.api.create(token, { teacherCode: code, month: this.month, ...amounts, status: 'pending', paidOn: null, mode: null, reference: null, note: text(value['note']) } as SalaryPayload);
      request.subscribe({
        next: saved => { if (salary) this.replace(saved); else this.salaries = [saved, ...this.salaries]; this.toast.success(`Salary for ${saved.teacherName} ${salary ? 'updated' : 'added'}.`); },
        error: (error: Error) => { this.toast.error(error.message); this.openSalary(salary, teacherCode, value); }
      });
    });
  }

  remove(salary: ApiSalary): void {
    const token = this.token;
    if (!token) return;
    this.confirm.confirm({ title: 'Delete salary?', message: `Delete ${salary.teacherName}'s salary for ${SalaryApiService.monthLabel(salary.month)}${salary.status === 'paid' ? ' (already marked paid)' : ''}? This cannot be undone.`, confirmLabel: 'Delete', destructive: true }).subscribe(ok => {
      if (!ok) return;
      this.api.remove(token, salary.salaryCode).subscribe({ next: () => { this.salaries = this.salaries.filter(item => item !== salary); this.toast.success('Salary deleted.'); }, error: (error: Error) => this.toast.error(error.message) });
    });
  }
  private replace(saved: ApiSalary): void { this.salaries = this.salaries.map(item => item.salaryCode === saved.salaryCode ? saved : item); }

  // ---------------------------------------------------------------- Salary setup

  editSetup(setup: TeacherSalarySetup, draft?: Record<string, unknown>): void {
    const token = this.token;
    if (!token) return;
    const s = setup.structure;
    this.dialog.open(RecordDialogComponent, {
      width: '580px', maxWidth: 'calc(100vw - 24px)',
      data: { title: `Salary setup · ${setup.teacherName}`, submitLabel: 'Save salary', successMessage: '',
        record: draft || { basic: s?.basic ?? '', allowances: s?.allowances ?? 0, deductions: s?.deductions ?? 0, mode: SALARY_MODE_LABELS[s?.mode || 'bank'], account: s?.account || '' },
        fields: [
          { key: 'basic', label: 'Monthly basic pay (₹)', type: 'number', required: true },
          { key: 'allowances', label: 'Monthly allowances (₹)', type: 'number', hint: 'Travel, house rent…' },
          { key: 'deductions', label: 'Fixed monthly deductions (₹)', type: 'number', hint: 'PF, insurance…' },
          { key: 'mode', label: 'Usually paid by', type: 'select', options: Object.values(SALARY_MODE_LABELS), required: true },
          { key: 'account', label: 'Bank account / UPI ID', hint: 'Shown when you mark the salary paid' }
        ] }
    }).afterClosed().subscribe((value?: Record<string, unknown>) => {
      if (!value) return;
      const payload = { basic: num(value['basic']), allowances: num(value['allowances']), deductions: num(value['deductions']), mode: MODE_VALUES[String(value['mode'])] || 'bank', account: text(value['account']) };
      if (!(payload.basic > 0)) { this.toast.error('Basic pay must be more than 0.'); this.editSetup(setup, value); return; }
      if (payload.deductions > payload.basic + payload.allowances) { this.toast.error('Deductions cannot be more than the total pay.'); this.editSetup(setup, value); return; }
      this.api.saveStructure(token, setup.teacherCode, payload).subscribe({
        next: saved => { this.setups = this.setups.map(item => item.teacherCode === saved.teacherCode ? saved : item); this.toast.success(`Salary set for ${setup.teacherName}: ${this.rupees(saved.structure!.netPay)} a month.`); },
        error: (error: Error) => { this.toast.error(error.message); this.editSetup(setup, value); }
      });
    });
  }
  get monthlyCommitment(): number { return this.activeTeachers.reduce((sum, item) => sum + (item.structure?.netPay || 0), 0); }

  // ---------------------------------------------------------------- History

  get years(): string[] {
    if (this.yearCache.count !== this.salaries.length) this.yearCache = { count: this.salaries.length, years: [...new Set([String(new Date().getFullYear()), ...this.salaries.map(item => item.month.slice(0, 4))])].sort().reverse() };
    return this.yearCache.years;
  }
  private yearCache = { count: -1, years: [] as string[] };
  get history(): ApiSalary[] {
    return this.salaries.filter(item => item.month.startsWith(this.historyYear) && (!this.historyTeacher || item.teacherCode === this.historyTeacher))
      .sort((a, b) => b.month.localeCompare(a.month) || a.teacherName.localeCompare(b.teacherName));
  }
  get historyPaid(): number { return this.total(this.history.filter(item => item.status === 'paid')); }
  monthName(month: string): string { return SalaryApiService.monthLabel(month); }

  // ---------------------------------------------------------------- Export

  export(): void {
    const list = this.tab === 2 ? this.history : this.monthSalaries;
    if (!list.length) { this.toast.info('There are no salaries to export here yet.'); return; }
    const sheet = XLSX.utils.json_to_sheet(list.map(item => ({
      Teacher: item.teacherName, 'Teacher ID': item.teacherCode, Month: SalaryApiService.monthLabel(item.month), 'Basic (₹)': item.basic, 'Allowances (₹)': item.allowances, 'Bonus (₹)': item.bonus,
      'Deductions (₹)': item.deductions, 'Net pay (₹)': item.netPay, Status: item.status === 'paid' ? 'Paid' : 'Pending', 'Paid on': dayLabel(item.paidOn), 'Paid by': item.mode ? SALARY_MODE_LABELS[item.mode] : '', Reference: item.reference || ''
    })));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Salaries');
    XLSX.writeFile(book, this.tab === 2 ? `salary-history-${this.historyYear}.xlsx` : `salaries-${this.month}.xlsx`);
  }
}

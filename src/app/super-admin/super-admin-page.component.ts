import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';
import { ConfirmationDialogService } from '../core/confirmation-dialog.service';
import { MockAuthService } from '../core/mock-auth.service';
import { AppValidators, normalizeMobile, validationMessage } from '../core/app-validators';
import { ToastService } from '../core/toast.service';
import { ApiUser, AuthApiService } from '../core/auth-api.service';
import { formatDate, formatPhone } from '../core/profile-format';
import { readImageAsDataUrl } from '../core/image-file';
import { dayLabel, fromApiDay, isoDay } from '../core/api-client';
import { MODULES, ModuleInfo } from '../core/module-access';
import { ApiPlan, ApiPlatformSettings, ApiSubscription, ApiWorkspace, PlatformApiService, PlatformSummary, SUBSCRIPTION_STATUS_LABELS } from '../core/platform-api.service';
import { ModuleAccessDialogComponent, ModuleAccessDialogData } from './module-access-dialog.component';
import { RecordDialogComponent } from '../client/management/record-dialog.component';

type Mode = 'dashboard' | 'clients' | 'add' | 'detail' | 'edit' | 'users' | 'subscriptions' | 'reports' | 'settings';
type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';
const TYPE_LABELS: Record<string, string> = { school: 'School', coaching: 'Coaching Institute' };

/** Super Admin panel: dashboard, education workspaces (owner accounts), users, subscriptions, reports and settings — all from crm-backend. */
@Component({ selector: 'app-super-admin-page', templateUrl: './super-admin-page.component.html', styleUrls: ['./super-admin-page.component.scss'] })
export class SuperAdminPageComponent implements OnInit {
  mode: Mode = 'dashboard';
  search = ''; statusFilter = ''; typeFilter = ''; pageIndex = 0; pageSize = 10;
  logo = ''; saving = false; hidePassword = true; loading = false;
  summary?: PlatformSummary;
  workspaces: ApiWorkspace[] = [];
  selected?: ApiWorkspace;
  subscriptions: ApiSubscription[] = [];
  settings?: ApiPlatformSettings;
  /** Settings form copy (plans are edited in place and saved together). */
  settingsDraft: { plans: ApiPlan[]; supportPhone: string; supportEmail: string; reminderDays: number } = { plans: [], supportPhone: '', supportEmail: '', reminderDays: 7 };
  readonly statusLabels = SUBSCRIPTION_STATUS_LABELS;
  /** Modules ticked in the workspace form (everything else is turned off). */
  enabledModules = new Set<string>(MODULES.map(module => module.key));

  readonly form = this.fb.group({
    name: ['', [AppValidators.required, Validators.maxLength(80)]], type: ['coaching', AppValidators.required],
    owner: ['', [AppValidators.required, AppValidators.personName, Validators.maxLength(60)]], email: ['', [AppValidators.required, AppValidators.email, Validators.maxLength(120)]],
    phone: ['', [AppValidators.required, AppValidators.mobile]], password: [''], address: ['', [AppValidators.required, Validators.maxLength(200)]],
    color: ['#4871e1'], secondary: ['#1b2052']
  });

  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private confirm: ConfirmationDialogService, public auth: MockAuthService, private toast: ToastService, private authApi: AuthApiService, private platform: PlatformApiService, private dialog: MatDialog) {}

  errorFor(name: string, label: string): string { return validationMessage(this.form.get(name), label); }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const path = this.router.url.split('?')[0];
      const id = params.get('id');
      this.mode = path.endsWith('/clients/add') ? 'add' : id ? (path.endsWith('/edit') ? 'edit' : 'detail') : path.includes('/clients') ? 'clients' : path.includes('/users') ? 'users'
        : path.includes('/subscriptions') ? 'subscriptions' : path.includes('/reports') ? 'reports' : path.includes('/settings') ? 'settings' : 'dashboard';
      this.form.controls.password.setValidators(this.mode === 'add' ? [AppValidators.required, AppValidators.password] : null);
      this.form.controls.password.updateValueAndValidity();
      if (this.mode === 'add') this.resetForm();
      this.load(id);
    });
  }

  private get token(): string | null { return this.auth.token; }

  /** Loads what the current page shows. */
  private load(id: string | null): void {
    const token = this.token;
    if (!token) return;
    const fail = (error: Error) => { this.loading = false; this.toast.error(error.message); };
    this.loading = true;
    switch (this.mode) {
      case 'dashboard': case 'reports':
        this.platform.summary(token).subscribe({ next: summary => { this.loading = false; this.summary = summary; }, error: fail });
        if (this.mode === 'reports') this.platform.workspaces(token).subscribe({ next: list => this.workspaces = list, error: fail });
        break;
      case 'clients':
        this.platform.workspaces(token).subscribe({ next: list => { this.loading = false; this.workspaces = list; }, error: fail });
        break;
      case 'detail': case 'edit':
        this.platform.workspace(token, id!).subscribe({ next: workspace => { this.loading = false; this.fill(workspace); }, error: (error: Error) => { fail(error); this.router.navigate(['/super-admin/clients']); } });
        break;
      case 'subscriptions':
        forkJoin({ subscriptions: this.platform.subscriptions(token), workspaces: this.platform.workspaces(token), settings: this.platform.settings(token) }).subscribe({
          next: result => { this.loading = false; this.subscriptions = result.subscriptions; this.workspaces = result.workspaces; this.settings = result.settings; }, error: fail
        });
        break;
      case 'settings':
        this.platform.settings(token).subscribe({ next: settings => { this.loading = false; this.applySettings(settings); }, error: fail });
        break;
      case 'users': this.loading = false; this.loadUsers(); break;
      default: this.loading = false;
    }
  }

  // ---------------------------------------------------------------- Shared helpers

  name(workspace?: ApiWorkspace | null): string { return workspace?.instituteName || workspace?.fullName || 'Workspace'; }
  typeLabel(workspace?: { workType?: string | null } | null): string { return TYPE_LABELS[workspace?.workType || ''] || '—'; }
  created(workspace: ApiWorkspace): string { return formatDate(workspace.createdAt); }
  day(value: string | null | undefined): string { return dayLabel(value); }
  rupees(value: number): string { return `₹${(value || 0).toLocaleString('en-IN')}`; }
  phone(workspace: ApiWorkspace): string { return formatPhone(workspace.countryCode, workspace.phoneNumber); }
  statusTone(status: string): Tone { return ({ active: 'success', dueSoon: 'warning', expired: 'danger', cancelled: 'neutral' } as Record<string, Tone>)[status] || 'neutral'; }
  monthName(month: string): string { const [year, value] = month.split('-').map(Number); return new Date(year, value - 1, 1).toLocaleDateString('en-GB', { month: 'short' }); }
  siteLink(workspace: ApiWorkspace): string | null { return workspace.siteSlug ? `/site/${workspace.siteSlug}` : null; }
  openSite(workspace: ApiWorkspace): void { const link = this.siteLink(workspace); if (link) window.open(link, '_blank', 'noopener'); else this.toast.info(`${this.name(workspace)} has no website address yet. It is made when the owner first signs in.`); }

  // ---------------------------------------------------------------- Dashboard

  /** Growth chart line (700 × 185 view box) from new workspaces per month. */
  get growthMax(): number { return Math.max(4, ...(this.summary?.growth.map(item => item.count) || [0])); }
  get growthTicks(): number[] { const max = this.growthMax; return [max, Math.round(max * 2 / 3), Math.round(max / 3), 0]; }
  private growthPoints(): [number, number][] {
    const points = this.summary?.growth || [];
    const step = 700 / Math.max(1, points.length - 1);
    return points.map((item, index) => [Math.round(index * step), Math.round(175 - item.count / this.growthMax * 160)]);
  }
  get growthLine(): string { return this.growthPoints().map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' '); }
  get growthArea(): string { const line = this.growthLine; return line ? `${line} V185 H0Z` : ''; }
  activityIcon(kind: string): { icon: string; tone: string } { return kind === 'payment' ? { icon: 'payments', tone: 'violet' } : { icon: 'add_business', tone: 'mint' }; }
  when(value: string): string { return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }

  // ---------------------------------------------------------------- Workspaces list

  get filtered(): ApiWorkspace[] {
    const q = this.search.toLowerCase().trim();
    return this.workspaces.filter(item => (!this.typeFilter || item.workType === this.typeFilter)
      && (!this.statusFilter || (this.statusFilter === 'Active') === !item.isSuspended)
      && (!q || `${item.instituteName || ''} ${item.fullName || ''} ${item.phoneNumber || ''} ${item.email || ''}`.toLowerCase().includes(q)));
  }
  get visible(): ApiWorkspace[] { return this.filtered.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize); }
  pageChanged(event: { pageIndex: number; pageSize: number }): void { this.pageIndex = event.pageIndex; this.pageSize = event.pageSize; }
  openAdd(): void { this.router.navigate(['/super-admin/clients/add']); }
  view(item: ApiWorkspace): void { this.router.navigate(['/super-admin/clients', item._id]); }
  edit(item: ApiWorkspace): void { this.router.navigate(['/super-admin/clients', item._id, 'edit']); }

  /** Deactivating stops the owner, teachers and students using the workspace until it is activated again. */
  toggle(item: ApiWorkspace): void {
    const token = this.token;
    if (!token) return;
    const activate = item.isSuspended;
    const name = this.name(item);
    this.confirm.confirm(activate
      ? { title: 'Activate workspace?', message: `Activate “${name}”? The owner, teachers and students can sign in again.`, confirmLabel: 'Activate' }
      : { title: 'Deactivate workspace?', message: `Deactivate “${name}”? The owner, teachers and students lose access until you activate it again.`, confirmLabel: 'Deactivate', destructive: true }
    ).subscribe(ok => {
      if (!ok) return;
      this.platform.setActive(token, item._id, activate).subscribe({
        next: updated => { Object.assign(item, updated); if (this.selected?._id === item._id) this.selected = updated; this.toast.success(`“${name}” ${activate ? 'activated' : 'deactivated'}.`); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }

  /** Module access from the workspace list or detail page. */
  editWorkspaceModules(item: ApiWorkspace): void {
    const token = this.token;
    if (!token) return;
    const data: ModuleAccessDialogData = { name: this.name(item), school: item.workType === 'school', disabledModules: item.disabledModules || [] };
    this.dialog.open(ModuleAccessDialogComponent, { width: '720px', maxWidth: 'calc(100vw - 24px)', data }).afterClosed().subscribe((disabled?: string[]) => {
      if (!disabled) return;
      this.platform.updateWorkspace(token, item._id, { disabledModules: disabled }).subscribe({
        next: updated => { Object.assign(item, updated); if (this.selected?._id === item._id) this.fill(updated); this.toast.success(`Module access saved for ${this.name(item)}.`); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }

  // ---------------------------------------------------------------- Add / view / edit workspace

  get moduleOptions(): ModuleInfo[] { return MODULES.filter(module => this.form.value.type === 'school' || !module.schoolOnly); }
  toggleModule(key: string, checked: boolean): void { if (checked) this.enabledModules.add(key); else this.enabledModules.delete(key); }
  private resetForm(): void {
    this.selected = undefined; this.logo = '';
    this.enabledModules = new Set(MODULES.map(module => module.key));
    this.form.reset({ name: '', type: 'coaching', owner: '', email: '', phone: '', password: '', address: '', color: '#4871e1', secondary: '#1b2052' });
    this.form.enable();
  }
  private fill(workspace: ApiWorkspace): void {
    this.selected = workspace; this.logo = workspace.logo || '';
    this.enabledModules = new Set(MODULES.map(module => module.key).filter(key => !workspace.disabledModules.includes(key)));
    this.form.reset({
      name: workspace.instituteName || '', type: workspace.workType || 'coaching', owner: workspace.fullName || '', email: workspace.email || '',
      phone: normalizeMobile(workspace.phoneNumber || '').slice(-10), password: '', address: workspace.address || '', color: workspace.brandColor, secondary: workspace.secondaryColor
    });
    // The backend keeps one work type per owner, so it can't change after creation.
    this.form.controls.type.disable();
  }
  onLogo(event: Event): void {
    const input = event.target as HTMLInputElement; const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.toast.error('Logo must be an image file (PNG, JPG or SVG).'); input.value = ''; return; }
    if (file.size > 2 * 1024 * 1024) { this.toast.error('Logo must be 2 MB or smaller.'); input.value = ''; return; }
    readImageAsDataUrl(file).then(url => { this.logo = url; this.toast.info('Logo ready. Save to apply it.'); }, () => this.toast.error('Logo could not be read. Try another image.'));
    input.value = '';
  }
  save(): void {
    if (this.saving) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.toast.invalidForm(); return; }
    const token = this.token;
    if (!token) { this.toast.error('Sign in with a Super Admin account to manage workspaces.'); return; }
    const value = this.form.getRawValue();
    const school = value.type === 'school';
    const disabledModules = MODULES.filter(module => !this.enabledModules.has(module.key) && (school || !module.schoolOnly)).map(module => module.key);
    const details = {
      instituteName: (value.name || '').trim(), fullName: (value.owner || '').trim(), email: (value.email || '').trim().toLowerCase(), phoneNumber: normalizeMobile(value.phone || '').slice(-10),
      address: (value.address || '').trim(), brandColor: value.color || '#4871e1', secondaryColor: value.secondary || '#1b2052', logo: this.logo || null, disabledModules
    };
    this.saving = true;
    const done = (message: string) => { this.saving = false; this.toast.success(message); this.router.navigate(['/super-admin/clients']); };
    const fail = (error: Error) => { this.saving = false; this.toast.error(error.message); };
    if (this.mode === 'edit' && this.selected) {
      this.platform.updateWorkspace(token, this.selected._id, details).subscribe({ next: () => done(`Workspace “${details.instituteName}” updated.`), error: fail });
      return;
    }
    this.authApi.createAdmin(token, { fullName: details.fullName, email: details.email, password: value.password || '', countryCode: '+91', phoneNumber: details.phoneNumber, instituteName: details.instituteName, workType: school ? 'school' : 'coaching' }).subscribe({
      // The owner exists now; brand, address and modules are saved on the workspace.
      next: owner => this.platform.updateWorkspace(token, owner._id, { address: details.address, brandColor: details.brandColor, secondaryColor: details.secondaryColor, logo: details.logo, disabledModules }).subscribe({
        next: () => done(`Workspace “${details.instituteName}” created. ${details.fullName} can now sign in as Owner.`),
        error: (error: Error) => { fail(new Error(`Owner created, but the brand details were not saved: ${error.message}. Open the workspace and save again.`)); this.router.navigate(['/super-admin/clients']); }
      }),
      error: fail
    });
  }

  // ---------------------------------------------------------------- Subscriptions

  showPlanForm = false;
  newPlan: { adminId: string; plan: string; amount: number | null; startDate: Date | null; renewalDate: Date | null } = { adminId: '', plan: '', amount: null, startDate: new Date(), renewalDate: null };
  get plans(): ApiPlan[] { return this.settings?.plans || []; }
  /** Institutes without a plan yet. */
  get unplanned(): ApiWorkspace[] { return this.workspaces.filter(item => !this.subscriptions.some(sub => sub.adminId === item._id)); }
  get activePlans(): number { return this.subscriptions.filter(sub => sub.status === 'active' || sub.status === 'dueSoon').length; }
  get dueSoonCount(): number { return this.subscriptions.filter(sub => sub.status === 'dueSoon' || sub.status === 'expired').length; }
  get monthlyRecurring(): number { return this.subscriptions.filter(sub => sub.status === 'active' || sub.status === 'dueSoon').reduce((total, sub) => total + sub.amount, 0); }
  subscriptionWorkspace(sub: ApiSubscription): ApiWorkspace | undefined { return this.workspaces.find(item => item._id === sub.adminId); }
  planChosen(): void {
    const plan = this.plans.find(item => item.name === this.newPlan.plan);
    if (plan) this.newPlan.amount = plan.amount;
    if (this.newPlan.startDate && !this.newPlan.renewalDate) { const next = new Date(this.newPlan.startDate); next.setMonth(next.getMonth() + 1); this.newPlan.renewalDate = next; }
  }
  addSubscription(): void {
    const token = this.token;
    const plan = this.newPlan;
    if (!token || this.saving) return;
    if (!plan.adminId) { this.toast.error('Choose an institute.'); return; }
    if (!plan.plan.trim()) { this.toast.error('Choose or type a plan.'); return; }
    if (!(Number(plan.amount) >= 0) || plan.amount === null) { this.toast.error('Enter the monthly rent.'); return; }
    if (!plan.startDate || !plan.renewalDate) { this.toast.error('Choose the start and renewal dates.'); return; }
    if (isoDay(plan.renewalDate) < isoDay(plan.startDate)) { this.toast.error('Renewal date must be on or after the start date.'); return; }
    this.saving = true;
    this.platform.createSubscription(token, { adminId: plan.adminId, plan: plan.plan.trim(), amount: Number(plan.amount), startDate: isoDay(plan.startDate), renewalDate: isoDay(plan.renewalDate) }).subscribe({
      next: created => {
        this.saving = false; this.subscriptions = [...this.subscriptions, created].sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));
        this.showPlanForm = false; this.newPlan = { adminId: '', plan: '', amount: null, startDate: new Date(), renewalDate: null };
        this.toast.success(`${created.plan} plan added for ${created.institute?.instituteName || 'the institute'}.`);
      },
      error: (error: Error) => { this.saving = false; this.toast.error(error.message); }
    });
  }
  private replaceSubscription(updated: ApiSubscription): void { this.subscriptions = this.subscriptions.map(sub => sub._id === updated._id ? updated : sub); }
  renew(sub: ApiSubscription): void {
    const token = this.token;
    if (!token) return;
    this.dialog.open(RecordDialogComponent, {
      width: '520px', maxWidth: 'calc(100vw - 24px)',
      data: { title: `Renew · ${sub.institute?.instituteName || sub.plan}`, submitLabel: 'Record payment & renew', successMessage: '', record: { months: '1', amount: sub.amount, paidOn: new Date() },
        fields: [
          { key: 'months', label: 'Months paid', type: 'select', options: ['1', '3', '6', '12'], required: true, hint: `Moves the renewal date (now ${this.day(sub.renewalDate)}) forward.` },
          { key: 'amount', label: 'Amount received (₹)', type: 'number', required: true },
          { key: 'paidOn', label: 'Paid on', type: 'date', required: true },
          { key: 'reference', label: 'Reference / UTR no.' }
        ] }
    }).afterClosed().subscribe(value => {
      if (!value) return;
      if (isoDay(value.paidOn) > isoDay(new Date())) { this.toast.error('Paid date cannot be in the future.'); return; }
      this.platform.renewSubscription(token, sub.subscriptionCode, { months: Number(value.months), amount: Number(value.amount) || 0, paidOn: isoDay(value.paidOn), reference: value.reference || null }).subscribe({
        next: updated => { this.replaceSubscription(updated); this.toast.success(`Renewed until ${this.day(updated.renewalDate)}.`); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }
  editSubscription(sub: ApiSubscription): void {
    const token = this.token;
    if (!token) return;
    this.dialog.open(RecordDialogComponent, {
      width: '560px', maxWidth: 'calc(100vw - 24px)',
      data: { title: `Edit plan · ${sub.institute?.instituteName || sub.plan}`, submitLabel: 'Save changes', successMessage: '',
        record: { plan: sub.plan, amount: sub.amount, startDate: fromApiDay(sub.startDate), renewalDate: fromApiDay(sub.renewalDate), note: sub.note || '' },
        fields: [
          { key: 'plan', label: 'Plan', required: true, hint: this.plans.map(plan => plan.name).join(', ') },
          { key: 'amount', label: 'Monthly rent (₹)', type: 'number', required: true },
          { key: 'startDate', label: 'Start date', type: 'date', required: true },
          { key: 'renewalDate', label: 'Next renewal', type: 'date', required: true },
          { key: 'note', label: 'Note', type: 'textarea' }
        ] }
    }).afterClosed().subscribe(value => {
      if (!value) return;
      if (isoDay(value.renewalDate) < isoDay(value.startDate)) { this.toast.error('Renewal date must be on or after the start date.'); return; }
      this.platform.updateSubscription(token, sub.subscriptionCode, { plan: value.plan, amount: Number(value.amount) || 0, startDate: isoDay(value.startDate), renewalDate: isoDay(value.renewalDate), note: value.note || null }).subscribe({
        next: updated => { this.replaceSubscription(updated); this.toast.success('Plan updated.'); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }
  toggleCancel(sub: ApiSubscription): void {
    const token = this.token;
    if (!token) return;
    const cancel = !sub.cancelled;
    this.confirm.confirm(cancel
      ? { title: 'Cancel plan?', message: `Cancel the ${sub.plan} plan for ${sub.institute?.instituteName || 'this institute'}? It stops counting towards monthly recurring.`, confirmLabel: 'Cancel plan', destructive: true }
      : { title: 'Resume plan?', message: `Resume the ${sub.plan} plan?`, confirmLabel: 'Resume' }
    ).subscribe(ok => {
      if (!ok) return;
      this.platform.updateSubscription(token, sub.subscriptionCode, { cancelled: cancel }).subscribe({
        next: updated => { this.replaceSubscription(updated); this.toast.success(cancel ? 'Plan cancelled.' : 'Plan resumed.'); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }
  removeSubscription(sub: ApiSubscription): void {
    const token = this.token;
    if (!token) return;
    this.confirm.confirm({ title: 'Delete plan?', message: `Delete the ${sub.plan} plan and its ${sub.payments.length} payment record${sub.payments.length === 1 ? '' : 's'}? This cannot be undone.`, confirmLabel: 'Delete', destructive: true }).subscribe(ok => {
      if (!ok) return;
      this.platform.removeSubscription(token, sub.subscriptionCode).subscribe({
        next: () => { this.subscriptions = this.subscriptions.filter(item => item !== sub); this.toast.success('Plan deleted.'); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }

  // ---------------------------------------------------------------- Reports

  get revenueMax(): number { return Math.max(1, ...(this.summary?.revenue.byMonth.map(item => item.amount) || [0])); }
  exportWorkspaces(): void {
    if (!this.workspaces.length) { this.toast.info('There are no workspaces to export yet.'); return; }
    const sheet = XLSX.utils.json_to_sheet(this.workspaces.map(item => ({
      Institution: this.name(item), Type: this.typeLabel(item), Owner: item.fullName || '', Email: item.email || '', Mobile: item.phoneNumber || '',
      Students: item.students, Teachers: item.teachers, Status: item.isSuspended ? 'Inactive' : 'Active', Plan: item.subscription?.plan || '',
      'Monthly rent (₹)': item.subscription?.amount ?? '', 'Next renewal': item.subscription ? this.day(item.subscription.renewalDate) : '', Created: this.created(item)
    })));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Workspaces');
    XLSX.writeFile(book, `edunexa-workspaces-${isoDay(new Date())}.xlsx`);
  }

  // ---------------------------------------------------------------- Settings

  private applySettings(settings: ApiPlatformSettings): void {
    this.settings = settings;
    this.settingsDraft = { plans: settings.plans.map(plan => ({ ...plan, description: plan.description || '' })), supportPhone: settings.supportPhone || '', supportEmail: settings.supportEmail || '', reminderDays: settings.reminderDays };
  }
  addPlanRow(): void { this.settingsDraft.plans.push({ name: '', amount: 0, description: '' }); }
  removePlanRow(index: number): void { this.settingsDraft.plans.splice(index, 1); }
  saveSettings(): void {
    const token = this.token;
    if (!token || this.saving) return;
    const draft = this.settingsDraft;
    if (!draft.plans.length) { this.toast.error('Keep at least one plan.'); return; }
    const badPlan = draft.plans.findIndex(plan => !plan.name.trim() || !(Number(plan.amount) >= 0));
    if (badPlan >= 0) { this.toast.error(`Plan ${badPlan + 1}: enter a name and a monthly price.`); return; }
    const names = draft.plans.map(plan => plan.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) { this.toast.error('Two plans have the same name.'); return; }
    const phone = normalizeMobile(draft.supportPhone || '').slice(-10);
    if (draft.supportPhone && phone.length !== 10) { this.toast.error('Support phone must be a 10-digit mobile number.'); return; }
    if (draft.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.supportEmail.trim())) { this.toast.error('Enter a valid support email.'); return; }
    const days = Math.round(Number(draft.reminderDays));
    if (!(days >= 1 && days <= 60)) { this.toast.error('Reminder days must be between 1 and 60.'); return; }
    this.saving = true;
    this.platform.updateSettings(token, {
      plans: draft.plans.map(plan => ({ name: plan.name.trim(), amount: Number(plan.amount), description: (plan.description || '').trim() || null })),
      supportPhone: phone || null, supportEmail: draft.supportEmail.trim() || null, reminderDays: days
    }).subscribe({
      next: settings => { this.saving = false; this.applySettings(settings); this.toast.success('Platform settings saved.'); },
      error: (error: Error) => { this.saving = false; this.toast.error(error.message); }
    });
  }

  // ---------------------------------------------------------------- Users (owners, teachers, students, parents)

  users: ApiUser[] = []; usersLoading = false; userSearch = ''; userRole = ''; userStatus = '';
  readonly roleLabels: Record<string, string> = { admin: 'Owner', teacher: 'Teacher', student: 'Student', parent: 'Parent' };
  get filteredUsers(): ApiUser[] {
    const q = this.userSearch.trim().toLowerCase();
    return this.users.filter(user => (!this.userRole || user.role === this.userRole) && (!this.userStatus || (this.userStatus === 'blocked') === user.isBlocked) && (!q || `${user.fullName || ''} ${user.email || ''} ${user.phoneNumber || ''}`.toLowerCase().includes(q)));
  }
  get blockedCount(): number { return this.users.filter(user => user.isBlocked).length; }
  workTypeLabel(user: ApiUser): string { return user.workType === 'school' ? 'School' : user.workType === 'coaching' ? 'Coaching' : '—'; }
  phoneLabel(user: ApiUser): string { return formatPhone(user.countryCode, user.phoneNumber); }
  lastSignIn(user: ApiUser): string { return formatDate(user.lastLogin); }
  loadUsers(): void {
    const token = this.auth.token;
    if (!token) return;
    this.usersLoading = true;
    this.authApi.listUsers(token).subscribe({
      next: users => { this.usersLoading = false; this.users = users; },
      error: (error: Error) => { this.usersLoading = false; this.toast.error(error.message); }
    });
  }
  /** An owner's own domain: once DNS points it at this app, visiting it opens their published website. */
  editDomain(user: ApiUser, draft?: string): void {
    const token = this.auth.token;
    if (!token || user.role !== 'admin') return;
    const name = user.instituteName || user.fullName || 'this owner';
    const ref = this.dialog.open(RecordDialogComponent, { width: '520px', maxWidth: 'calc(100vw - 24px)', data: { title: `Website domain · ${name}`, submitLabel: 'Save domain', fields: [{ key: 'customDomain', label: 'Domain', hint: 'e.g. sunriseclasses.in. Leave empty to remove it. The website must be published.' }], record: { customDomain: draft ?? user.customDomain ?? '' }, successMessage: '' } });
    ref.afterClosed().subscribe(value => {
      if (!value) return;
      const domain = String(value.customDomain || '');
      this.authApi.setUserDomain(token, user._id, domain).subscribe({
        next: updated => { Object.assign(user, updated); this.toast.success(updated.customDomain ? `${updated.customDomain} now opens ${name}'s website.` : `Domain removed for ${name}.`); },
        // Reopen with what was typed so it can be corrected.
        error: (error: Error) => { this.toast.error(error.message); this.editDomain(user, domain); }
      });
    });
  }
  /** "All modules on" / "3 modules off" for the Modules button tooltip. */
  modulesLabel(user: ApiUser): string { const off = user.disabledModules?.length || 0; return off ? `${off} module${off === 1 ? '' : 's'} off` : 'All modules on'; }
  /** Turn modules on / off for an owner's institute; their teachers follow it. */
  editModules(user: ApiUser): void {
    const token = this.auth.token;
    if (!token || user.role !== 'admin') return;
    const name = user.instituteName || user.fullName || 'this owner';
    const data: ModuleAccessDialogData = { name, school: user.workType === 'school', disabledModules: user.disabledModules || [] };
    this.dialog.open(ModuleAccessDialogComponent, { width: '720px', maxWidth: 'calc(100vw - 24px)', data }).afterClosed().subscribe((disabled?: string[]) => {
      if (!disabled) return;
      this.authApi.setUserModules(token, user._id, disabled).subscribe({
        next: updated => { Object.assign(user, updated); this.toast.success(`Module access saved for ${name}.`); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }
  toggleBlock(user: ApiUser): void {
    const token = this.auth.token;
    if (!token) return;
    const block = !user.isBlocked;
    const name = user.fullName || user.email || 'this account';
    this.confirm.confirm(block
      ? { title: 'Block account?', message: `Block ${name}? They are signed out and cannot sign in until you unblock them.`, confirmLabel: 'Block account', destructive: true }
      : { title: 'Unblock account?', message: `Unblock ${name}? They can sign in again and their wrong-password count is reset.`, confirmLabel: 'Unblock account' }
    ).subscribe(ok => {
      if (!ok) return;
      this.authApi.setUserBlocked(token, user._id, block).subscribe({
        next: updated => { Object.assign(user, updated); this.toast.success(`${name} ${block ? 'blocked' : 'unblocked'}.`); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }
  get title(): string { return ({ dashboard: 'Platform dashboard', clients: 'Education workspaces', add: 'Add a workspace', detail: 'Workspace profile', edit: 'Edit workspace', users: 'Users', subscriptions: 'Subscriptions', reports: 'Reports', settings: 'Settings' } as const)[this.mode]; }
  get subtitle(): string {
    return ({ dashboard: 'Manage coaching and school workspaces from one place.', clients: 'Manage every education workspace using EduNexa.', add: 'Create a coaching or school workspace with its owner login.',
      detail: 'Education workspace details and configuration.', edit: 'Update the institute, owner, brand and modules.', users: 'Every account on the platform.', subscriptions: 'Plans, renewals and payments for each institute.',
      reports: 'Platform growth, revenue and usage.', settings: 'Plans, support contact and renewal reminders.' } as const)[this.mode];
  }
}

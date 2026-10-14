import { Component, OnInit } from '@angular/core';
import { FormBuilder, NgForm, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MockDataService } from '../core/mock-data.service';
import { MockClient } from '../core/mock-data/management-data';
import { ConfirmationDialogService } from '../core/confirmation-dialog.service';
import { MockAuthService } from '../core/mock-auth.service';
import { TenantContextService } from '../core/tenant-context.service';
import { AppValidators, normalizeMobile, validationMessage } from '../core/app-validators';
import { ToastService } from '../core/toast.service';

@Component({ selector: 'app-super-admin-page', templateUrl: './super-admin-page.component.html', styleUrls: ['./super-admin-page.component.scss'] })
export class SuperAdminPageComponent implements OnInit {
  search = ''; statusFilter = ''; typeFilter = ''; pageIndex = 0; pageSize = 5; mode: 'dashboard'|'clients'|'add'|'detail'|'edit'|'users'|'subscriptions'|'reports'|'settings' = 'dashboard'; selected?: MockClient; logo = '';
  readonly form = this.fb.group({ name: ['', [AppValidators.required, Validators.maxLength(80)]], type: ['Coaching Institute', AppValidators.required], owner: ['', [AppValidators.required, AppValidators.personName, Validators.maxLength(60)]], email: ['', [AppValidators.required, AppValidators.email, Validators.maxLength(120)]], phone: ['', [AppValidators.required, AppValidators.mobile]], address: ['', [AppValidators.required, Validators.maxLength(200)]], color: ['#4871e1'], secondary: ['#1b2052'], modules: [['Students', 'Courses', 'Fees', 'Website'], Validators.required] });
  constructor(public data: MockDataService, private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private confirm: ConfirmationDialogService, private auth: MockAuthService, private tenant: TenantContextService, private toast: ToastService) {}
  errorFor(name: string, label: string): string { return validationMessage(this.form.get(name), label); }
  ngOnInit(): void { this.route.paramMap.subscribe(params => { const path = this.router.url.split('?')[0]; const id = Number(params.get('id')); this.mode = path.endsWith('/clients/add') ? 'add' : id ? 'detail' : path.includes('/clients') ? 'clients' : path.includes('/users') ? 'users' : path.includes('/subscriptions') ? 'subscriptions' : path.includes('/reports') ? 'reports' : path.includes('/settings') ? 'settings' : 'dashboard'; this.selected = id ? this.data.clients.find(client => client.id === id) : undefined; if (id && this.router.url.includes('edit=1')) this.mode = 'edit'; if (this.selected && (this.mode === 'detail' || this.mode === 'edit')) this.logo = this.selected.logo || ''; this.form.patchValue({ ...this.selected, ...(this.selected ? { phone: normalizeMobile(this.selected.phone) } : {}), secondary: this.selected?.secondary || '#1b2052' }); }); }
  get coachingClients(): MockClient[] { return this.data.clients.filter(item => item.type === 'Coaching Institute'); }
  get educationClients(): MockClient[] { return this.data.clients.filter(item => item.type !== 'Clothing Shop'); }
  get activeEducationCount(): number { return this.educationClients.filter(client => client.status === 'Active').length; }
  showPlanForm = false;
  newPlan = { clientId: '', plan: 'Growth', amount: 1999, renewal: '31 Oct 2026' };
  readonly monthlyPlans = [
    { clientId: 1, plan: 'Academy', amount: 2499, renewal: '12 Oct 2026', status: 'Active' },
    { clientId: 3, plan: 'Growth', amount: 1999, renewal: '04 Oct 2026', status: 'Active' },
    { clientId: 5, plan: 'Academy', amount: 2499, renewal: '30 Sep 2026', status: 'Due soon' }
  ];
  get subscriptionRows() { return this.monthlyPlans.map(plan => ({ ...plan, center: this.coachingClients.find(client => client.id === plan.clientId) })).filter(row => !!row.center); }
  get activeCenterCount(): number { return this.coachingClients.filter(client => client.status === 'Active').length; }
  get monthlyRecurring(): number { return this.monthlyPlans.filter(plan => plan.status === 'Active').reduce((total, plan) => total + plan.amount, 0); }
  get dueSoonCount(): number { return this.monthlyPlans.filter(plan => plan.status === 'Due soon').length; }
  addSubscription(planForm?: NgForm): void { planForm?.form.markAllAsTouched(); const center = this.coachingClients.find(client => client.id === Number(this.newPlan.clientId)); if (!center || !this.newPlan.plan.trim() || !(Number(this.newPlan.amount) > 0) || !this.newPlan.renewal.trim() || planForm?.invalid) { this.toast.invalidForm(); return; } this.monthlyPlans.unshift({ clientId: center.id, plan: this.newPlan.plan.trim() || 'Growth', amount: Number(this.newPlan.amount), renewal: this.newPlan.renewal.trim(), status: 'Active' }); this.toast.success(`Monthly plan added for “${center.name}”.`); this.newPlan = { clientId: '', plan: 'Growth', amount: 1999, renewal: '31 Oct 2026' }; this.showPlanForm = false; }
  get filtered(): MockClient[] { const q = this.search.toLowerCase().trim(); return this.data.clients.filter(item => (!this.typeFilter || item.type === this.typeFilter) && (!q || `${item.name} ${item.owner} ${item.phone} ${item.email}`.toLowerCase().includes(q)) && (!this.statusFilter || item.status === this.statusFilter)); }
  get visible(): MockClient[] { return this.filtered.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize); }
  pageChanged(event: any): void { this.pageIndex = event.pageIndex; this.pageSize = event.pageSize; }
  openAdd(): void { this.router.navigate(['/super-admin/clients/add']); }
  view(item: MockClient): void { this.router.navigate(['/super-admin/clients', item.id]); }
  edit(item: MockClient): void { this.router.navigate(['/super-admin/clients', item.id, 'edit']); }
  toggle(item: MockClient): void { if (item.status === 'Active') { this.confirm.confirm({ title: 'Deactivate workspace?', message: `Deactivate “${item.name}”? Its users will lose access until you activate it again.`, confirmLabel: 'Deactivate', destructive: true }).subscribe(ok => { if (ok) { item.status = 'Inactive'; this.toast.warning(`Workspace “${item.name}” deactivated.`); } }); } else { item.status = 'Active'; this.toast.success(`Workspace “${item.name}” activated.`); } }
  loginAs(item: MockClient): void { this.confirm.confirm({ title: 'Open client workspace?', message: `Preview ${item.name} as its owner? This is a mock demo action.`, confirmLabel: 'Open workspace' }).subscribe(ok => { if (ok) { this.auth.login('Owner', true); this.tenant.setBusinessType(item.type === 'School' ? 'school' : item.type === 'Clothing Shop' ? 'clothing' : 'coaching'); this.router.navigate(['/client/dashboard']); } }); }
  onLogo(event: Event): void { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) { this.toast.error('Logo must be an image file (PNG, JPG or SVG).'); input.value = ''; return; } if (file.size > 2 * 1024 * 1024) { this.toast.error('Logo must be 2 MB or smaller.'); input.value = ''; return; } const reader = new FileReader(); reader.onload = () => { this.logo = String(reader.result || ''); this.toast.info('Logo uploaded. Save to apply it.'); }; reader.readAsDataURL(file); }
  get moduleOptions(): string[] { return this.form.value.type === 'School' ? ['Students', 'Teachers', 'Classes', 'Sections', 'Subjects', 'Attendance', 'Fees', 'Exams', 'Results', 'Admissions', 'Posts', 'Gallery', 'Website'] : ['Students', 'Teachers', 'Courses', 'Batches', 'Attendance', 'Fees', 'Admissions', 'Posts', 'Results', 'Study materials', 'Gallery', 'Website']; }
  toggleModule(module: string, checked: boolean): void { const current = this.form.value.modules || []; this.form.patchValue({ modules: checked ? [...current, module] : current.filter(item => item !== module) }); }
  save(): void { this.form.markAllAsTouched(); if (this.form.invalid) { this.toast.invalidForm(); return; } if (!this.form.value.modules?.length) { this.toast.error('Enable at least one module.'); return; } const value = this.form.getRawValue(); const record = { name: (value.name || '').trim(), type: value.type as MockClient['type'], owner: (value.owner || '').trim(), email: (value.email || '').trim(), phone: normalizeMobile(value.phone || ''), address: (value.address || '').trim(), color: value.color || '#4871e1', modules: value.modules || [], secondary: value.secondary || '#1b2052', logo: this.logo }; if (this.mode === 'edit' && this.selected) Object.assign(this.selected, record); else this.data.addClient(record); this.toast.success(this.mode === 'edit' ? `Workspace “${record.name}” updated.` : `Workspace “${record.name}” created.`); this.router.navigate(['/super-admin/clients']); }
  get title(): string { return ({ dashboard: 'Platform dashboard', clients: 'Education workspaces', add: 'Add a workspace', detail: 'Client profile', edit: 'Edit client', users: 'Users', subscriptions: 'Subscriptions', reports: 'Reports', settings: 'Settings' } as const)[this.mode]; }
}

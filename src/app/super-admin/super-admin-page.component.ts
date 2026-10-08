import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MockDataService } from '../core/mock-data.service';
import { MockClient } from '../core/mock-data/management-data';
import { ConfirmationDialogService } from '../core/confirmation-dialog.service';
import { MockAuthService } from '../core/mock-auth.service';
import { TenantContextService } from '../core/tenant-context.service';

@Component({ selector: 'app-super-admin-page', templateUrl: './super-admin-page.component.html', styleUrls: ['./super-admin-page.component.scss'] })
export class SuperAdminPageComponent implements OnInit {
  search = ''; statusFilter = ''; typeFilter = ''; pageIndex = 0; pageSize = 5; mode: 'dashboard'|'clients'|'add'|'detail'|'edit'|'users'|'subscriptions'|'reports'|'settings' = 'dashboard'; selected?: MockClient; logo = '';
  readonly form = this.fb.group({ name: ['', Validators.required], type: ['Coaching Institute', Validators.required], owner: ['', Validators.required], email: ['', [Validators.required, Validators.email]], phone: ['', Validators.required], address: ['', Validators.required], color: ['#138e79'], secondary: ['#102b35'], modules: [['Students', 'Courses', 'Fees', 'Website'], Validators.required] });
  constructor(public data: MockDataService, private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private confirm: ConfirmationDialogService, private auth: MockAuthService, private tenant: TenantContextService) {}
  ngOnInit(): void { this.route.paramMap.subscribe(params => { const path = this.router.url.split('?')[0]; const id = Number(params.get('id')); this.mode = path.endsWith('/clients/add') ? 'add' : id ? 'detail' : path.includes('/clients') ? 'clients' : path.includes('/users') ? 'users' : path.includes('/subscriptions') ? 'subscriptions' : path.includes('/reports') ? 'reports' : path.includes('/settings') ? 'settings' : 'dashboard'; this.selected = id ? this.data.clients.find(client => client.id === id) : undefined; if (id && this.router.url.includes('edit=1')) this.mode = 'edit'; if (this.selected && (this.mode === 'detail' || this.mode === 'edit')) this.logo = this.selected.logo || ''; this.form.patchValue({ ...this.selected, secondary: this.selected.secondary || '#102b35' }); }); }
  get coachingClients(): MockClient[] { return this.data.clients.filter(item => item.type === 'Coaching Institute'); }
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
  addSubscription(): void { const center = this.coachingClients.find(client => client.id === Number(this.newPlan.clientId)); if (!center || !this.newPlan.amount) return; this.monthlyPlans.unshift({ clientId: center.id, plan: this.newPlan.plan.trim() || 'Growth', amount: Number(this.newPlan.amount), renewal: this.newPlan.renewal, status: 'Active' }); this.newPlan = { clientId: '', plan: 'Growth', amount: 1999, renewal: '31 Oct 2026' }; this.showPlanForm = false; }
  get filtered(): MockClient[] { const q = this.search.toLowerCase().trim(); return this.coachingClients.filter(item => (!q || `${item.name} ${item.owner} ${item.phone} ${item.email}`.toLowerCase().includes(q)) && (!this.statusFilter || item.status === this.statusFilter)); }
  get visible(): MockClient[] { return this.filtered.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize); }
  pageChanged(event: any): void { this.pageIndex = event.pageIndex; this.pageSize = event.pageSize; }
  openAdd(): void { this.router.navigate(['/super-admin/clients/add']); }
  view(item: MockClient): void { this.router.navigate(['/super-admin/clients', item.id]); }
  edit(item: MockClient): void { this.router.navigate(['/super-admin/clients', item.id, 'edit']); }
  toggle(item: MockClient): void { item.status = item.status === 'Active' ? 'Inactive' : 'Active'; }
  loginAs(item: MockClient): void { this.confirm.confirm({ title: 'Open client workspace?', message: `Preview ${item.name} as its owner? This is a mock demo action.`, confirmLabel: 'Open workspace' }).subscribe(ok => { if (ok) { this.auth.login('Owner', true); this.tenant.setBusinessType(item.type === 'Clothing Shop' ? 'clothing' : 'coaching'); this.router.navigate(['/client/dashboard']); } }); }
  onLogo(event: Event): void { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => this.logo = String(reader.result || ''); reader.readAsDataURL(file); }
  toggleModule(module: string, checked: boolean): void { const current = this.form.value.modules || []; this.form.patchValue({ modules: checked ? [...current, module] : current.filter(item => item !== module) }); }
  save(): void { this.form.markAllAsTouched(); if (this.form.invalid) return; const value = this.form.getRawValue(); const record = { name: value.name || '', type: value.type as MockClient['type'], owner: value.owner || '', email: value.email || '', phone: value.phone || '', address: value.address || '', color: value.color || '#138e79', modules: value.modules || [], secondary: value.secondary || '#102b35', logo: this.logo }; if (this.mode === 'edit' && this.selected) Object.assign(this.selected, record); else this.data.addClient(record); this.router.navigate(['/super-admin/clients']); }
  get title(): string { return ({ dashboard: 'Platform dashboard', clients: 'Coaching centers', add: 'Add a coaching center', detail: 'Client profile', edit: 'Edit client', users: 'Users', subscriptions: 'Subscriptions', reports: 'Reports', settings: 'Settings' } as const)[this.mode]; }
}

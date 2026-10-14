import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import * as XLSX from 'xlsx';
import { MockDataService } from '../core/mock-data.service';
import { MockStudent } from '../core/mock-data/management-data';
import { ConfirmationDialogService } from '../core/confirmation-dialog.service';
import { TenantContextService } from '../core/tenant-context.service';
import { MockAuthService } from '../core/mock-auth.service';
import { AppValidators, normalizeMobile, validationMessage } from '../core/app-validators';
import { ToastService } from '../core/toast.service';
import { ADMISSION_QUOTAS, COACHING_BOARDS, SCHOOL_TERMS } from '../core/workspace-terms';

const notFuture = (control: AbstractControl): ValidationErrors | null => { if (!control.value) return null; const date = control.value instanceof Date ? control.value : new Date(String(control.value)); return Number.isNaN(date.getTime()) ? { invalidDate: true } : date.getTime() > Date.now() ? { futureDate: true } : null; };
const MAX_UPLOAD = 10 * 1024 * 1024;

@Component({ selector: 'app-students-page', templateUrl: './students-page.component.html', styleUrls: ['./students-page.component.scss'] })
export class StudentsPageComponent implements OnInit {
  search = ''; batch = ''; status = ''; feeStatus = ''; pageIndex = 0; pageSize = 5; photo = ''; selected?: MockStudent; mode: 'list'|'add'|'edit'|'view' = 'list';
  readonly today = new Date();
  readonly form = this.fb.group({ name: ['', [AppValidators.required, AppValidators.personName, Validators.maxLength(80)]], dob: ['', notFuture], gender: [''], phone: ['', [AppValidators.required, AppValidators.mobile]], email: ['', [AppValidators.email, Validators.maxLength(120)]], father: ['', [AppValidators.required, AppValidators.personName, Validators.maxLength(80)]], mother: ['', [AppValidators.personName, Validators.maxLength(80)]], parentPhone: ['', AppValidators.mobile], course: ['', AppValidators.required], batch: ['', AppValidators.required], admission: ['', [AppValidators.required, notFuture]], address: ['', Validators.maxLength(200)], city: ['', Validators.maxLength(60)], state: ['', Validators.maxLength(60)], pincode: ['', AppValidators.pincode], monthlyFee: [0 as number | null, [AppValidators.required, AppValidators.positive]], discount: [0 as number | null, AppValidators.nonNegative], school: ['', Validators.maxLength(120)], board: [''], rollNo: ['', Validators.maxLength(30)], semester: [''], quota: [''] });
  readonly boards = COACHING_BOARDS; readonly schoolTerms = SCHOOL_TERMS; readonly quotas = ADMISSION_QUOTAS;
  constructor(public data: MockDataService, private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private confirm: ConfirmationDialogService, private toast: ToastService, private tenant: TenantContextService, public auth: MockAuthService) {}
  get isTeacher(): boolean { return this.auth.role === 'Teacher'; }
  get isSchool(): boolean { return this.tenant.isSchool; }
  get terms() { return this.tenant.terms; }
  get courseOptions(): string[] { return this.terms.courseOptions; }
  get batchOptions(): string[] { return this.terms.groupOptions; }
  ngOnInit(): void { this.route.paramMap.subscribe(params => { const id = Number(params.get('id')); const path = this.router.url; this.mode = path.endsWith('/add') ? 'add' : id ? (path.includes('/edit') ? 'edit' : 'view') : 'list'; this.selected = id ? this.data.students.find(student => student.id === id) : undefined; if (this.selected && this.mode !== 'list') this.form.patchValue({ ...this.selected, phone: normalizeMobile(this.selected.phone), parentPhone: normalizeMobile(this.selected.phone) }); }); }
  errorFor(name: string, label: string): string { const control = this.form.get(name); if (control?.hasError('futureDate')) return `${label} cannot be in the future.`; if (control?.hasError('invalidDate')) return 'Enter a valid date.'; if (control?.hasError('exceedsFee')) return `${label} cannot be more than the ${this.terms.feeLabel.toLowerCase()}.`; return validationMessage(control, label); }
  get activeCount(): number { return this.data.students.filter(student => student.status === 'Active').length; }
  get pendingCount(): number { return this.data.students.filter(student => student.feeStatus !== 'Paid').length; }
  get filtered(): MockStudent[] { const q = this.search.trim().toLowerCase(); return this.data.students.filter(student => (!q || `${student.name} ${student.studentId} ${student.phone} ${student.father}`.toLowerCase().includes(q)) && (!this.batch || student.batch === this.batch) && (!this.status || student.status === this.status) && (!this.feeStatus || student.feeStatus === this.feeStatus)); }
  get visible(): MockStudent[] { return this.filtered.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize); }
  pageChanged(event: PageEvent): void { this.pageIndex = event.pageIndex; this.pageSize = event.pageSize; }
  goAdd(): void { this.router.navigate(['/client/students/add']); }
  edit(student: MockStudent): void { if (!this.isTeacher) this.router.navigate(['/client/students', student.id, 'edit']); }
  view(student: MockStudent): void { this.router.navigate(['/client/students', student.id]); }
  closeForm(): void { this.router.navigate(['/client/students']); }
  remove(student: MockStudent): void { if (this.isTeacher) return; this.confirm.confirm({ title: 'Delete student?', message: `Delete ${student.name} from the student records? This action cannot be undone.`, confirmLabel: 'Delete student', destructive: true }).subscribe(accepted => { if (accepted) { this.data.students = this.data.students.filter(item => item.id !== student.id); this.toast.success(`Student “${student.name}” deleted.`); } }); }
  save(): void { if (this.isTeacher || this.mode === 'view') return; const discount = this.form.controls.discount; discount.updateValueAndValidity(); if (Number(discount.value) > Number(this.form.controls.monthlyFee.value)) discount.setErrors({ ...(discount.errors || {}), exceedsFee: true }); this.form.markAllAsTouched(); if (this.form.invalid) { this.toast.invalidForm(); return; } const value = this.form.getRawValue(); const name = (value.name || '').trim(); const record = { ...value, name, email: (value.email || '').trim(), dob: this.dateValue(value.dob), gender: value.gender || '', father: value.father || '', mother: value.mother || '', phone: normalizeMobile(value.parentPhone || value.phone || ''), course: value.course || '', batch: value.batch || '', admission: this.dateValue(value.admission), address: value.address || '', city: value.city || '', state: value.state || '', pincode: normalizeMobile(value.pincode || ''), monthlyFee: Number(value.monthlyFee) || 0, discount: Number(value.discount) || 0, feeStatus: 'Paid' as const }; if (this.mode === 'edit' && this.selected) { Object.assign(this.selected, record, this.photo ? { photo: this.photo } : {}); this.toast.success('Changes saved.'); } else { this.data.addStudent({ ...record, photo: this.photo }); this.toast.success(`Student “${name}” added.`); } this.closeForm(); }
  private dateValue(value: unknown): string { if (!value) return ''; const date = value instanceof Date ? value : new Date(String(value)); return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10); }
  onPhoto(event: Event): void { const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) { this.toast.error('Please choose an image file (JPG or PNG).'); input.value = ''; return; } if (file.size > MAX_UPLOAD) { this.toast.error('Photo must be 10 MB or smaller.'); input.value = ''; return; } const reader = new FileReader(); reader.onload = () => { this.photo = String(reader.result || ''); this.toast.success('Photo added.'); }; reader.readAsDataURL(file); }
  exportExcel(): void { if (!this.filtered.length) { this.toast.error('No students to export.'); return; } const rows = this.filtered.map(({ photo, ...student }) => student); const sheet = XLSX.utils.json_to_sheet(rows); const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Students'); XLSX.writeFile(book, `${this.isSchool ? 'greenfield' : 'northstar'}-students.xlsx`); this.toast.success(`Exported ${rows.length} student${rows.length === 1 ? '' : 's'} to Excel.`); }
}

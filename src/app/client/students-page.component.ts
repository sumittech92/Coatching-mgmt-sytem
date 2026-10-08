import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import * as XLSX from 'xlsx';
import { MockDataService } from '../core/mock-data.service';
import { MockStudent } from '../core/mock-data/management-data';
import { ConfirmationDialogService } from '../core/confirmation-dialog.service';

@Component({ selector: 'app-students-page', templateUrl: './students-page.component.html', styleUrls: ['./students-page.component.scss'] })
export class StudentsPageComponent implements OnInit {
  search = ''; batch = ''; status = ''; feeStatus = ''; pageIndex = 0; pageSize = 5; photo = ''; selected?: MockStudent; mode: 'list'|'add'|'edit'|'view' = 'list';
  readonly form = this.fb.group({ name: ['', Validators.required], dob: [''], gender: [''], phone: ['', [Validators.required, Validators.minLength(8)]], email: ['', Validators.email], father: ['', Validators.required], mother: [''], parentPhone: [''], course: ['', Validators.required], batch: ['', Validators.required], admission: ['', Validators.required], address: [''], city: [''], state: [''], pincode: [''], monthlyFee: [0, Validators.required], discount: [0] });
  constructor(public data: MockDataService, private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private confirm: ConfirmationDialogService) {}
  ngOnInit(): void { this.route.paramMap.subscribe(params => { const id = Number(params.get('id')); const path = this.router.url; this.mode = path.endsWith('/add') ? 'add' : id ? (path.includes('/edit') ? 'edit' : 'view') : 'list'; this.selected = id ? this.data.students.find(student => student.id === id) : undefined; if (this.selected && this.mode !== 'list') this.form.patchValue({ ...this.selected, parentPhone: this.selected.phone }); }); }
  get activeCount(): number { return this.data.students.filter(student => student.status === 'Active').length; }
  get pendingCount(): number { return this.data.students.filter(student => student.feeStatus !== 'Paid').length; }
  get filtered(): MockStudent[] { const q = this.search.trim().toLowerCase(); return this.data.students.filter(student => (!q || `${student.name} ${student.studentId} ${student.phone} ${student.father}`.toLowerCase().includes(q)) && (!this.batch || student.batch === this.batch) && (!this.status || student.status === this.status) && (!this.feeStatus || student.feeStatus === this.feeStatus)); }
  get visible(): MockStudent[] { return this.filtered.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize); }
  pageChanged(event: PageEvent): void { this.pageIndex = event.pageIndex; this.pageSize = event.pageSize; }
  goAdd(): void { this.router.navigate(['/client/students/add']); }
  edit(student: MockStudent): void { this.router.navigate(['/client/students', student.id, 'edit']); }
  view(student: MockStudent): void { this.router.navigate(['/client/students', student.id]); }
  closeForm(): void { this.router.navigate(['/client/students']); }
  remove(student: MockStudent): void { this.confirm.confirm({ title: 'Delete student?', message: `Delete ${student.name} from the student records? This action cannot be undone.`, confirmLabel: 'Delete student', destructive: true }).subscribe(accepted => { if (accepted) this.data.students = this.data.students.filter(item => item.id !== student.id); }); }
  save(): void { if (this.mode === 'view') return; this.form.markAllAsTouched(); if (this.form.invalid) return; const value = this.form.getRawValue(); const record = { ...value, email: value.email || '', dob: value.dob || '', gender: value.gender || '', father: value.father || '', mother: value.mother || '', phone: value.parentPhone || value.phone || '', course: value.course || '', batch: value.batch || '', admission: value.admission || '', address: value.address || '', city: value.city || '', state: value.state || '', pincode: value.pincode || '', monthlyFee: Number(value.monthlyFee) || 0, discount: Number(value.discount) || 0, feeStatus: 'Paid' as const }; if (this.mode === 'edit' && this.selected) Object.assign(this.selected, record); else this.data.addStudent({ ...record, photo: this.photo }); this.closeForm(); }
  onPhoto(event: Event): void { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => this.photo = String(reader.result || ''); reader.readAsDataURL(file); }
  exportExcel(): void { const rows = this.filtered.map(({ photo, ...student }) => student); const sheet = XLSX.utils.json_to_sheet(rows); const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Students'); XLSX.writeFile(book, 'northstar-students.xlsx'); }
}

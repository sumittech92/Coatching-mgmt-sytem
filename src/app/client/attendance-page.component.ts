import { Component } from '@angular/core';
import { ConfirmationDialogService } from '../core/confirmation-dialog.service';
import { TenantContextService } from '../core/tenant-context.service';
import { MockAuthService } from '../core/mock-auth.service';
import { ToastService } from '../core/toast.service';
interface AttendanceRecord { id: string; name: string; course: string; batch: string; teacher: string; photo: string; status: 'Present'|'Absent'|'Late'|'Leave'; percent: number; }
@Component({ selector: 'app-attendance-page', templateUrl: './attendance-page.component.html', styleUrls: ['./attendance-page.component.scss'] })
export class AttendancePageComponent {
  readonly today = new Date(); date = new Date(2026, 8, 28); batch = 'All batches'; teacher = 'All teachers'; view: 'daily'|'monthly' = 'daily'; history?: AttendanceRecord;
  private readonly coachingRecords: AttendanceRecord[] = [
    { id: 'NS-2401', name: 'Aarav Sharma', course: 'Class 12 Science', batch: 'Physics · Morning', teacher: 'Priya Nair', photo: 'AS', status: 'Present', percent: 96 },
    { id: 'NS-2402', name: 'Meera Kapoor', course: 'Class 11 Science', batch: 'Chemistry · Evening', teacher: 'Ankit Rao', photo: 'MK', status: 'Present', percent: 91 },
    { id: 'NS-2403', name: 'Rohan Verma', course: 'Class 12 Science', batch: 'Mathematics · Morning', teacher: 'Priya Nair', photo: 'RV', status: 'Absent', percent: 78 },
    { id: 'NS-2404', name: 'Diya Iyer', course: 'Class 10 Foundation', batch: 'Foundation · Afternoon', teacher: 'Nisha Thomas', photo: 'DI', status: 'Present', percent: 98 },
    { id: 'NS-2405', name: 'Kabir Singh', course: 'Class 12 Commerce', batch: 'Accounts · Evening', teacher: 'Dev Malhotra', photo: 'KS', status: 'Late', percent: 86 },
    { id: 'NS-2406', name: 'Sana Khan', course: 'Class 11 Science', batch: 'Chemistry · Evening', teacher: 'Ankit Rao', photo: 'SK', status: 'Leave', percent: 94 },
    { id: 'NS-2407', name: 'Arjun Das', course: 'Class 12 Science', batch: 'Physics · Morning', teacher: 'Priya Nair', photo: 'AD', status: 'Present', percent: 89 },
    { id: 'NS-2408', name: 'Tara Menon', course: 'Class 10 Foundation', batch: 'Foundation · Afternoon', teacher: 'Nisha Thomas', photo: 'TM', status: 'Present', percent: 97 }
  ];
  private readonly schoolRecords: AttendanceRecord[] = [
    { id: 'GPS-2601', name: 'Ishita Rao', course: 'Class 9', batch: 'Section A', teacher: 'Mr. Rahul Mehta', photo: 'IR', status: 'Present', percent: 94 },
    { id: 'GPS-2606', name: 'Vihaan Gupta', course: 'Class 9', batch: 'Section A', teacher: 'Mr. Rahul Mehta', photo: 'VG', status: 'Present', percent: 90 },
    { id: 'GPS-2602', name: 'Aditya Menon', course: 'Class 10', batch: 'Section B', teacher: 'Mrs. Meenakshi Pillai', photo: 'AM', status: 'Present', percent: 88 },
    { id: 'GPS-2607', name: 'Myra Joshi', course: 'Class 10', batch: 'Section B', teacher: 'Mrs. Meenakshi Pillai', photo: 'MJ', status: 'Leave', percent: 93 },
    { id: 'GPS-2603', name: 'Sana Ahmed', course: 'Class 6', batch: 'Section A', teacher: 'Mr. Farhan Qureshi', photo: 'SA', status: 'Absent', percent: 91 },
    { id: 'GPS-2604', name: 'Rohan Das', course: 'Class 12', batch: 'Section C', teacher: 'Mrs. Neha Iyer', photo: 'RD', status: 'Present', percent: 96 },
    { id: 'GPS-2605', name: 'Anika Sharma', course: 'Class 3', batch: 'Section B', teacher: 'Ms. Ananya Rao', photo: 'AS', status: 'Late', percent: 97 }
  ];
  constructor(private confirm: ConfirmationDialogService, private tenant: TenantContextService, private toast: ToastService, private auth: MockAuthService) {}
  /** Teachers mark attendance only for their own students; the teacher filter is for Owners. */
  get isTeacher(): boolean { return this.auth.role === 'Teacher'; }
  get isSchool(): boolean { return this.tenant.current.businessType === 'school'; }
  get records(): AttendanceRecord[] { const all = this.isSchool ? this.schoolRecords : this.coachingRecords; return this.isTeacher ? all.filter(item => item.teacher === this.tenant.demoTeacherName) : all; }
  /** Coaching filters by batch; a school filters by class + section (e.g. “Class 9 · Section A”). */
  group(item: AttendanceRecord): string { return this.isSchool ? `${item.course} · ${item.batch}` : item.batch; }
  get batchOptions(): string[] { return [...new Set(this.records.map(item => this.group(item)))]; }
  get teacherOptions(): string[] { return [...new Set(this.records.map(item => item.teacher))]; }
  get batchSummary(): { name: string; rate: number }[] { return this.isSchool ? [{ name: 'Class 9 · Section A', rate: 94 }, { name: 'Class 10 · Section B', rate: 91 }, { name: 'Class 12 · Section C', rate: 96 }] : [{ name: 'Physics · Morning', rate: 94 }, { name: 'Chemistry · Evening', rate: 89 }, { name: 'Foundation · Afternoon', rate: 97 }]; }
  get present(): number { return this.visible.filter(item => item.status === 'Present').length; }
  get absent(): number { return this.visible.filter(item => item.status === 'Absent').length; }
  get marked(): number { return this.visible.length; }
  get average(): number { return Math.round(this.records.reduce((sum, item) => sum + item.percent, 0) / this.records.length); }
  get visible(): AttendanceRecord[] { return this.records.filter(item => (this.batch === 'All batches' || this.group(item) === this.batch) && (this.isTeacher || this.teacher === 'All teachers' || item.teacher === this.teacher)); }
  mark(record: AttendanceRecord, status: AttendanceRecord['status']): void { record.status = status; }
  markAll(status: AttendanceRecord['status']): void { const rows = this.visible; if (!rows.length) { this.toast.warning('No students in view to mark.'); return; } rows.forEach(item => item.status = status); this.toast.success(`Marked ${rows.length} student${rows.length === 1 ? '' : 's'} ${status.toLowerCase()}.`); }
  setView(value: 'daily'|'monthly'): void { this.view = value; this.history = undefined; }
  showHistory(item: AttendanceRecord): void { this.history = item; }
  clearHistory(): void { this.history = undefined; }
  save(): void { const date = this.date instanceof Date ? this.date : this.date ? new Date(this.date) : null; if (!date || Number.isNaN(date.getTime())) { this.toast.error('Choose a valid attendance date.'); return; } if (date.getTime() > Date.now()) { this.toast.error('Attendance cannot be saved for a future date.'); return; } if (!this.visible.length) { this.toast.warning('No students in view to save attendance for.'); return; } const scope = this.batch === 'All batches' ? (this.isSchool ? 'all sections' : 'all batches') : this.batch; this.confirm.confirm({ title: 'Save attendance?', message: `Save attendance for ${this.visible.length} students on ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}? This updates only the local demo state.`, confirmLabel: 'Save attendance' }).subscribe(accepted => { if (accepted) this.toast.success(`Attendance saved for ${scope}.`); }); }
  statusTone(status: string): 'success'|'warning'|'danger'|'neutral' { return status === 'Present' ? 'success' : status === 'Late' ? 'warning' : status === 'Absent' ? 'danger' : 'neutral'; }
}

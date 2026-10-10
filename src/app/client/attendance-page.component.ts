import { Component } from '@angular/core';
import { ConfirmationDialogService } from '../core/confirmation-dialog.service';
import { TenantContextService } from '../core/tenant-context.service';
interface AttendanceRecord { id: string; name: string; course: string; batch: string; teacher: string; photo: string; status: 'Present'|'Absent'|'Late'|'Leave'; percent: number; }
@Component({ selector: 'app-attendance-page', templateUrl: './attendance-page.component.html', styleUrls: ['./attendance-page.component.scss'] })
export class AttendancePageComponent {
  date = new Date(2026, 8, 28); batch = 'All batches'; teacher = 'All teachers'; view: 'daily'|'monthly' = 'daily'; history?: AttendanceRecord;
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
  private readonly collegeRecords: AttendanceRecord[] = [
    { id: 'GC-2601', name: 'Ishita Rao', course: 'B.Sc Computer Science', batch: 'Year 2 · Section A', teacher: 'Dr. Neha Iyer', photo: 'IR', status: 'Present', percent: 94 },
    { id: 'GC-2602', name: 'Aditya Menon', course: 'B.Com', batch: 'Year 1 · Section B', teacher: 'Prof. Rahul Mehta', photo: 'AM', status: 'Present', percent: 88 },
    { id: 'GC-2603', name: 'Sana Ahmed', course: 'BA Psychology', batch: 'Year 3 · Section A', teacher: 'Dr. Ananya Rao', photo: 'SA', status: 'Absent', percent: 91 },
    { id: 'GC-2604', name: 'Rohan Das', course: 'BBA', batch: 'Year 2 · Section C', teacher: 'Dr. Karan Shah', photo: 'RD', status: 'Present', percent: 96 },
    { id: 'GC-2605', name: 'Diya Nair', course: 'B.Sc Life Sciences', batch: 'Year 1 · Section A', teacher: 'Dr. Ananya Rao', photo: 'DN', status: 'Late', percent: 86 }
  ];
  constructor(private confirm: ConfirmationDialogService, private tenant: TenantContextService) {}
  get isCollege(): boolean { return this.tenant.current.businessType === 'college'; }
  get records(): AttendanceRecord[] { return this.isCollege ? this.collegeRecords : this.coachingRecords; }
  get batchOptions(): string[] { return [...new Set(this.records.map(item => item.batch))]; }
  get teacherOptions(): string[] { return [...new Set(this.records.map(item => item.teacher))]; }
  get batchSummary(): { name: string; rate: number }[] { return this.isCollege ? [{ name: 'Year 1 · Section A', rate: 94 }, { name: 'Year 2 · Section A', rate: 91 }, { name: 'Year 3 · Section A', rate: 96 }] : [{ name: 'Physics · Morning', rate: 94 }, { name: 'Chemistry · Evening', rate: 89 }, { name: 'Foundation · Afternoon', rate: 97 }]; }
  get present(): number { return this.visible.filter(item => item.status === 'Present').length; }
  get absent(): number { return this.visible.filter(item => item.status === 'Absent').length; }
  get marked(): number { return this.visible.length; }
  get average(): number { return Math.round(this.records.reduce((sum, item) => sum + item.percent, 0) / this.records.length); }
  get visible(): AttendanceRecord[] { return this.records.filter(item => (this.batch === 'All batches' || item.batch === this.batch) && (this.teacher === 'All teachers' || item.teacher === this.teacher)); }
  mark(record: AttendanceRecord, status: AttendanceRecord['status']): void { record.status = status; }
  markAll(status: AttendanceRecord['status']): void { this.records.forEach(item => { if (this.batch === 'All batches' || item.batch === this.batch) item.status = status; }); }
  setView(value: 'daily'|'monthly'): void { this.view = value; this.history = undefined; }
  showHistory(item: AttendanceRecord): void { this.history = item; }
  clearHistory(): void { this.history = undefined; }
  save(): void { this.confirm.confirm({ title: 'Save attendance?', message: `Save attendance for ${this.visible.length} students on ${this.date.toLocaleDateString()}? This updates only the local demo state.`, confirmLabel: 'Save attendance' }).subscribe(() => undefined); }
  statusTone(status: string): 'success'|'warning'|'danger'|'neutral' { return status === 'Present' ? 'success' : status === 'Late' ? 'warning' : status === 'Absent' ? 'danger' : 'neutral'; }
}

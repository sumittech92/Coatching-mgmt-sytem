import { Component, OnInit } from '@angular/core';
import { ConfirmationDialogService } from '../core/confirmation-dialog.service';
import { TenantContextService } from '../core/tenant-context.service';
import { MockAuthService } from '../core/mock-auth.service';
import { ToastService } from '../core/toast.service';
import { ApiAttendanceStatus, ApiAttendanceSummary, AttendanceApiService } from '../core/attendance-api.service';
type AttendanceStatus = 'Present'|'Absent'|'Late'|'Leave';
interface AttendanceRecord { id: string; name: string; course: string; batch: string; teacher: string; photo: string; status: AttendanceStatus | null; percent: number; group?: string; days?: Record<string, ApiAttendanceStatus>; }
interface DayMark { label: string; tone: '' | 'absent-dot' | 'leave-dot' | 'late-dot' | 'empty-dot'; }
const TO_UI: Record<ApiAttendanceStatus, AttendanceStatus> = { present: 'Present', absent: 'Absent', late: 'Late', leave: 'Leave' };
const TO_API: Record<AttendanceStatus, ApiAttendanceStatus> = { Present: 'present', Absent: 'absent', Late: 'late', Leave: 'leave' };
const DEMO_DAYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
@Component({ selector: 'app-attendance-page', templateUrl: './attendance-page.component.html', styleUrls: ['./attendance-page.component.scss'] })
export class AttendancePageComponent implements OnInit {
  readonly today = new Date(); date = new Date(2026, 8, 28); batch = 'All batches'; teachers: string[] = []; view: 'daily'|'monthly' = 'daily'; history?: AttendanceRecord;
  /** Live (API) state: used when signed in with a real account. */
  loading = false; saving = false; liveRecords: AttendanceRecord[] = []; monthRecords: AttendanceRecord[] = []; monthDayCount = 0; summary?: ApiAttendanceSummary;
  historyStats?: { percent: number; present: number; absent: number; month: string };
  private loadedMonth = '';
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
  constructor(private confirm: ConfirmationDialogService, private tenant: TenantContextService, private toast: ToastService, private auth: MockAuthService, private api: AttendanceApiService) {}
  ngOnInit(): void { if (this.live) { this.date = new Date(); this.loadRegister(); this.loadSummary(); } }
  /** Real account: read and save attendance through the API. Demo sessions keep the sample register. */
  get live(): boolean { return !!this.auth.token; }
  /** Teachers mark attendance only for their own students; the teacher filter is for Owners. */
  get isTeacher(): boolean { return this.auth.role === 'Teacher'; }
  get isSchool(): boolean { return this.tenant.current.businessType === 'school'; }
  get records(): AttendanceRecord[] {
    if (this.live) return this.liveRecords;
    const all = this.isSchool ? this.schoolRecords : this.coachingRecords; return this.isTeacher ? all.filter(item => item.teacher === this.tenant.demoTeacherName) : all;
  }
  /** Coaching filters by batch; a school filters by class + section (e.g. “Class 9 · Section A”). */
  group(item: AttendanceRecord): string { return item.group ?? (this.isSchool ? `${item.course} · ${item.batch}` : item.batch); }
  get batchOptions(): string[] { return [...new Set(this.records.map(item => this.group(item)))]; }
  get teacherOptions(): string[] { return [...new Set(this.records.map(item => item.teacher).filter(Boolean))]; }
  get batchSummary(): { name: string; rate: number }[] {
    if (this.live) return this.summary?.groups ?? [];
    return this.isSchool ? [{ name: 'Class 9 · Section A', rate: 94 }, { name: 'Class 10 · Section B', rate: 91 }, { name: 'Class 12 · Section C', rate: 96 }] : [{ name: 'Physics · Morning', rate: 94 }, { name: 'Chemistry · Evening', rate: 89 }, { name: 'Foundation · Afternoon', rate: 97 }];
  }
  /** Register rows after the batch / teacher filters (the counts always come from the daily register). */
  get register(): AttendanceRecord[] { return this.applyFilters(this.records); }
  get present(): number { return this.register.filter(item => item.status === 'Present').length; }
  get absent(): number { return this.register.filter(item => item.status === 'Absent').length; }
  get unmarked(): number { return this.register.filter(item => !item.status).length; }
  get marked(): number { return this.register.length; }
  get average(): number {
    if (this.live) return this.summary?.rate ?? 0;
    return this.records.length ? Math.round(this.records.reduce((sum, item) => sum + item.percent, 0) / this.records.length) : 0;
  }
  get visible(): AttendanceRecord[] { return this.live && this.view === 'monthly' ? this.applyFilters(this.monthRecords) : this.register; }
  private applyFilters(list: AttendanceRecord[]): AttendanceRecord[] { return list.filter(item => (this.batch === 'All batches' || this.group(item) === this.batch) && (this.isTeacher || !this.teachers.length || this.teachers.includes(item.teacher))); }

  /** Month grid columns: every day of the month when live, the first ten days in the demo. */
  get monthDays(): number[] { return this.live ? Array.from({ length: this.monthDayCount }, (_, index) => index + 1) : DEMO_DAYS; }
  get monthColumns(): string { return `1.6fr repeat(${this.monthDays.length},27px) 45px`; }
  get monthMinWidth(): number { return 160 + this.monthDays.length * 30 + 50; }
  dayMark(item: AttendanceRecord, day: number): DayMark {
    if (this.live) {
      const status = item.days?.[day];
      return !status ? { label: '·', tone: 'empty-dot' } : status === 'present' ? { label: 'P', tone: '' } : status === 'absent' ? { label: 'A', tone: 'absent-dot' } : status === 'late' ? { label: 'L', tone: 'late-dot' } : { label: 'L', tone: 'leave-dot' };
    }
    if (day === 3 && item.status === 'Absent') return { label: 'A', tone: 'absent-dot' };
    if (day === 6 && item.status === 'Leave') return { label: 'L', tone: 'leave-dot' };
    if (day === 8 && item.status === 'Late') return { label: 'L', tone: 'late-dot' };
    return { label: 'P', tone: '' };
  }

  get monthLabel(): string { return this.validDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); }
  get monthLongLabel(): string { return this.validDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); }
  /** Change against last month, e.g. “+2.4%”. */
  get trendChange(): string {
    if (!this.live) return '+2.4%';
    if (this.summary?.previousRate == null) return '';
    const diff = this.summary.rate - this.summary.previousRate; return `${diff >= 0 ? '+' : ''}${diff}%`;
  }
  get trendTone(): 'success'|'danger' { return this.trendChange.startsWith('-') ? 'danger' : 'success'; }
  get presentPath(): string { return this.live ? this.linePath(point => point.rate) : 'M0 92 C35 87 42 48 78 60 S124 86 157 53 S208 70 237 43 S290 55 322 24 S365 42 400 18'; }
  get absentPath(): string { return this.live ? this.linePath(point => point.marked ? Math.round(point.absent / point.marked * 100) : 0) : 'M0 115 C38 122 50 92 80 101 S128 115 160 89 S207 112 240 80 S286 99 321 67 S367 82 400 58'; }
  get chartLabels(): string[] {
    if (!this.live) return ['Sep 1', 'Sep 7', 'Sep 14', 'Sep 21', 'Sep 28'];
    const trend = this.summary?.trend ?? []; if (!trend.length) return [];
    const picks = trend.length <= 5 ? trend : [0, 1, 2, 3, 4].map(step => trend[Math.round(step * (trend.length - 1) / 4)]);
    return picks.map(point => new Date(`${point.date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
  }
  get hasTrend(): boolean { return !this.live || !!this.summary?.trend.length; }
  /** Polyline across the 400×150 chart for a 0–100 value per marked day. */
  private linePath(value: (point: ApiAttendanceSummary['trend'][number]) => number): string {
    const trend = this.summary?.trend ?? []; if (!trend.length) return '';
    const y = (rate: number) => (145 - rate * 1.35).toFixed(1);
    if (trend.length === 1) return `M0 ${y(value(trend[0]))} L400 ${y(value(trend[0]))}`;
    return trend.map((point, index) => `${index ? 'L' : 'M'}${(index * 400 / (trend.length - 1)).toFixed(1)} ${y(value(point))}`).join(' ');
  }

  get historyPercent(): number { return this.historyStats?.percent ?? this.history?.percent ?? 0; }
  get historyPresent(): number { return this.historyStats?.present ?? 21; }
  get historyAbsent(): number { return this.historyStats?.absent ?? 2; }
  get historyMonth(): string { return this.historyStats?.month ?? 'September 2026'; }

  mark(record: AttendanceRecord, status: AttendanceStatus): void { record.status = status; }
  markAll(status: AttendanceStatus): void { const rows = this.register; if (!rows.length) { this.toast.warning('No students in view to mark.'); return; } rows.forEach(item => item.status = status); this.toast.success(`Marked ${rows.length} student${rows.length === 1 ? '' : 's'} ${status.toLowerCase()}.`); }
  setView(value: 'daily'|'monthly'): void { this.view = value; this.clearHistory(); if (value === 'monthly' && this.live) this.loadMonthly(); }
  showHistory(item: AttendanceRecord): void {
    this.history = item; this.historyStats = undefined;
    const token = this.auth.token; if (!this.live || !token) return;
    this.api.student(token, item.id, this.monthKey).subscribe({
      next: data => { if (this.history === item) this.historyStats = { percent: data.percent, present: data.present + data.late, absent: data.absent, month: this.monthLongLabel }; },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  clearHistory(): void { this.history = undefined; this.historyStats = undefined; }
  /** Date picker changed: reload the register, and the month data when the month changed. */
  onDateChange(): void {
    if (!this.live || !this.dateKey) return;
    this.loadRegister(); if (this.monthKey !== this.loadedMonth) { this.loadSummary(); if (this.view === 'monthly') this.loadMonthly(); }
  }
  save(): void {
    const date = this.date instanceof Date ? this.date : this.date ? new Date(this.date) : null; if (!date || Number.isNaN(date.getTime())) { this.toast.error('Choose a valid attendance date.'); return; } if (date.getTime() > Date.now()) { this.toast.error('Attendance cannot be saved for a future date.'); return; } if (!this.register.length) { this.toast.warning('No students in view to save attendance for.'); return; }
    if (this.unmarked) { this.toast.warning(`${this.unmarked} student${this.unmarked === 1 ? ' is' : 's are'} not marked yet. Mark them or use Mark all.`); return; }
    const rows = this.register; const scope = this.batch === 'All batches' ? (this.isSchool ? 'all sections' : 'all batches') : this.batch;
    this.confirm.confirm({ title: 'Save attendance?', message: `Save attendance for ${rows.length} students on ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}?${this.live ? '' : ' This updates only the local demo state.'}`, confirmLabel: 'Save attendance' }).subscribe(accepted => {
      if (!accepted) return;
      const token = this.auth.token;
      if (!this.live || !token) { this.toast.success(`Attendance saved for ${scope}.`); return; }
      this.saving = true;
      this.api.mark(token, { date: this.dateKey, records: rows.map(item => ({ studentId: item.id, status: TO_API[item.status as AttendanceStatus] })) }).subscribe({
        next: () => { this.saving = false; this.toast.success(`Attendance saved for ${scope}.`); this.loadRegister(); this.loadSummary(); if (this.view === 'monthly') this.loadMonthly(); },
        error: (error: Error) => { this.saving = false; this.toast.error(error.message); }
      });
    });
  }
  statusTone(status: string): 'success'|'warning'|'danger'|'neutral' { return status === 'Present' ? 'success' : status === 'Late' ? 'warning' : status === 'Absent' ? 'danger' : 'neutral'; }

  private get validDate(): Date { const date = this.date instanceof Date ? this.date : new Date(this.date); return Number.isNaN(date.getTime()) ? new Date() : date; }
  /** Picked date as YYYY-MM-DD in local time. */
  private get dateKey(): string { const date = this.validDate; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private get monthKey(): string { return this.dateKey.slice(0, 7); }
  private static initials(name: string): string { return name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || '?'; }
  private loadRegister(): void {
    const token = this.auth.token; if (!token) return;
    this.loading = true;
    this.api.register(token, this.dateKey).subscribe({
      next: data => {
        this.loading = false;
        this.liveRecords = data.students.map(student => ({ id: student.studentId, name: student.fullName || 'Unnamed student', course: student.course, batch: student.batch, group: student.group, teacher: '', photo: AttendancePageComponent.initials(student.fullName || ''), status: student.status ? TO_UI[student.status] : null, percent: student.percent }));
        if (this.batch !== 'All batches' && !this.batchOptions.includes(this.batch)) this.batch = 'All batches';
      },
      error: (error: Error) => { this.loading = false; this.liveRecords = []; this.toast.error(error.message); }
    });
  }
  private loadSummary(): void {
    const token = this.auth.token; if (!token) return;
    const month = this.monthKey; this.loadedMonth = month;
    this.api.summary(token, month).subscribe({ next: data => { if (data.month === this.loadedMonth) this.summary = data; }, error: (error: Error) => this.toast.error(error.message) });
  }
  private loadMonthly(): void {
    const token = this.auth.token; if (!token) return;
    this.api.monthly(token, this.monthKey).subscribe({
      next: data => { this.monthDayCount = data.days; this.monthRecords = data.students.map(student => ({ id: student.studentId, name: student.fullName || 'Unnamed student', course: student.course, batch: student.batch, group: student.group, teacher: '', photo: AttendancePageComponent.initials(student.fullName || ''), status: null, percent: student.percent, days: student.days })); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
}

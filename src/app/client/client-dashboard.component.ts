import { Component, OnInit } from '@angular/core';
import { OwnerDashboard, ReportApiService, TeacherDashboard } from '../core/report-api.service';
import { SyllabusApiService } from '../core/syllabus-api.service';
import { ToastService } from '../core/toast.service';
import { TenantContextService } from '../core/tenant-context.service';
import { MockAuthService } from '../core/mock-auth.service';
interface DashLink { label: string; hint: string; icon: string; link: string; tone: string; }
interface DashItem { time: string; title: string; detail: string; status: string; tone: 'success'|'warning'|'danger'|'neutral'|'info'; }
@Component({ selector: 'app-client-dashboard', templateUrl: './client-dashboard.component.html', styleUrls: ['./client-dashboard.component.scss', './dashboard-typography.component.scss', './teacher-dashboard.component.scss'] })
export class ClientDashboardComponent implements OnInit {
  /** Real figures for a signed-in owner / teacher; demo sessions keep the sample content below. */
  dash?: OwnerDashboard;
  teacherDash?: TeacherDashboard;
  /** Owner: syllabus summary (average done, subjects behind target) from the Syllabus page. */
  syllabus?: { average: number; behind: string[]; behindCount: number; subjects: number };
  constructor(private tenant: TenantContextService, private auth: MockAuthService, private reports: ReportApiService, private toast: ToastService, private syllabusApi: SyllabusApiService) {}
  ngOnInit(): void {
    if (!this.auth.token) return;
    this.reports.dashboard(this.auth.token).subscribe({
      next: data => { if (data.role === 'teacher') this.teacherDash = data; else this.dash = data; },
      error: (error: Error) => this.toast.error(`Dashboard: ${error.message}`)
    });
    if (this.auth.role === 'Owner') this.syllabusApi.overview(this.auth.token).subscribe({
      next: groups => {
        const cells = groups.flatMap(group => group.rows.flatMap(row => row.cells.filter(cell => cell.syllabusCode).map(cell => ({ ...cell, where: `${row.label} · ${cell.subject}` }))));
        if (!cells.length) return;
        const behind = cells.filter(cell => cell.status === 'Behind');
        this.syllabus = { average: Math.round(cells.reduce((sum, cell) => sum + cell.percent, 0) / cells.length), behind: behind.slice(0, 3).map(cell => cell.where), behindCount: behind.length, subjects: cells.length };
      },
      error: () => { /* the strip is optional */ }
    });
  }
  get brand(): string { return this.tenant.current.businessName || 'your institute'; }
  get ownerName(): string { return this.dash ? (this.auth.displayName || '').split(' ')[0] || 'there' : 'Jordan'; }
  get todayLine(): string { return (this.dash ? new Date() : new Date(2026, 8, 28)).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(); }
  get todayShort(): string { return (this.dash ? new Date() : new Date(2026, 8, 28)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  private money(value: number): string { return value >= 100000 ? `₹${(value / 100000).toFixed(2).replace(/\.?0+$/, '')}L` : `₹${value.toLocaleString('en-IN')}`; }
  /** Coaching owner stat cards. */
  get stats(): { label: string; value: string; change: string; icon: string }[] {
    const d = this.dash;
    if (!d) return [
      { label: 'Total students', value: '1,284', change: '↑ 8.2% this month', icon: 'groups' }, { label: "Today's attendance", value: '92%', change: '86 of 94 present', icon: 'event_available' },
      { label: "Today's collection", value: '₹32,500', change: '↑ 14.5% vs. yesterday', icon: 'payments' }, { label: 'Pending fees', value: '₹1.24L', change: '38 students to follow up', icon: 'account_balance_wallet' },
      { label: 'New admissions', value: '18', change: 'This month', icon: 'person_add_alt' }, { label: 'New inquiries', value: '26', change: '9 need a response', icon: 'mark_email_unread' }
    ];
    return [
      { label: 'Total students', value: d.students.total.toLocaleString('en-IN'), change: `${d.students.newThisMonth} joined this month`, icon: 'groups' },
      { label: "Today's attendance", value: d.attendanceToday.marked ? `${d.attendanceToday.percent}%` : '—', change: d.attendanceToday.marked ? `${d.attendanceToday.present} of ${d.attendanceToday.marked} present` : 'Not marked yet today', icon: 'event_available' },
      { label: "Today's collection", value: this.money(d.fees.today), change: `${this.money(d.fees.month)} this month`, icon: 'payments' },
      { label: 'Pending fees', value: this.money(d.fees.pending), change: `${d.fees.pendingStudents} student${d.fees.pendingStudents === 1 ? '' : 's'} to follow up`, icon: 'account_balance_wallet' },
      { label: 'New admissions', value: String(d.students.newThisMonth), change: 'This month', icon: 'person_add_alt' },
      { label: 'New enquiries', value: String(d.enquiries.new), change: `${d.enquiries.followUpsDue} follow-up${d.enquiries.followUpsDue === 1 ? '' : 's'} due`, icon: 'mark_email_unread' }
    ];
  }
  /** School owner stat tiles. */
  get schoolStats(): { students: string; studentsNote: string; classes: string; classesNote: string; attendance: string; attendanceNote: string; fees: string; feesNote: string } {
    const d = this.dash;
    if (!d) return { students: '1,486', studentsNote: '↑ 4.2% vs. last session', classes: '15', classesNote: 'Nursery – Class 12 · 46 sections', attendance: '95.1%', attendanceNote: '1,413 present today', fees: '₹62.4L', feesNote: 'Term 1 · 91% collected' };
    return {
      students: d.students.total.toLocaleString('en-IN'), studentsNote: `${d.students.newThisMonth} joined this month`,
      classes: String(d.classes.courses), classesNote: `${d.classes.batches} section${d.classes.batches === 1 ? '' : 's'}`,
      attendance: d.attendanceToday.marked ? `${d.attendanceToday.percent}%` : '—', attendanceNote: d.attendanceToday.marked ? `${d.attendanceToday.present} present today` : 'Not marked yet today',
      fees: this.money(d.fees.month), feesNote: `This month · ${this.money(d.fees.pending)} pending`
    };
  }
  get liveSummary(): string { const d = this.dash; return d ? `${d.classes.batches} ${d.workType === 'school' ? 'sections' : 'batches'} active <b>·</b> ${d.enquiries.new} new enquir${d.enquiries.new === 1 ? 'y' : 'ies'}` : this.isSchool ? 'School is in session <b>·</b> 46 sections in class' : '6 classes running today <b>·</b> 3 new inquiries'; }
  /** Weekly attendance lines (chart is 680 × 180; 0% at the bottom). */
  private path(values: number[]): string {
    const step = 680 / Math.max(1, values.length - 1);
    return values.map((value, index) => `${index ? 'L' : 'M'}${Math.round(index * step)} ${Math.round(180 - value * 1.8)}`).join(' ');
  }
  get presentPath(): string { return this.dash ? this.path(this.dash.attendanceWeek.map(day => day.present)) : 'M0 53 C55 70 70 46 113 62 S185 43 226 51 S296 77 340 49 S407 37 453 57 S520 29 566 39 S632 27 680 34'; }
  get absentPath(): string { return this.dash ? this.path(this.dash.attendanceWeek.map(day => day.absent)) : 'M0 89 C50 83 76 102 113 86 S188 107 226 78 S296 98 340 84 S409 97 453 77 S522 91 566 72 S630 81 680 66'; }
  get weekDays(): string[] { return this.dash ? this.dash.attendanceWeek.map(day => day.day) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; }
  get feeBars(): { day: string; paid: number; pending: number }[] {
    if (!this.dash) return [{ day: '1–5', paid: 55, pending: 27 }, { day: '6–10', paid: 78, pending: 18 }, { day: '11–15', paid: 61, pending: 34 }, { day: '16–20', paid: 90, pending: 17 }, { day: '21–25', paid: 67, pending: 28 }, { day: '26–30', paid: 43, pending: 39 }];
    return this.dash.feeBuckets.map(bucket => ({ day: bucket.day, paid: bucket.height, pending: 0 }));
  }
  get monthCollected(): string { return this.dash ? `₹${this.dash.fees.month.toLocaleString('en-IN')}` : '₹4,82,450'; }
  get collectionBadge(): string { return this.dash ? `${this.dash.fees.monthRate}% collected` : '+12.8%'; }
  get monthLabel(): string { return (this.dash ? new Date() : new Date(2026, 8, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); }
  get posts(): { title: string; detail: string; tone: string; icon: string }[] {
    if (!this.dash) return [{ title: 'New batch admissions open', detail: 'Published Sep 26 · 124 views', tone: 'cover-teal', icon: 'campaign' }, { title: 'Parent orientation this Friday', detail: 'Published Sep 24 · 89 views', tone: 'cover-amber', icon: 'event' }];
    return this.dash.recentPosts.map((post, index) => ({ title: post.title, detail: `Published ${post.date}`, tone: index ? 'cover-amber' : 'cover-teal', icon: post.type === 'announcement' ? 'campaign' : 'event' }));
  }
  get isSchool(): boolean { return this.tenant.current.businessType === 'school'; }
  get isTeacher(): boolean { return this.auth.role === 'Teacher'; }
  /** Teacher "My Dashboard": greeting, quick links and today's work differ between a coaching centre and a school. */
  get teacherGreeting(): string { return this.teacherDash ? this.teacherDash.name.split(' ')[0] : this.isSchool ? 'Mrs. Iyer' : 'Priya'; }
  get teacherLinks(): DashLink[] { return this.isSchool ? this.schoolTeacherLinks : this.coachingTeacherLinks; }
  get teacherToday(): DashItem[] { return this.teacherDash ? this.teacherDash.today : this.isSchool ? this.schoolTimetable : this.coachingClasses; }
  get teacherGroups(): DashItem[] { return this.teacherDash ? this.teacherDash.groups : this.isSchool ? this.schoolMyClasses : this.coachingMyBatches; }
  get teacherWork(): DashItem[] { return this.teacherDash ? this.teacherDash.work : this.isSchool ? this.schoolHomework : this.coachingAssignments; }
  /** Live teacher dashboards list tests waiting for marks instead of the sample homework / assignments. */
  get workLabel(): string { return this.teacherDash ? 'MARKS TO ENTER' : this.isSchool ? 'HOMEWORK DUE' : 'PENDING ASSIGNMENTS'; }
  get workTitle(): string { return this.teacherDash ? (this.isSchool ? 'Exams waiting for marks' : 'Tests waiting for marks') : this.isSchool ? 'Homework to review' : 'Assignments to check'; }
  get workRoute(): string { return this.teacherDash ? (this.isSchool ? '/client/marks' : '/client/tests') : this.isSchool ? '/client/homework' : '/client/assignments'; }
  get workUnit(): string { return this.teacherDash ? 'left' : this.isSchool ? 'submitted' : 'to check'; }
  private readonly coachingTeacherLinks: DashLink[] = [
    { label: 'Today', hint: 'Your classes for the day', icon: 'today', link: '/client/today', tone: '' },
    { label: 'My batches', hint: 'Students in your batches', icon: 'groups', link: '/client/my-batches', tone: 'shortcut-violet' },
    { label: 'Mark attendance', hint: 'Take today’s batch register', icon: 'event_available', link: '/client/attendance', tone: 'shortcut-amber' },
    { label: 'Assignments', hint: 'Set and check assignments', icon: 'assignment', link: '/client/assignments', tone: 'shortcut-blue' },
    { label: 'Tests', hint: 'Schedule tests and enter marks', icon: 'quiz', link: '/client/tests', tone: 'shortcut-violet' }
  ];
  private readonly schoolTeacherLinks: DashLink[] = [
    { label: 'Today', hint: 'Your periods for the day', icon: 'today', link: '/client/today', tone: '' },
    { label: 'My classes', hint: 'Classes and sections you teach', icon: 'class', link: '/client/my-classes', tone: 'shortcut-violet' },
    { label: 'Homework', hint: 'Set and review homework', icon: 'menu_book', link: '/client/homework', tone: 'shortcut-amber' },
    { label: 'Marks', hint: 'Enter unit test and term marks', icon: 'grading', link: '/client/marks', tone: 'shortcut-blue' },
    { label: 'Exams', hint: 'Term 1, Term 2 and unit tests', icon: 'quiz', link: '/client/exams', tone: 'shortcut-violet' }
  ];
  private readonly coachingClasses: DashItem[] = [
    { time: '07:00', title: 'Physics · Morning', detail: 'Class 12 Science · Room 204', status: 'In progress', tone: 'success' },
    { time: '09:00', title: 'Mathematics · Morning', detail: 'Class 12 Science · Room 206', status: 'Up next', tone: 'info' },
    { time: '16:00', title: 'Physics doubt session', detail: 'Class 11 Science · Room 204', status: 'Later', tone: 'neutral' }
  ];
  private readonly coachingMyBatches: DashItem[] = [
    { time: '36', title: 'Physics · Morning', detail: 'Class 12 Science · Mon, Wed, Fri', status: 'Active', tone: 'success' },
    { time: '30', title: 'Mathematics · Morning', detail: 'Class 12 Science · Tue, Thu, Sat', status: 'Active', tone: 'success' },
    { time: '28', title: 'Physics · Weekend', detail: 'Class 11 Science · Saturday', status: 'Active', tone: 'success' }
  ];
  private readonly coachingAssignments: DashItem[] = [
    { time: '12', title: 'Laws of motion · Worksheet 4', detail: 'Physics · Morning · 12 of 36 to check', status: 'Due today', tone: 'warning' },
    { time: '8', title: 'Integration practice set', detail: 'Mathematics · Morning · 8 of 30 to check', status: 'Due tomorrow', tone: 'info' }
  ];
  private readonly schoolTimetable: DashItem[] = [
    { time: '08:00', title: 'Period 1 · Physics', detail: 'Class 12 · Section C · Room 12C (class teacher)', status: 'In progress', tone: 'success' },
    { time: '09:30', title: 'Period 3 · Mathematics', detail: 'Class 11 · Section A · Room 11A', status: 'Up next', tone: 'info' },
    { time: '11:15', title: 'Period 5 · Physics practical', detail: 'Class 11 · Section A · Physics lab', status: 'Later', tone: 'neutral' },
    { time: '13:30', title: 'Period 7 · Mathematics', detail: 'Class 12 · Section A · Room 12A', status: 'Later', tone: 'neutral' }
  ];
  private readonly schoolMyClasses: DashItem[] = [
    { time: '38', title: 'Class 12 · Section C', detail: 'Class teacher · Physics', status: 'Class teacher', tone: 'success' },
    { time: '40', title: 'Class 12 · Section A', detail: 'Mathematics', status: 'Subject', tone: 'info' },
    { time: '42', title: 'Class 11 · Section A', detail: 'Physics, Mathematics', status: 'Subject', tone: 'info' }
  ];
  private readonly schoolHomework: DashItem[] = [
    { time: '15', title: 'Electrostatics · NCERT Ex. 1.1–1.10', detail: 'Class 12 · Section C · Physics · 15 of 38 submitted', status: 'Due tomorrow', tone: 'warning' },
    { time: '26', title: 'Sets · Worksheet 2', detail: 'Class 11 · Section A · Mathematics · 26 of 42 submitted', status: 'Due 16 Oct', tone: 'info' }
  ];
  get schoolStages() { return this.dash ? this.dash.schoolStages : this.demoStages; }
  get schoolExams() { return this.dash ? this.dash.upcomingTests.map((exam, index) => ({ date: exam.date, title: exam.title, detail: exam.detail, status: exam.status, state: index ? 'later' : 'next', marker: ['aqua', 'violet', 'orange', 'blue'][index % 4] })) : this.demoExams; }
  get schoolEvents() { return this.dash ? this.dash.notices.map((notice, index) => ({ day: notice.day, month: notice.month, title: notice.title, detail: notice.detail, tone: index ? 'event-date' : '' })) : this.demoEvents; }
  get admissions() { return this.dash ? this.dash.recentAdmissions : this.demoAdmissions; }
  get pending() { return this.dash ? this.dash.pendingFees.map(item => ({ name: item.name, detail: item.detail, amount: `₹${item.amount.toLocaleString('en-IN')}` })) : this.demoPending; }
  get attendance() { return this.dash ? this.dash.attendanceByGroup.map((item, index) => ({ ...item, tone: ['teal', 'violet', 'amber'][index % 3] })) : this.demoAttendance; }
  private readonly demoStages = [
    { name: 'Pre-primary', detail: 'Nursery – UKG · 186 students · 6 sections', icon: 'child_care', tone: 'dept-aqua' },
    { name: 'Primary', detail: 'Class 1 – 5 · 512 students · 15 sections', icon: 'menu_book', tone: 'dept-violet' },
    { name: 'Middle school', detail: 'Class 6 – 8 · 342 students · 12 sections', icon: 'science', tone: 'dept-orange' },
    { name: 'Secondary & senior secondary', detail: 'Class 9 – 12 · 446 students · 13 sections', icon: 'school', tone: 'dept-blue' }
  ];
  private readonly demoExams = [
    { date: '12 Oct', title: 'Term 1 examinations begin', detail: 'Classes 1 – 12 · Date sheet published', status: 'Upcoming', state: 'next', marker: 'aqua' },
    { date: '14 Oct', title: 'Unit Test 2 · Pre-primary assessment', detail: 'Nursery – UKG · Activity-based', status: 'Upcoming', state: 'later', marker: 'violet' },
    { date: '28 Oct', title: 'Term 1 results & report cards', detail: 'All classes · Shared at PTM', status: 'Planned', state: 'later', marker: 'orange' },
    { date: '02 Dec', title: 'Pre-board 1 · Class 10 & 12', detail: 'CBSE board classes', status: 'Planned', state: 'later', marker: 'blue' }
  ];
  private readonly demoEvents = [
    { day: '02', month: 'OCT', title: 'Gandhi Jayanti · School closed', detail: 'Holiday · Classes resume 3 October', tone: '' },
    { day: '10', month: 'OCT', title: 'Parent-teacher meeting', detail: 'Event · 9:00 am – 1:00 pm', tone: 'event-date' },
    { day: '24', month: 'OCT', title: 'Annual sports day', detail: 'Event · Classes 3 – 12', tone: 'event-date' }
  ];
  private readonly demoAdmissions = [{ name: 'Aarav Sharma', course: 'Class 12 Science', time: '10:42 am', initials: 'AS' }, { name: 'Meera Kapoor', course: 'Class 11 Science', time: '9:18 am', initials: 'MK' }, { name: 'Diya Iyer', course: 'Class 10 Foundation', time: 'Yesterday', initials: 'DI' }];
  private readonly demoPending = [{ name: 'Rohan Verma', detail: 'September fee · NS-2403', amount: '₹4,500' }, { name: 'Kabir Singh', detail: 'September fee · NS-2405', amount: '₹3,500' }, { name: 'Meera Kapoor', detail: 'September fee · NS-2402', amount: '₹4,000' }];
  private readonly demoAttendance = [{ name: 'Class 12 · Physics', present: 34, total: 36, tone: 'teal' }, { name: 'Class 11 · Chemistry', present: 28, total: 32, tone: 'violet' }, { name: 'Class 10 · Foundation', present: 24, total: 25, tone: 'amber' }];
}

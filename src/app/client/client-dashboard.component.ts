import { Component } from '@angular/core';
import { TenantContextService } from '../core/tenant-context.service';
import { MockAuthService } from '../core/mock-auth.service';
interface DashLink { label: string; hint: string; icon: string; link: string; tone: string; }
interface DashItem { time: string; title: string; detail: string; status: string; tone: 'success'|'warning'|'danger'|'neutral'|'info'; }
@Component({ selector: 'app-client-dashboard', templateUrl: './client-dashboard.component.html', styleUrls: ['./client-dashboard.component.scss', './dashboard-typography.component.scss', './teacher-dashboard.component.scss'] })
export class ClientDashboardComponent {
  constructor(private tenant: TenantContextService, private auth: MockAuthService) {}
  get isSchool(): boolean { return this.tenant.current.businessType === 'school'; }
  get isTeacher(): boolean { return this.auth.role === 'Teacher'; }
  /** Teacher "My Dashboard": greeting, quick links and today's work differ between a coaching centre and a school. */
  get teacherGreeting(): string { return this.isSchool ? 'Mrs. Iyer' : 'Priya'; }
  get teacherLinks(): DashLink[] { return this.isSchool ? this.schoolTeacherLinks : this.coachingTeacherLinks; }
  get teacherToday(): DashItem[] { return this.isSchool ? this.schoolTimetable : this.coachingClasses; }
  get teacherGroups(): DashItem[] { return this.isSchool ? this.schoolMyClasses : this.coachingMyBatches; }
  get teacherWork(): DashItem[] { return this.isSchool ? this.schoolHomework : this.coachingAssignments; }
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
  readonly schoolStages = [
    { name: 'Pre-primary', detail: 'Nursery – UKG · 186 students · 6 sections', icon: 'child_care', tone: 'dept-aqua' },
    { name: 'Primary', detail: 'Class 1 – 5 · 512 students · 15 sections', icon: 'menu_book', tone: 'dept-violet' },
    { name: 'Middle school', detail: 'Class 6 – 8 · 342 students · 12 sections', icon: 'science', tone: 'dept-orange' },
    { name: 'Secondary & senior secondary', detail: 'Class 9 – 12 · 446 students · 13 sections', icon: 'school', tone: 'dept-blue' }
  ];
  readonly schoolExams = [
    { date: '12 Oct', title: 'Term 1 examinations begin', detail: 'Classes 1 – 12 · Date sheet published', status: 'Upcoming', state: 'next', marker: 'aqua' },
    { date: '14 Oct', title: 'Unit Test 2 · Pre-primary assessment', detail: 'Nursery – UKG · Activity-based', status: 'Upcoming', state: 'later', marker: 'violet' },
    { date: '28 Oct', title: 'Term 1 results & report cards', detail: 'All classes · Shared at PTM', status: 'Planned', state: 'later', marker: 'orange' },
    { date: '02 Dec', title: 'Pre-board 1 · Class 10 & 12', detail: 'CBSE board classes', status: 'Planned', state: 'later', marker: 'blue' }
  ];
  readonly schoolEvents = [
    { day: '02', month: 'OCT', title: 'Gandhi Jayanti · School closed', detail: 'Holiday · Classes resume 3 October', tone: '' },
    { day: '10', month: 'OCT', title: 'Parent-teacher meeting', detail: 'Event · 9:00 am – 1:00 pm', tone: 'event-date' },
    { day: '24', month: 'OCT', title: 'Annual sports day', detail: 'Event · Classes 3 – 12', tone: 'event-date' }
  ];
  readonly admissions = [{ name: 'Aarav Sharma', course: 'Class 12 Science', time: '10:42 am', initials: 'AS' }, { name: 'Meera Kapoor', course: 'Class 11 Science', time: '9:18 am', initials: 'MK' }, { name: 'Diya Iyer', course: 'Class 10 Foundation', time: 'Yesterday', initials: 'DI' }];
  readonly pending = [{ name: 'Rohan Verma', detail: 'September fee · NS-2403', amount: '₹4,500' }, { name: 'Kabir Singh', detail: 'September fee · NS-2405', amount: '₹3,500' }, { name: 'Meera Kapoor', detail: 'September fee · NS-2402', amount: '₹4,000' }];
  readonly attendance = [{ name: 'Class 12 · Physics', present: 34, total: 36, tone: 'teal' }, { name: 'Class 11 · Chemistry', present: 28, total: 32, tone: 'violet' }, { name: 'Class 10 · Foundation', present: 24, total: 25, tone: 'amber' }];
}

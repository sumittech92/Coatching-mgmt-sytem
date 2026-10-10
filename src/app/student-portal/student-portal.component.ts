import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MockAuthService } from '../core/mock-auth.service';
import { TenantContextService } from '../core/tenant-context.service';
interface PortalMenu { key: string; label: string; icon: string; }
@Component({ selector: 'app-student-portal', templateUrl: './student-portal.component.html', styleUrls: ['./student-portal.component.scss'] })
export class StudentPortalComponent {
  section = 'dashboard'; menuOpen = false;
  private readonly studentMenu: PortalMenu[] = [{ key: 'dashboard', label: 'My dashboard', icon: 'space_dashboard' }, { key: 'profile', label: 'My profile', icon: 'person_outline' }, { key: 'attendance', label: 'My attendance', icon: 'event_available' }, { key: 'fees', label: 'Fees & receipts', icon: 'payments' }, { key: 'results', label: 'My results', icon: 'emoji_events' }, { key: 'materials', label: 'Study materials', icon: 'folder_open' }, { key: 'notices', label: 'Notices', icon: 'campaign' }, { key: 'updates', label: 'Campus updates', icon: 'article' }];
  private readonly parentMenu: PortalMenu[] = [{ key: 'dashboard', label: 'Child overview', icon: 'space_dashboard' }, { key: 'profile', label: 'Child profile', icon: 'person_outline' }, { key: 'family', label: 'Family contacts', icon: 'family_restroom' }, { key: 'attendance', label: 'Attendance summary', icon: 'event_available' }, { key: 'fees', label: 'Payments & receipts', icon: 'payments' }, { key: 'results', label: 'Academic progress', icon: 'emoji_events' }, { key: 'notices', label: 'Institute notices', icon: 'campaign' }, { key: 'updates', label: 'Institute updates', icon: 'article' }];
  private readonly coachingFees = [{ month: 'September 2026', amount: 4000, paid: 2000, due: 2000, status: 'Partial', date: '—', mode: '—' }, { month: 'August 2026', amount: 4000, paid: 4000, due: 0, status: 'Paid', date: '08 Aug 2026', mode: 'UPI' }, { month: 'July 2026', amount: 4000, paid: 4000, due: 0, status: 'Paid', date: '05 Jul 2026', mode: 'Cash' }];
  private readonly collegeFees = [{ month: 'Academic year 2026–27', amount: 42000, paid: 28000, due: 14000, status: 'Partial', date: '—', mode: '—' }, { month: 'Academic year 2025–26', amount: 40000, paid: 40000, due: 0, status: 'Paid', date: '12 Aug 2025', mode: 'UPI' }];
  private readonly coachingResults = [{ exam: 'Unit Test 3', date: '18 Sep 2026', subject: 'Physics', marks: '88 / 100', percentage: '88%', grade: 'A' }, { exam: 'Unit Test 2', date: '20 Aug 2026', subject: 'Chemistry', marks: '91 / 100', percentage: '91%', grade: 'A+' }, { exam: 'Mid-term', date: '12 Jul 2026', subject: 'Mathematics', marks: '84 / 100', percentage: '84%', grade: 'A' }];
  private readonly collegeResults = [{ exam: 'Internal Assessment 2', date: '18 Sep 2026', subject: 'Data Structures', marks: '88 / 100', percentage: '88%', grade: 'A' }, { exam: 'Internal Assessment 1', date: '20 Aug 2026', subject: 'Database Systems', marks: '91 / 100', percentage: '91%', grade: 'A+' }, { exam: 'Lab evaluation', date: '12 Jul 2026', subject: 'Programming', marks: '84 / 100', percentage: '84%', grade: 'A' }];
  private readonly coachingMaterials = [{ title: 'Motion and laws of motion', subject: 'Physics · Chapter 4', type: 'PDF', file: 'motion-chapter-4.pdf', date: '26 Sep 2026' }, { title: 'Organic chemistry practice set', subject: 'Chemistry · Assignment', type: 'Assignment', file: 'organic-practice.pdf', date: '24 Sep 2026' }, { title: 'Calculus lesson recording', subject: 'Mathematics · Video', file: 'calculus-lesson.mp4', type: 'Video', date: '21 Sep 2026' }];
  private readonly collegeMaterials = [{ title: 'Data structures · Lecture notes', subject: 'Computer Science · Unit 3', type: 'PDF', file: 'data-structures-notes.pdf', date: '26 Sep 2026' }, { title: 'Database systems worksheet', subject: 'Computer Science · Assignment', type: 'Assignment', file: 'database-systems.pdf', date: '24 Sep 2026' }, { title: 'Programming lab session', subject: 'Computer Science · Recording', type: 'Video', file: 'programming-lab.mp4', date: '21 Sep 2026' }];
  private readonly coachingNotices = [{ type: 'Exam', title: 'Mid-term examinations begin October 12', body: 'Please review the timetable shared by your teacher.', date: '25 Sep 2026', tone: 'amber' }, { type: 'Holiday', title: 'Institute closed for Gandhi Jayanti', body: 'All classes resume on Saturday, October 3.', date: '22 Sep 2026', tone: 'blue' }, { type: 'Fee reminder', title: 'September fee balance due October 5', body: 'Please contact the office if you need any assistance.', date: '20 Sep 2026', tone: 'rose' }];
  private readonly collegeNotices = [{ type: 'Exam', title: 'Mid-term assessment schedule published', body: 'Check the student portal for rooms and subject timings.', date: '25 Sep 2026', tone: 'amber' }, { type: 'Event', title: 'Annual cultural festival registrations', body: 'Registration closes on October 4. Contact the student office.', date: '22 Sep 2026', tone: 'blue' }, { type: 'Fee reminder', title: 'Tuition installment due October 5', body: 'View your statement in Fees & receipts.', date: '20 Sep 2026', tone: 'rose' }];
  private readonly coachingUpdates = [{ title: 'New batch admissions are open', body: 'Our new academic batches are now enrolling.', date: '26 Sep 2026', type: 'Announcement' }, { title: 'Celebrating our students', body: 'A proud moment for learners across the academy.', date: '24 Sep 2026', type: 'Community' }];
  private readonly collegeUpdates = [{ title: 'Innovation showcase this Friday', body: 'Student project displays open in the main hall.', date: '26 Sep 2026', type: 'Campus event' }, { title: 'Celebrating our student community', body: 'Congratulations to everyone who took part in the inter-college debate.', date: '24 Sep 2026', type: 'Community' }];
  get fees() { return this.isCollege ? this.collegeFees : this.coachingFees; }
  get results() { return this.isCollege ? this.collegeResults : this.coachingResults; }
  get materials() { return this.isCollege ? this.collegeMaterials : this.coachingMaterials; }
  get notices() { return this.isCollege ? this.collegeNotices : this.coachingNotices; }
  get updates() { return this.isCollege ? this.collegeUpdates : this.coachingUpdates; }
  readonly calendar = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, status: [3, 10, 17, 22].includes(i + 1) ? 'absent' : [6].includes(i + 1) ? 'leave' : [8, 19].includes(i + 1) ? 'late' : i < 28 ? 'present' : 'future' }));
  constructor(private router: Router, public auth: MockAuthService, private tenant: TenantContextService) { this.update(router.url); router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => { this.update(event.urlAfterRedirects); this.menuOpen = false; }); }
  get menu(): PortalMenu[] { return this.isParent ? this.parentMenu : this.studentMenu; }
  get isParent(): boolean { return this.auth.role === 'Parent'; }
  get isCollege(): boolean { return this.tenant.current.businessType === 'college'; }
  get displayName(): string { return this.isParent ? (this.isCollege ? 'Meera Rao' : 'Neha Sharma') : (this.isCollege ? 'Ishita Rao' : 'Aarav Sharma'); }
  get childName(): string { return this.isCollege ? 'Ishita Rao' : 'Aarav Sharma'; }
  get firstName(): string { return (this.isParent ? (this.isCollege ? 'Meera Rao' : 'Neha Sharma') : this.displayName).split(' ')[0]; }
  get childFirstName(): string { return this.childName.split(' ')[0]; }
  get studentId(): string { return this.isCollege ? 'GC-2601' : 'NS-2401'; }
  get academicPlacement(): string { return this.isCollege ? 'B.Sc Computer Science' : 'Class 12 Science'; }
  get groupPlacement(): string { return this.isCollege ? 'Year 2 · Section A' : 'Physics · Morning batch'; }
  get childDateOfBirth(): string { return this.isCollege ? '12 May 2006' : '14 February 2009'; }
  get childGender(): string { return this.isCollege ? 'Female' : 'Male'; }
  get childPhone(): string { return this.isCollege ? '+91 98765 20001' : '+91 98765 10001'; }
  get childEmail(): string { return this.isCollege ? 'ishita.r@email.com' : 'aarav.s@email.com'; }
  get otherGuardian(): string { return this.isCollege ? 'Arun Rao' : 'Vikram Sharma'; }
  get latestAssessment(): string { return this.isCollege ? 'Internal Assessment 2' : 'Unit Test 3'; }
  get latestSubject(): string { return this.isCollege ? 'Data Structures' : 'Physics'; }
  get paymentDescription(): string { return this.isCollege ? 'Tuition balance · due Oct 5' : 'September balance · due Oct 5'; }
  get instituteName(): string { return this.tenant.current.businessName; }
  get attendanceRate(): number { return this.isCollege ? 94 : 96; }
  get attendanceDays(): number { return this.isCollege ? 22 : 24; }
  get paidTotal(): number { return this.isCollege ? 28000 : 10000; }
  get feeDue(): number { return this.isCollege ? 14000 : 2000; }
  get sectionLabel(): string { return this.menu.find(item => item.key === this.section)?.label || 'Overview'; }
  private update(url: string): void { const part = url.split('?')[0].split('/').filter(Boolean)[1]; this.section = part || 'dashboard'; }
  go(key: string): void { this.router.navigate(['/student', key === 'dashboard' ? 'dashboard' : key]); }
  download(file: string): void { const blob = new Blob([`Ageon student portal demo file: ${file}`], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.endsWith('.mp4') ? 'lesson-recording.txt' : file; a.click(); URL.revokeObjectURL(a.href); }
  printReceipt(month: string, amount: number): void { window.print(); }
}

import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MockAuthService } from '../core/mock-auth.service';
import { TenantContextService } from '../core/tenant-context.service';
import { ToastService } from '../core/toast.service';
import { SignOutService } from '../core/sign-out.service';
import { FeeSubmission, FeeSubmissionService } from '../core/fee-submission.service';
import { WebsiteContentService } from '../core/website-content.service';
import { FINE_PER_DAY, LOAN_DAYS, LibraryBook, LibraryService } from '../core/library.service';
interface PortalFee { month: string; amount: number; paid: number; due: number; status: string; date: string; mode: string; }
interface PortalMenu { key: string; label: string; icon: string; }
@Component({ selector: 'app-student-portal', templateUrl: './student-portal.component.html', styleUrls: ['./student-portal.component.scss'] })
export class StudentPortalComponent {
  section = 'dashboard'; menuOpen = false;
  private readonly coachingStudentMenu: PortalMenu[] = [{ key: 'dashboard', label: 'My Dashboard', icon: 'space_dashboard' }, { key: 'batch', label: 'My Batch', icon: 'groups' }, { key: 'attendance', label: 'Attendance', icon: 'event_available' }, { key: 'assignments', label: 'Assignments', icon: 'assignment' }, { key: 'tests', label: 'Tests', icon: 'quiz' }, { key: 'results', label: 'Results', icon: 'emoji_events' }, { key: 'materials', label: 'Study Material', icon: 'folder_open' }, { key: 'library', label: 'Library', icon: 'local_library' }, { key: 'notices', label: 'Notices', icon: 'campaign' }, { key: 'fees', label: 'Fees', icon: 'payments' }, { key: 'profile', label: 'Profile', icon: 'person_outline' }];
  private readonly schoolStudentMenu: PortalMenu[] = [{ key: 'dashboard', label: 'My Dashboard', icon: 'space_dashboard' }, { key: 'class', label: 'My Class', icon: 'meeting_room' }, { key: 'subjects', label: 'My Subjects', icon: 'menu_book' }, { key: 'timetable', label: 'Timetable', icon: 'schedule' }, { key: 'attendance', label: 'Attendance', icon: 'event_available' }, { key: 'homework', label: 'Homework', icon: 'edit_note' }, { key: 'assignments', label: 'Assignments', icon: 'assignment' }, { key: 'exams', label: 'Exams', icon: 'quiz' }, { key: 'results', label: 'Results', icon: 'emoji_events' }, { key: 'materials', label: 'Study Material', icon: 'folder_open' }, { key: 'library', label: 'Library', icon: 'local_library' }, { key: 'notices', label: 'Notices', icon: 'campaign' }, { key: 'fees', label: 'Fees', icon: 'payments' }, { key: 'profile', label: 'Profile', icon: 'person_outline' }];
  /** Built once per workspace type: a getter returning new objects re-creates every routerLinkActive on each check and locks the page. */
  private readonly coachingParentMenu = StudentPortalComponent.parentMenuFor('Institute');
  private readonly schoolParentMenu = StudentPortalComponent.parentMenuFor('School');
  private static parentMenuFor(place: string): PortalMenu[] { return [{ key: 'dashboard', label: 'Child overview', icon: 'space_dashboard' }, { key: 'profile', label: 'Child profile', icon: 'person_outline' }, { key: 'family', label: 'Family contacts', icon: 'family_restroom' }, { key: 'attendance', label: 'Attendance summary', icon: 'event_available' }, { key: 'fees', label: 'Payments & receipts', icon: 'payments' }, { key: 'results', label: 'Academic progress', icon: 'emoji_events' }, { key: 'notices', label: `${place} notices`, icon: 'campaign' }, { key: 'updates', label: `${place} updates`, icon: 'article' }]; }
  private readonly coachingFees: PortalFee[] = [{ month: 'September 2026', amount: 4000, paid: 2000, due: 2000, status: 'Partial', date: '02 Sep 2026', mode: 'UPI' }, { month: 'August 2026', amount: 4000, paid: 4000, due: 0, status: 'Paid', date: '08 Aug 2026', mode: 'UPI' }, { month: 'July 2026', amount: 4000, paid: 4000, due: 0, status: 'Paid', date: '05 Jul 2026', mode: 'Cash' }];
  private readonly schoolFees: PortalFee[] = [{ month: 'Term 2 · 2026–27', amount: 18500, paid: 0, due: 18500, status: 'Pending', date: '—', mode: '—' }, { month: 'Term 1 · 2026–27', amount: 18500, paid: 18500, due: 0, status: 'Paid', date: '08 Apr 2026', mode: 'Bank Transfer' }, { month: 'Annual charges · 2026–27', amount: 6500, paid: 6500, due: 0, status: 'Paid', date: '04 Apr 2026', mode: 'Net banking' }];
  private readonly coachingResults = [{ exam: 'Unit Test 3', date: '18 Sep 2026', subject: 'Physics', marks: '88 / 100', percentage: '88%', grade: 'A' }, { exam: 'Unit Test 2', date: '20 Aug 2026', subject: 'Chemistry', marks: '91 / 100', percentage: '91%', grade: 'A+' }, { exam: 'Mid-term', date: '12 Jul 2026', subject: 'Mathematics', marks: '84 / 100', percentage: '84%', grade: 'A' }];
  private readonly schoolResults = [{ exam: 'Unit Test 2', date: '18 Sep 2026', subject: 'Mathematics', marks: '35 / 40', percentage: '88%', grade: 'A1' }, { exam: 'Unit Test 2', date: '16 Sep 2026', subject: 'Science', marks: '36 / 40', percentage: '90%', grade: 'A1' }, { exam: 'Unit Test 1', date: '24 Jul 2026', subject: 'English', marks: '34 / 40', percentage: '85%', grade: 'A2' }, { exam: 'Unit Test 1', date: '22 Jul 2026', subject: 'Social Science', marks: '31 / 40', percentage: '78%', grade: 'B1' }];
  private readonly coachingMaterials = [{ title: 'Motion and laws of motion', subject: 'Physics · Chapter 4', type: 'PDF', file: 'motion-chapter-4.pdf', date: '26 Sep 2026' }, { title: 'Organic chemistry practice set', subject: 'Chemistry · Assignment', type: 'Assignment', file: 'organic-practice.pdf', date: '24 Sep 2026' }, { title: 'Calculus lesson recording', subject: 'Mathematics · Video', file: 'calculus-lesson.mp4', type: 'Video', date: '21 Sep 2026' }];
  private readonly schoolMaterials = [{ title: 'Polynomials · Chapter notes', subject: 'Mathematics · Chapter 2', type: 'PDF', file: 'class9-polynomials-notes.pdf', date: '26 Sep 2026' }, { title: 'Atoms and molecules worksheet', subject: 'Science · Worksheet', type: 'Assignment', file: 'class9-atoms-molecules-worksheet.pdf', date: '24 Sep 2026' }, { title: 'The Fun They Had · Reading', subject: 'English · Video lesson', type: 'Video', file: 'class9-english-beehive-ch1.mp4', date: '21 Sep 2026' }];
  private readonly coachingNotices = [{ type: 'Exam', title: 'Mid-term examinations begin October 12', body: 'Please review the timetable shared by your teacher.', date: '25 Sep 2026', tone: 'amber' }, { type: 'Holiday', title: 'Institute closed for Gandhi Jayanti', body: 'All classes resume on Saturday, October 3.', date: '22 Sep 2026', tone: 'blue' }, { type: 'Fee reminder', title: 'September fee balance due October 5', body: 'Please contact the office if you need any assistance.', date: '20 Sep 2026', tone: 'rose' }];
  private readonly schoolNotices = [{ type: 'Exam', title: 'Term 1 date sheet published', body: 'Term 1 exams begin October 12. Check the Exams page for the subject-wise date sheet.', date: '25 Sep 2026', tone: 'amber' }, { type: 'Event', title: 'Annual Day rehearsals from October 5', body: 'Selected students stay back till 3:00 pm. Contact your class teacher for details.', date: '22 Sep 2026', tone: 'blue' }, { type: 'Fee reminder', title: 'Term 2 fee balance due October 5', body: 'View your statement under Fees or contact the school office.', date: '20 Sep 2026', tone: 'rose' }];
  private readonly coachingUpdates = [{ title: 'New batch admissions are open', body: 'Our new academic batches are now enrolling.', date: '26 Sep 2026', type: 'Announcement' }, { title: 'Celebrating our students', body: 'A proud moment for learners across the academy.', date: '24 Sep 2026', type: 'Community' }];
  private readonly schoolUpdates = [{ title: 'Science exhibition this Friday', body: 'Class 6–10 student projects on display in the school auditorium.', date: '26 Sep 2026', type: 'School event' }, { title: 'Inter-school debate winners', body: 'Congratulations to our Class 9 team for winning the inter-school debate.', date: '24 Sep 2026', type: 'Community' }];
  /** Coaching: My Batch. */
  readonly batch = { name: 'JEE Main 2027 · Morning Batch A', course: 'Class 12 Science (PCM)', timing: '7:00 am – 9:30 am', days: 'Monday – Saturday', room: 'Room 3, First floor', classmates: 32, startDate: '06 Apr 2026', coordinator: 'Mr. Anil Kapoor', teachers: [{ name: 'Mr. Rajesh Verma', subject: 'Physics', initials: 'RV' }, { name: 'Ms. Sunita Iyer', subject: 'Chemistry', initials: 'SI' }, { name: 'Mr. Anil Kapoor', subject: 'Mathematics', initials: 'AK' }] };
  readonly batchSchedule = [{ day: 'Monday', first: 'Physics · Rotational motion', second: 'Mathematics · Integration' }, { day: 'Tuesday', first: 'Chemistry · Chemical bonding', second: 'Physics · Problem practice' }, { day: 'Wednesday', first: 'Mathematics · Differential equations', second: 'Chemistry · Organic basics' }, { day: 'Thursday', first: 'Physics · Gravitation', second: 'Mathematics · DPP discussion' }, { day: 'Friday', first: 'Chemistry · Equilibrium', second: 'Doubt clearing session' }, { day: 'Saturday', first: 'Weekly test (7:00 – 8:30 am)', second: 'Test analysis' }];
  /** School: My Class, subjects and timetable. */
  readonly schoolClass = { name: 'Class 9', section: 'Section A', rollNo: 14, classTeacher: 'Ms. Priya Nair', classTeacherSubject: 'English', room: 'Room 204, Block B', classmates: 38, monitor: 'Kabir Malhotra', session: '2026–27', timing: '7:50 am – 2:10 pm' };
  readonly subjects = [{ name: 'English', teacher: 'Ms. Priya Nair', book: 'Beehive & Moments', chapters: '6 of 11 chapters', progress: 55, icon: 'translate' }, { name: 'Hindi', teacher: 'Mrs. Kavita Joshi', book: 'Kshitij & Kritika', chapters: '5 of 10 chapters', progress: 50, icon: 'record_voice_over' }, { name: 'Mathematics', teacher: 'Mr. Suresh Menon', book: 'NCERT Mathematics', chapters: '5 of 12 chapters', progress: 42, icon: 'calculate' }, { name: 'Science', teacher: 'Dr. Anjali Gupta', book: 'NCERT Science', chapters: '6 of 12 chapters', progress: 48, icon: 'science' }, { name: 'Social Science', teacher: 'Mr. Rohit Bansal', book: 'History, Geography, Civics, Economics', chapters: '9 of 20 chapters', progress: 45, icon: 'public' }, { name: 'Computer Science', teacher: 'Ms. Farah Khan', book: 'Computer Applications', chapters: '4 of 8 units', progress: 50, icon: 'computer' }, { name: 'Sanskrit', teacher: 'Mr. Hari Prasad', book: 'Shemushi', chapters: '4 of 10 chapters', progress: 40, icon: 'auto_stories' }];
  readonly timetableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  readonly periods = [{ label: 'Period 1', time: '8:00 – 8:40' }, { label: 'Period 2', time: '8:40 – 9:20' }, { label: 'Period 3', time: '9:20 – 10:00' }, { label: 'Period 4', time: '10:00 – 10:40' }, { label: 'Lunch', time: '10:40 – 11:10' }, { label: 'Period 5', time: '11:10 – 11:50' }, { label: 'Period 6', time: '11:50 – 12:30' }, { label: 'Period 7', time: '12:30 – 1:10' }, { label: 'Period 8', time: '1:10 – 1:50' }];
  readonly timetable: Record<string, string[]> = {
    Monday: ['English', 'Mathematics', 'Science', 'Hindi', 'Lunch break', 'Social Science', 'Computer Science', 'Sanskrit', 'Physical Education'],
    Tuesday: ['Mathematics', 'English', 'Hindi', 'Science', 'Lunch break', 'Sanskrit', 'Social Science', 'Art & Craft', 'Library'],
    Wednesday: ['Science', 'Mathematics', 'English', 'Social Science', 'Lunch break', 'Hindi', 'Computer Science', 'Science Lab', 'Science Lab'],
    Thursday: ['Hindi', 'Science', 'Mathematics', 'English', 'Lunch break', 'Social Science', 'Sanskrit', 'Physical Education', 'Value Education'],
    Friday: ['Mathematics', 'Social Science', 'Science', 'English', 'Lunch break', 'Hindi', 'Computer Lab', 'Computer Lab', 'Music'],
    Saturday: ['English', 'Mathematics', 'Science', 'Social Science', 'Lunch break', 'Club activity', '—', '—', '—']
  };
  readonly homework = [{ subject: 'Mathematics', title: 'Exercise 2.3 · Q1 to Q5 (Polynomials)', given: '26 Sep 2026', due: '29 Sep 2026', status: 'Pending' }, { subject: 'Science', title: 'Draw and label the structure of an atom', given: '25 Sep 2026', due: '30 Sep 2026', status: 'Pending' }, { subject: 'English', title: 'Write a diary entry on your weekend (120 words)', given: '24 Sep 2026', due: '28 Sep 2026', status: 'Pending' }, { subject: 'Hindi', title: 'Learn the poem “Gram Shree” for recitation', given: '23 Sep 2026', due: '27 Sep 2026', status: 'Submitted' }, { subject: 'Social Science', title: 'Map work: mark major rivers of India', given: '22 Sep 2026', due: '26 Sep 2026', status: 'Submitted' }];
  private readonly coachingAssignments = [{ title: 'Rotational motion · Problem set 6', subject: 'Physics', given: '24 Sep 2026', due: '30 Sep 2026', status: 'Pending', file: '' }, { title: 'Chemical bonding worksheet', subject: 'Chemistry', given: '23 Sep 2026', due: '01 Oct 2026', status: 'Pending', file: '' }, { title: 'Integration · DPP 14', subject: 'Mathematics', given: '21 Sep 2026', due: '27 Sep 2026', status: 'Submitted', file: 'integration-dpp-14.pdf' }, { title: 'Electrostatics · Previous year JEE questions', subject: 'Physics', given: '15 Sep 2026', due: '22 Sep 2026', status: 'Submitted', file: 'electrostatics-pyq.pdf' }];
  private readonly schoolAssignments = [{ title: 'Science project · Model of an atom', subject: 'Science', given: '20 Sep 2026', due: '05 Oct 2026', status: 'Pending', file: '' }, { title: 'Essay · My favourite festival (250 words)', subject: 'English', given: '22 Sep 2026', due: '01 Oct 2026', status: 'Pending', file: '' }, { title: 'Social Science · Project on disaster management', subject: 'Social Science', given: '18 Sep 2026', due: '08 Oct 2026', status: 'Pending', file: '' }, { title: 'Polynomials worksheet', subject: 'Mathematics', given: '15 Sep 2026', due: '22 Sep 2026', status: 'Submitted', file: 'polynomials-worksheet.pdf' }];
  /** Coaching: tests. */
  readonly upcomingTests = [{ name: 'Weekly Test 15', subject: 'Physics · Rotational motion', date: 'Sat, 03 Oct 2026', time: '7:00 – 8:30 am', marks: 100, mode: 'Offline · OMR' }, { name: 'JEE Main Mock Test 5', subject: 'Full syllabus · PCM', date: 'Sun, 11 Oct 2026', time: '9:00 am – 12:00 pm', marks: 300, mode: 'Online · CBT' }, { name: 'Chapter Test', subject: 'Chemistry · Chemical bonding', date: 'Sat, 17 Oct 2026', time: '7:00 – 8:00 am', marks: 60, mode: 'Offline · Written' }];
  readonly pastTests = [{ name: 'Weekly Test 14', subject: 'Mathematics', date: '26 Sep 2026', marks: '82 / 100', rank: '6 / 32', percentage: 82 }, { name: 'Unit Test 3', subject: 'Physics', date: '18 Sep 2026', marks: '88 / 100', rank: '4 / 32', percentage: 88 }, { name: 'JEE Main Mock Test 4', subject: 'Full syllabus · PCM', date: '13 Sep 2026', marks: '196 / 300', rank: '5 / 32', percentage: 65 }, { name: 'Unit Test 2', subject: 'Chemistry', date: '20 Aug 2026', marks: '91 / 100', rank: '2 / 32', percentage: 91 }];
  /** School: exams. */
  readonly examSchedule = [{ name: 'Unit Test 1', period: '20 – 26 Jul 2026', marks: '40 marks per subject', status: 'Completed' }, { name: 'Unit Test 2', period: '14 – 19 Sep 2026', marks: '40 marks per subject', status: 'Completed' }, { name: 'Term 1 (Half-yearly)', period: '12 – 23 Oct 2026', marks: '80 + 20 internal', status: 'Upcoming' }, { name: 'Unit Test 3', period: '07 – 12 Dec 2026', marks: '40 marks per subject', status: 'Scheduled' }, { name: 'Term 2 (Annual)', period: '22 Feb – 10 Mar 2027', marks: '80 + 20 internal', status: 'Scheduled' }];
  readonly dateSheet = [{ date: 'Mon, 12 Oct 2026', subject: 'English', time: '9:00 am – 12:00 pm', syllabus: 'Beehive Ch 1–6, Moments Ch 1–4, Grammar, Writing' }, { date: 'Wed, 14 Oct 2026', subject: 'Mathematics', time: '9:00 am – 12:00 pm', syllabus: 'Number systems, Polynomials, Coordinate geometry, Linear equations, Euclid’s geometry' }, { date: 'Fri, 16 Oct 2026', subject: 'Science', time: '9:00 am – 12:00 pm', syllabus: 'Matter, Atoms & molecules, Cell, Tissues, Motion, Force' }, { date: 'Mon, 19 Oct 2026', subject: 'Social Science', time: '9:00 am – 12:00 pm', syllabus: 'French Revolution, India – size & location, Physical features, Democracy, Story of Palampur' }, { date: 'Wed, 21 Oct 2026', subject: 'Hindi', time: '9:00 am – 12:00 pm', syllabus: 'Kshitij Ch 1–5, Kritika Ch 1–2, Vyakaran' }, { date: 'Fri, 23 Oct 2026', subject: 'Sanskrit / Computer Science', time: '9:00 – 11:00 am', syllabus: 'Shemushi Ch 1–4 / Units 1–4' }];
  private pendingSubmission: { title: string; status: string; file: string } | null = null;
  private static readonly ALLOWED_FILE_TYPES = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
  private static readonly MAX_FILE_BYTES = 10 * 1024 * 1024;
  get fees(): PortalFee[] { return this.isSchool ? this.schoolFees : this.coachingFees; }
  /** Fee payment form (student or parent submits; the office verifies). */
  readonly payModes = ['UPI', 'Card', 'Net banking', 'Bank Transfer', 'Cash at office'];
  payOpen = false;
  pay = { period: '', amount: null as number | null, mode: 'UPI', reference: '', proof: '', note: '' };
  payError = '';
  private static readonly PROOF_TYPES = ['pdf', 'jpg', 'jpeg', 'png'];
  private static readonly MAX_PROOF_BYTES = 5 * 1024 * 1024;
  get workspace(): string { return this.tenant.current.businessType; }
  get submissions(): FeeSubmission[] { return this.feeSubmissions.forStudent(this.workspace, this.studentId); }
  get payablePeriods(): PortalFee[] { return this.fees.filter(fee => this.payableFor(fee) > 0); }
  pendingFor(period: string): number { return this.submissions.filter(item => item.period === period && item.status === 'Pending verification').reduce((sum, item) => sum + item.amount, 0); }
  /** Due amount not already covered by a payment waiting for verification. */
  payableFor(fee: PortalFee): number { return Math.max(0, fee.due - this.pendingFor(fee.month)); }
  get pendingTotal(): number { return this.submissions.filter(item => item.status === 'Pending verification').reduce((sum, item) => sum + item.amount, 0); }
  get selectedPayable(): number { const fee = this.fees.find(item => item.month === this.pay.period); return fee ? this.payableFor(fee) : 0; }
  /** Library (students only). */
  readonly loanDays = LOAN_DAYS;
  readonly finePerDay = FINE_PER_DAY;
  librarySearch = '';
  get myLoans() { return this.library.issues.filter(item => item.memberId === this.studentId && !item.returned); }
  get myReturned() { return this.library.issues.filter(item => item.memberId === this.studentId && item.returned); }
  get myRequests() { return this.library.requests.filter(item => item.memberId === this.studentId); }
  get catalogue(): LibraryBook[] { const q = this.librarySearch.trim().toLowerCase(); return this.library.books.filter(book => !q || `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(q)); }
  get libraryFine(): number { return this.myLoans.reduce((sum, item) => sum + this.library.fineFor(item), 0); }
  requested(book: LibraryBook): boolean { return this.myRequests.some(item => item.bookId === book.id && item.status === 'Requested'); }
  hasBook(book: LibraryBook): boolean { return this.myLoans.some(item => item.bookId === book.id); }
  get results() { return this.isSchool ? this.schoolResults : this.coachingResults; }
  get materials() { return this.isSchool ? this.schoolMaterials : this.coachingMaterials; }
  get notices() { return this.isSchool ? this.schoolNotices : this.coachingNotices; }
  get updates() { return this.isSchool ? this.schoolUpdates : this.coachingUpdates; }
  get assignments() { return this.isSchool ? this.schoolAssignments : this.coachingAssignments; }
  get pendingHomework(): number { return this.homework.filter(h => h.status === 'Pending').length; }
  get pendingAssignments(): number { return this.assignments.filter(a => a.status === 'Pending').length; }
  readonly calendar = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, status: [3, 10, 17, 22].includes(i + 1) ? 'absent' : [6].includes(i + 1) ? 'leave' : [8, 19].includes(i + 1) ? 'late' : i < 28 ? 'present' : 'future' }));
  constructor(private router: Router, public auth: MockAuthService, private tenant: TenantContextService, private toast: ToastService, private signOutFlow: SignOutService, private feeSubmissions: FeeSubmissionService, public library: LibraryService, private content: WebsiteContentService) { this.applyApprovedPayments(); this.update(router.url); router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => { this.update(event.urlAfterRedirects); this.menuOpen = false; }); }
  get menu(): PortalMenu[] { return this.isParent ? (this.isSchool ? this.schoolParentMenu : this.coachingParentMenu) : this.isSchool ? this.schoolStudentMenu : this.coachingStudentMenu; }
  /** Sections outside the current role/workspace menu show a friendly fallback instead of the wrong content. */
  get activeSection(): string { return this.menu.some(item => item.key === this.section) ? this.section : 'unavailable'; }
  get isParent(): boolean { return this.auth.role === 'Parent'; }
  get isSchool(): boolean { return this.tenant.current.businessType === 'school'; }
  get displayName(): string { if (this.auth.user?.full_Name) return this.auth.user.full_Name; return this.isParent ? (this.isSchool ? 'Meera Rao' : 'Neha Sharma') : (this.isSchool ? 'Ishita Rao' : 'Aarav Sharma'); }
  get childName(): string { return this.isSchool ? 'Ishita Rao' : 'Aarav Sharma'; }
  get firstName(): string { return (this.isParent ? (this.isSchool ? 'Meera Rao' : 'Neha Sharma') : this.displayName).split(' ')[0]; }
  get childFirstName(): string { return this.childName.split(' ')[0]; }
  get studentId(): string { return this.isSchool ? 'GPS-2601' : 'NS-2401'; }
  get academicPlacement(): string { return this.isSchool ? 'Class 9 · Section A' : 'Class 12 Science'; }
  get groupPlacement(): string { return this.isSchool ? 'Roll no. 14 · Class teacher: Ms. Priya Nair' : 'JEE Main 2027 · Morning Batch A'; }
  get childDateOfBirth(): string { return this.isSchool ? '12 May 2012' : '14 February 2009'; }
  get childGender(): string { return this.isSchool ? 'Female' : 'Male'; }
  get childPhone(): string { return this.isSchool ? '98765 20001' : '98765 10001'; }
  get childEmail(): string { return this.isSchool ? 'ishita.r@email.com' : 'aarav.s@email.com'; }
  get otherGuardian(): string { return this.isSchool ? 'Arun Rao' : 'Vikram Sharma'; }
  get latestAssessment(): string { return this.isSchool ? 'Unit Test 2' : 'Unit Test 3'; }
  get latestSubject(): string { return this.isSchool ? 'Mathematics' : 'Physics'; }
  get paymentDescription(): string { return this.isSchool ? 'Term 2 fee balance · due Oct 5' : 'September balance · due Oct 5'; }
  get officePhone(): string { return this.content.phone; }
  get officeTel(): string { return WebsiteContentService.telLink(this.content.phone); }
  get officeWhatsapp(): string { return WebsiteContentService.whatsappLink(this.content.whatsapp); }
  get instituteName(): string { return this.tenant.current.businessName; }
  get attendanceRate(): number { return this.isSchool ? 94 : 96; }
  get attendanceDays(): number { return this.isSchool ? 22 : 24; }
  get paidTotal(): number { return this.fees.reduce((sum, fee) => sum + fee.paid, 0); }
  get feeDue(): number { return this.fees.reduce((sum, fee) => sum + fee.due, 0); }
  get sectionLabel(): string { return this.menu.find(item => item.key === this.section)?.label || 'Overview'; }
  private update(url: string): void { const part = url.split('?')[0].split('/').filter(Boolean)[1]; this.section = part || 'dashboard'; }
  go(key: string): void { this.router.navigate(['/student', key === 'dashboard' ? 'dashboard' : key]); }
  download(file: string): void { const blob = new Blob([`EduNexa student portal demo file: ${file}`], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.endsWith('.mp4') ? 'lesson-recording.txt' : file; a.click(); URL.revokeObjectURL(a.href); this.toast.success(`Download started: ${a.download}`); }
  printReceipt(month: string, amount: number): void { this.toast.info(`Opening receipt for ${month} · ₹${amount.toLocaleString('en-IN')}.`); setTimeout(() => window.print(), 300); }
  markHomeworkDone(item: { title: string; status: string }): void { if (item.status === 'Submitted') { this.toast.info('This homework is already marked as done.'); return; } item.status = 'Submitted'; this.toast.success(`Marked as done: ${item.title}`); }
  startSubmission(item: { title: string; status: string; file: string }, picker: HTMLInputElement): void { this.pendingSubmission = item; picker.value = ''; picker.click(); }
  onSubmissionFile(event: Event): void {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; const item = this.pendingSubmission; input.value = '';
    if (!file || !item) { this.toast.info('No file selected. Your assignment was not submitted.'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!StudentPortalComponent.ALLOWED_FILE_TYPES.includes(ext)) { this.toast.error('Unsupported file type. Upload a PDF, DOC, DOCX, JPG or PNG file.'); return; }
    if (file.size > StudentPortalComponent.MAX_FILE_BYTES) { this.toast.error(`File is too large (${(file.size / 1048576).toFixed(1)} MB). Maximum size is 10 MB.`); return; }
    item.status = 'Submitted'; item.file = file.name; this.pendingSubmission = null; this.toast.success(`Submitted “${item.title}” · ${file.name}`);
  }
  setTestReminder(name: string, date: string): void { this.toast.success(`Reminder set for ${name} on ${date}.`); }
  contactTeacher(name: string): void { this.toast.info(`Message request sent to ${name}. They will reply via the ${this.isSchool ? 'school' : 'institute'} office.`); }
  logout(): void { this.signOutFlow.signOut(); }
  openPayment(fee?: PortalFee): void {
    const target = fee && this.payableFor(fee) > 0 ? fee : this.payablePeriods[0];
    if (!target) { this.toast.info(this.pendingTotal ? 'Your payment is waiting for the office to verify it.' : 'You have no fees due.'); return; }
    this.pay = { period: target.month, amount: this.payableFor(target), mode: 'UPI', reference: '', proof: '', note: '' };
    this.payError = '';
    this.payOpen = true;
  }
  onPeriodChange(): void { this.pay.amount = this.selectedPayable || null; }
  onProofFile(event: Event): void {
    const input = event.target as HTMLInputElement; const file = input.files?.[0];
    if (!file) { this.pay.proof = ''; return; }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!StudentPortalComponent.PROOF_TYPES.includes(ext)) { input.value = ''; this.pay.proof = ''; this.toast.error('Upload the payment receipt as a PDF, JPG or PNG file.'); return; }
    if (file.size > StudentPortalComponent.MAX_PROOF_BYTES) { input.value = ''; this.pay.proof = ''; this.toast.error(`File is too large (${(file.size / 1048576).toFixed(1)} MB). Maximum size is 5 MB.`); return; }
    this.pay.proof = file.name;
  }
  submitPayment(): void {
    const amount = Number(this.pay.amount); const max = this.selectedPayable; const cash = this.pay.mode === 'Cash at office'; const reference = this.pay.reference.trim();
    this.payError = !this.pay.period ? 'Choose the fee you are paying.'
      : !(amount > 0) || !Number.isInteger(amount) ? 'Enter the amount in whole rupees.'
      : amount > max ? `Amount cannot be more than the ₹${max.toLocaleString('en-IN')} due for ${this.pay.period}.`
      : !cash && !/^[A-Za-z0-9-]{6,30}$/.test(reference) ? 'Enter the transaction / UTR number (6–30 letters or digits).'
      : cash && !reference && !this.pay.note.trim() ? 'For cash payments, add the office receipt number or a note.' : '';
    if (this.payError) return;
    this.feeSubmissions.submit({ workspace: this.workspace, studentId: this.studentId, student: this.childName, period: this.pay.period, amount, mode: this.pay.mode, reference, proof: this.pay.proof, note: this.pay.note.trim(), submittedBy: this.isParent ? `${this.displayName} (Parent)` : this.displayName });
    this.payOpen = false;
    this.toast.success(`Payment of ₹${amount.toLocaleString('en-IN')} submitted. The ${this.isSchool ? 'school' : 'institute'} office will verify it and send your receipt.`);
  }
  submissionTone(status: string): 'success' | 'warning' | 'danger' { return status === 'Approved' ? 'success' : status === 'Rejected' ? 'danger' : 'warning'; }
  requestBook(book: LibraryBook): void {
    const problem = this.library.request(book, this.studentId, this.childName);
    if (problem) { this.toast.info(problem); return; }
    this.toast.success(`Requested “${book.title}”. Collect it from the library once it is issued.`);
  }
  /** Payments the office has approved count towards the fee rows (the rows are fresh on each visit). */
  private applyApprovedPayments(): void {
    this.feeSubmissions.forWorkspace(this.tenant.current.businessType).filter(item => item.studentId === this.studentId && item.status === 'Approved').forEach(item => {
      const fee = this.fees.find(row => row.month === item.period);
      if (!fee) return;
      fee.paid += item.amount; fee.due = Math.max(0, fee.amount - fee.paid); fee.status = fee.due ? 'Partial' : 'Paid'; fee.date = item.submittedOn; fee.mode = item.mode;
    });
  }
  showNotifications(): void { this.toast.info(this.notices.length ? `You have ${this.notices.length} notices. Opening Notices.` : 'You are all caught up.'); if (this.notices.length) this.go('notices'); }
}

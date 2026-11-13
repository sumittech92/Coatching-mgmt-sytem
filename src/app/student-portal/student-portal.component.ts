import { BottomNavItem } from '../shared/ui/bottom-nav/bottom-nav.component';
import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MockAuthService } from '../core/mock-auth.service';
import { TenantContextService } from '../core/tenant-context.service';
import { ToastService } from '../core/toast.service';
import { SignOutService } from '../core/sign-out.service';
import { FeeSubmission, FeeSubmissionService } from '../core/fee-submission.service';
import { WebsiteContentService } from '../core/website-content.service';
import { LibraryBook, LibraryService, LibraryView } from '../core/library.service';
import { LibraryApiService } from '../core/library-api.service';
import { forkJoin, of, switchMap, catchError } from 'rxjs';
import { BatchApiService } from '../core/batch-api.service';
import { dayLabel } from '../core/api-client';
import { PaymentDetails, PortalApiService, PortalAttendance, PortalClass, PortalFeeSubmission, PortalFees, PortalMaterial, PortalMe, PortalNotice, PortalOptionalSubjects, PortalResult, PortalSubject, PortalSyllabus, PortalTask, PortalTest, PortalUpdate } from '../core/portal-api.service';
import { AdmitCardPrintComponent, AdmitCardPrintData } from '../shared/ui/admit-card/admit-card-print.component';
import { ApiPeriod } from '../core/timetable-api.service';
import { MatDialog } from '@angular/material/dialog';
import { ReceiptPreviewComponent, ReceiptData } from '../shared/ui/receipt-preview/receipt-preview.component';
interface PortalFee { month: string; amount: number; paid: number; due: number; status: string; date: string; mode: string; }
interface PortalMenu { key: string; label: string; icon: string; }
/** A homework / assignment row (demo rows have only the first fields). */
interface PortalTaskRow { subject: string; title: string; given: string; due: string; status: string; file?: string; taskCode?: string; fileUrl?: string; attachment?: { url: string; name: string } | null; remark?: string | null; canSubmit?: boolean; }
const DAY_NAMES: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MATERIAL_LABELS: Record<string, string> = { pdf: 'PDF', notes: 'Notes', assignment: 'Assignment', video: 'Video', questionPaper: 'Question Paper' };
const NOTICE_LABELS: Record<string, string> = { general: 'General', holiday: 'Holiday', exam: 'Exam', feeReminder: 'Fee reminder', newBatch: 'New batch', ptm: 'PTM', important: 'Important' };
const NOTICE_TONES: Record<string, string> = { exam: 'amber', holiday: 'blue', feeReminder: 'rose', important: 'rose' };
const SUBMISSION_LABELS: Record<string, FeeSubmission['status']> = { pending: 'Pending verification', approved: 'Approved', rejected: 'Rejected' };
const SUBJECT_ICONS: Record<string, string> = { english: 'translate', hindi: 'translate', sanskrit: 'translate', mathematics: 'calculate', science: 'science', physics: 'science', chemistry: 'science', biology: 'biotech', 'social science': 'public', 'computer science': 'computer', 'physical education': 'sports_soccer', 'art & craft': 'palette', evs: 'eco' };
import { formatDate, formatPhone } from '../core/profile-format';
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
  private readonly demoBatch = { name: 'JEE Main 2027 · Morning Batch A', course: 'Class 12 Science (PCM)', timing: '7:00 am – 9:30 am', days: 'Monday – Saturday', room: 'Room 3, First floor', classmates: 32, startDate: '06 Apr 2026', coordinator: 'Mr. Anil Kapoor', teachers: [{ name: 'Mr. Rajesh Verma', subject: 'Physics', initials: 'RV' }, { name: 'Ms. Sunita Iyer', subject: 'Chemistry', initials: 'SI' }, { name: 'Mr. Anil Kapoor', subject: 'Mathematics', initials: 'AK' }] };
  private readonly demoBatchSchedule = [{ day: 'Monday', first: 'Physics · Rotational motion', second: 'Mathematics · Integration' }, { day: 'Tuesday', first: 'Chemistry · Chemical bonding', second: 'Physics · Problem practice' }, { day: 'Wednesday', first: 'Mathematics · Differential equations', second: 'Chemistry · Organic basics' }, { day: 'Thursday', first: 'Physics · Gravitation', second: 'Mathematics · DPP discussion' }, { day: 'Friday', first: 'Chemistry · Equilibrium', second: 'Doubt clearing session' }, { day: 'Saturday', first: 'Weekly test (7:00 – 8:30 am)', second: 'Test analysis' }];
  /** School: My Class, subjects and timetable. */
  private readonly demoSchoolClass = { name: 'Class 9', section: 'Section A', rollNo: 14, classTeacher: 'Ms. Priya Nair', classTeacherSubject: 'English', room: 'Room 204, Block B', classmates: 38, monitor: 'Kabir Malhotra', session: '2026–27', timing: '7:50 am – 2:10 pm' };
  private readonly demoSubjects = [{ name: 'English', teacher: 'Ms. Priya Nair', book: 'Beehive & Moments', chapters: '6 of 11 chapters', progress: 55, icon: 'translate' }, { name: 'Hindi', teacher: 'Mrs. Kavita Joshi', book: 'Kshitij & Kritika', chapters: '5 of 10 chapters', progress: 50, icon: 'record_voice_over' }, { name: 'Mathematics', teacher: 'Mr. Suresh Menon', book: 'NCERT Mathematics', chapters: '5 of 12 chapters', progress: 42, icon: 'calculate' }, { name: 'Science', teacher: 'Dr. Anjali Gupta', book: 'NCERT Science', chapters: '6 of 12 chapters', progress: 48, icon: 'science' }, { name: 'Social Science', teacher: 'Mr. Rohit Bansal', book: 'History, Geography, Civics, Economics', chapters: '9 of 20 chapters', progress: 45, icon: 'public' }, { name: 'Computer Science', teacher: 'Ms. Farah Khan', book: 'Computer Applications', chapters: '4 of 8 units', progress: 50, icon: 'computer' }, { name: 'Sanskrit', teacher: 'Mr. Hari Prasad', book: 'Shemushi', chapters: '4 of 10 chapters', progress: 40, icon: 'auto_stories' }];
  private readonly demoTimetableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  private readonly demoPeriods = [{ label: 'Period 1', time: '8:00 – 8:40' }, { label: 'Period 2', time: '8:40 – 9:20' }, { label: 'Period 3', time: '9:20 – 10:00' }, { label: 'Period 4', time: '10:00 – 10:40' }, { label: 'Lunch', time: '10:40 – 11:10' }, { label: 'Period 5', time: '11:10 – 11:50' }, { label: 'Period 6', time: '11:50 – 12:30' }, { label: 'Period 7', time: '12:30 – 1:10' }, { label: 'Period 8', time: '1:10 – 1:50' }];
  private readonly demoTimetable: Record<string, string[]> = {
    Monday: ['English', 'Mathematics', 'Science', 'Hindi', 'Lunch break', 'Social Science', 'Computer Science', 'Sanskrit', 'Physical Education'],
    Tuesday: ['Mathematics', 'English', 'Hindi', 'Science', 'Lunch break', 'Sanskrit', 'Social Science', 'Art & Craft', 'Library'],
    Wednesday: ['Science', 'Mathematics', 'English', 'Social Science', 'Lunch break', 'Hindi', 'Computer Science', 'Science Lab', 'Science Lab'],
    Thursday: ['Hindi', 'Science', 'Mathematics', 'English', 'Lunch break', 'Social Science', 'Sanskrit', 'Physical Education', 'Value Education'],
    Friday: ['Mathematics', 'Social Science', 'Science', 'English', 'Lunch break', 'Hindi', 'Computer Lab', 'Computer Lab', 'Music'],
    Saturday: ['English', 'Mathematics', 'Science', 'Social Science', 'Lunch break', 'Club activity', '—', '—', '—']
  };
  private readonly demoHomework = [{ subject: 'Mathematics', title: 'Exercise 2.3 · Q1 to Q5 (Polynomials)', given: '26 Sep 2026', due: '29 Sep 2026', status: 'Pending' }, { subject: 'Science', title: 'Draw and label the structure of an atom', given: '25 Sep 2026', due: '30 Sep 2026', status: 'Pending' }, { subject: 'English', title: 'Write a diary entry on your weekend (120 words)', given: '24 Sep 2026', due: '28 Sep 2026', status: 'Pending' }, { subject: 'Hindi', title: 'Learn the poem “Gram Shree” for recitation', given: '23 Sep 2026', due: '27 Sep 2026', status: 'Submitted' }, { subject: 'Social Science', title: 'Map work: mark major rivers of India', given: '22 Sep 2026', due: '26 Sep 2026', status: 'Submitted' }];
  private readonly coachingAssignments = [{ title: 'Rotational motion · Problem set 6', subject: 'Physics', given: '24 Sep 2026', due: '30 Sep 2026', status: 'Pending', file: '' }, { title: 'Chemical bonding worksheet', subject: 'Chemistry', given: '23 Sep 2026', due: '01 Oct 2026', status: 'Pending', file: '' }, { title: 'Integration · DPP 14', subject: 'Mathematics', given: '21 Sep 2026', due: '27 Sep 2026', status: 'Submitted', file: 'integration-dpp-14.pdf' }, { title: 'Electrostatics · Previous year JEE questions', subject: 'Physics', given: '15 Sep 2026', due: '22 Sep 2026', status: 'Submitted', file: 'electrostatics-pyq.pdf' }];
  private readonly schoolAssignments = [{ title: 'Science project · Model of an atom', subject: 'Science', given: '20 Sep 2026', due: '05 Oct 2026', status: 'Pending', file: '' }, { title: 'Essay · My favourite festival (250 words)', subject: 'English', given: '22 Sep 2026', due: '01 Oct 2026', status: 'Pending', file: '' }, { title: 'Social Science · Project on disaster management', subject: 'Social Science', given: '18 Sep 2026', due: '08 Oct 2026', status: 'Pending', file: '' }, { title: 'Polynomials worksheet', subject: 'Mathematics', given: '15 Sep 2026', due: '22 Sep 2026', status: 'Submitted', file: 'polynomials-worksheet.pdf' }];
  /** Coaching: tests. */
  private readonly demoUpcomingTests = [{ name: 'Weekly Test 15', subject: 'Physics · Rotational motion', date: 'Sat, 03 Oct 2026', time: '7:00 – 8:30 am', marks: 100, mode: 'Offline · OMR' }, { name: 'JEE Main Mock Test 5', subject: 'Full syllabus · PCM', date: 'Sun, 11 Oct 2026', time: '9:00 am – 12:00 pm', marks: 300, mode: 'Online · CBT' }, { name: 'Chapter Test', subject: 'Chemistry · Chemical bonding', date: 'Sat, 17 Oct 2026', time: '7:00 – 8:00 am', marks: 60, mode: 'Offline · Written' }];
  private readonly demoPastTests = [{ name: 'Weekly Test 14', subject: 'Mathematics', date: '26 Sep 2026', marks: '82 / 100', rank: '6 / 32', percentage: 82 }, { name: 'Unit Test 3', subject: 'Physics', date: '18 Sep 2026', marks: '88 / 100', rank: '4 / 32', percentage: 88 }, { name: 'JEE Main Mock Test 4', subject: 'Full syllabus · PCM', date: '13 Sep 2026', marks: '196 / 300', rank: '5 / 32', percentage: 65 }, { name: 'Unit Test 2', subject: 'Chemistry', date: '20 Aug 2026', marks: '91 / 100', rank: '2 / 32', percentage: 91 }];
  /** School: exams. */
  private readonly demoExamSchedule = [{ name: 'Unit Test 1', period: '20 – 26 Jul 2026', marks: '40 marks per subject', status: 'Completed' }, { name: 'Unit Test 2', period: '14 – 19 Sep 2026', marks: '40 marks per subject', status: 'Completed' }, { name: 'Term 1 (Half-yearly)', period: '12 – 23 Oct 2026', marks: '80 + 20 internal', status: 'Upcoming' }, { name: 'Unit Test 3', period: '07 – 12 Dec 2026', marks: '40 marks per subject', status: 'Scheduled' }, { name: 'Term 2 (Annual)', period: '22 Feb – 10 Mar 2027', marks: '80 + 20 internal', status: 'Scheduled' }];
  private readonly demoDateSheet = [{ date: 'Mon, 12 Oct 2026', subject: 'English', time: '9:00 am – 12:00 pm', syllabus: 'Beehive Ch 1–6, Moments Ch 1–4, Grammar, Writing' }, { date: 'Wed, 14 Oct 2026', subject: 'Mathematics', time: '9:00 am – 12:00 pm', syllabus: 'Number systems, Polynomials, Coordinate geometry, Linear equations, Euclid’s geometry' }, { date: 'Fri, 16 Oct 2026', subject: 'Science', time: '9:00 am – 12:00 pm', syllabus: 'Matter, Atoms & molecules, Cell, Tissues, Motion, Force' }, { date: 'Mon, 19 Oct 2026', subject: 'Social Science', time: '9:00 am – 12:00 pm', syllabus: 'French Revolution, India – size & location, Physical features, Democracy, Story of Palampur' }, { date: 'Wed, 21 Oct 2026', subject: 'Hindi', time: '9:00 am – 12:00 pm', syllabus: 'Kshitij Ch 1–5, Kritika Ch 1–2, Vyakaran' }, { date: 'Fri, 23 Oct 2026', subject: 'Sanskrit / Computer Science', time: '9:00 – 11:00 am', syllabus: 'Shemushi Ch 1–4 / Units 1–4' }];
  private pendingSubmission: PortalTaskRow | null = null;
  private static readonly ALLOWED_FILE_TYPES = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
  private static readonly MAX_FILE_BYTES = 10 * 1024 * 1024;
  get fees(): PortalFee[] { return this.live ? this.liveFees : this.isSchool ? this.schoolFees : this.coachingFees; }
  /** Fee payment form (student or parent submits; the office verifies). */
  readonly payModes = ['UPI', 'Card', 'Net banking', 'Bank Transfer', 'Cash at office'];
  payOpen = false;
  pay = { period: '', amount: null as number | null, mode: 'UPI', reference: '', proof: '', note: '' };
  payError = '';
  private static readonly PROOF_TYPES = ['pdf', 'jpg', 'jpeg', 'png'];
  private static readonly MAX_PROOF_BYTES = 5 * 1024 * 1024;
  get workspace(): string { return this.tenant.current.businessType; }
  get submissions(): FeeSubmission[] { return this.live ? this.liveSubmissions : this.feeSubmissions.forStudent(this.workspace, this.studentId); }
  get payablePeriods(): PortalFee[] { return this.fees.filter(fee => this.payableFor(fee) > 0); }
  pendingFor(period: string): number { return this.submissions.filter(item => item.period === period && item.status === 'Pending verification').reduce((sum, item) => sum + item.amount, 0); }
  /** Due amount not already covered by a payment waiting for verification. */
  payableFor(fee: PortalFee): number { return Math.max(0, fee.due - this.pendingFor(fee.month)); }
  get pendingTotal(): number { return this.submissions.filter(item => item.status === 'Pending verification').reduce((sum, item) => sum + item.amount, 0); }
  get selectedPayable(): number { const fee = this.fees.find(item => item.month === this.pay.period); return fee ? this.payableFor(fee) : 0; }
  /** Library (students only). */
  /** A signed-in student uses crm-backend; demo and parent sessions use the sample library. */
  get liveLibrary(): boolean { return !!this.auth.token && this.auth.role === 'Student'; }
  get library(): LibraryView { return this.liveLibrary ? this.libraryApi : this.demoLibrary; }
  get loanDays(): number { return this.library.loanDays; }
  get finePerDay(): number { return this.library.finePerDay; }
  private get libraryMemberId(): string { return this.liveLibrary ? this.libraryApi.myCode : this.studentId; }
  librarySearch = '';
  get myLoans() { return this.library.issues.filter(item => item.memberId === this.libraryMemberId && !item.returned); }
  get myReturned() { return this.library.issues.filter(item => item.memberId === this.libraryMemberId && item.returned); }
  get myRequests() { return this.library.requests.filter(item => item.memberId === this.libraryMemberId); }
  get catalogue(): LibraryBook[] { const q = this.librarySearch.trim().toLowerCase(); return this.library.books.filter(book => !q || `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(q)); }
  get libraryFine(): number { return this.myLoans.reduce((sum, item) => sum + this.library.fineFor(item), 0); }
  requested(book: LibraryBook): boolean { return this.myRequests.some(item => item.bookId === book.id && item.status === 'Requested'); }
  hasBook(book: LibraryBook): boolean { return this.myLoans.some(item => item.bookId === book.id); }
  get results() { return this.live ? this.view.results : this.isSchool ? this.schoolResults : this.coachingResults; }
  get materials() { return this.live ? this.view.materials : this.isSchool ? this.schoolMaterials : this.coachingMaterials; }
  get notices() { return this.live ? this.view.notices : this.isSchool ? this.schoolNotices : this.coachingNotices; }
  get updates() { return this.live ? this.view.updates : this.isSchool ? this.schoolUpdates : this.coachingUpdates; }
  get assignments(): PortalTaskRow[] { return this.live ? this.view.assignments : this.isSchool ? this.schoolAssignments : this.coachingAssignments; }
  get homework(): PortalTaskRow[] { return this.live ? this.view.homework : this.demoHomework; }
  get pendingHomework(): number { return this.homework.filter(h => h.status === 'Pending' || h.status === 'Due' || h.status === 'Overdue').length; }
  get pendingAssignments(): number { return this.assignments.filter(a => a.status === 'Pending').length; }
  private readonly demoCalendar = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, status: [3, 10, 17, 22].includes(i + 1) ? 'absent' : [6].includes(i + 1) ? 'leave' : [8, 19].includes(i + 1) ? 'late' : i < 28 ? 'present' : 'future' }));
  constructor(private router: Router, public auth: MockAuthService, private tenant: TenantContextService, private toast: ToastService, private signOutFlow: SignOutService, private feeSubmissions: FeeSubmissionService, private demoLibrary: LibraryService, private libraryApi: LibraryApiService, public content: WebsiteContentService, private portalApi: PortalApiService, private dialog: MatDialog) { if (!this.live) this.applyApprovedPayments(); if (this.liveLibrary) this.libraryApi.loadMine(this.auth.token!).subscribe({ error: (error: Error) => this.toast.error(error.message) }); this.content.loadOwnerWebsite().subscribe(); this.update(router.url); router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => { this.update(event.urlAfterRedirects); this.menuOpen = false; }); if (this.live) { this.loadSeenNotices(); this.load(); } }
  /** Phone tab bar (both student and parent menus have these pages); "More" opens the full menu. */
  readonly bottomNav: BottomNavItem[] = [{ label: 'Dashboard', icon: 'home', route: '/student/dashboard' }, { label: 'Profile', icon: 'person', route: '/student/profile' }, { label: 'Attendance', icon: 'schedule', route: '/student/attendance' }, { label: 'Notification', icon: 'notifications', route: '/student/notices', dot: true }];
  get menu(): PortalMenu[] { return this.isParent ? (this.isSchool ? this.schoolParentMenu : this.coachingParentMenu) : this.isSchool ? this.schoolStudentMenu : this.coachingStudentMenu; }
  /** Sections outside the current role/workspace menu show a friendly fallback instead of the wrong content. */
  get activeSection(): string { return this.menu.some(item => item.key === this.section) ? this.section : 'unavailable'; }
  get isParent(): boolean { return this.auth.role === 'Parent'; }
  get isSchool(): boolean { return this.tenant.current.businessType === 'school'; }
  get displayName(): string { if (this.auth.displayName) return this.auth.displayName; return this.isParent ? (this.isSchool ? 'Meera Rao' : 'Neha Sharma') : (this.isSchool ? 'Ishita Rao' : 'Aarav Sharma'); }
  /**
   * Profile page details. A real signed-in account shows its registered details from login; the student's
   * parents, address and academic details have no read API yet, so they show "—". Demo sessions keep sample data.
   */
  get profile(): { name: string; studentId: string; placement: string; group: string; details: { label: string; value: string; wide?: boolean }[] } {
    const student = this.me?.student;
    if (!this.live || !student) {
      return {
        name: this.childName, studentId: this.studentId, placement: this.academicPlacement, group: this.groupPlacement,
        details: [
          { label: 'Full name', value: this.childName }, { label: 'Date of birth', value: this.childDateOfBirth }, { label: 'Gender', value: this.childGender },
          { label: 'Phone', value: this.childPhone }, { label: 'Email', value: this.childEmail }, { label: 'Admission date', value: '12 June 2026' },
          { label: 'Father', value: this.otherGuardian }, { label: 'Mother', value: this.isSchool ? 'Meera Rao' : 'Neha Sharma' },
          { label: this.isSchool ? 'Guardian contact' : 'Parent contact', value: this.isSchool ? '98765 20002' : '98765 43210' },
          { label: 'Address', value: '12 Lake View Road, Bengaluru, Karnataka 560038', wide: true }
        ]
      };
    }
    const parents = student.parentsInfo;
    const address = student.address;
    return {
      name: student.fullName || '—', studentId: student.studentCode, placement: student.placement, group: this.groupPlacement,
      details: [
        { label: 'Full name', value: student.fullName || '—' }, { label: 'Date of birth', value: formatDate(student.dateOfBirth) },
        { label: 'Gender', value: student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : '—' },
        { label: 'Phone', value: formatPhone(student.countryCode, student.phoneNumber) }, { label: 'Email', value: student.email || '—' },
        { label: 'Admission date', value: formatDate(student.admissionDate) },
        { label: 'Father', value: parents?.fatherName || '—' }, { label: 'Mother', value: parents?.motherName || '—' },
        { label: this.isSchool ? 'Guardian contact' : 'Parent contact', value: formatPhone(parents?.countryCode, parents?.phoneNumber) },
        { label: 'Address', value: [address?.addressLine, address?.city, address?.state, address?.pincode].filter(Boolean).join(', ') || '—', wide: true }
      ]
    };
  }
  get childName(): string { return this.live ? this.me?.student.fullName || '—' : this.isSchool ? 'Ishita Rao' : 'Aarav Sharma'; }
  get firstName(): string { return (this.isParent ? (this.live ? this.displayName : this.isSchool ? 'Meera Rao' : 'Neha Sharma') : this.displayName).split(' ')[0]; }
  get childFirstName(): string { return this.childName.split(' ')[0]; }
  get studentId(): string { return this.live ? this.me?.student.studentCode || '—' : this.isSchool ? 'GPS-2601' : 'NS-2401'; }
  get academicPlacement(): string { return this.live ? this.me?.student.placement || '—' : this.isSchool ? 'Class 9 · Section A' : 'Class 12 Science'; }
  get groupPlacement(): string {
    if (!this.live) return this.isSchool ? 'Roll no. 14 · Class teacher: Ms. Priya Nair' : 'JEE Main 2027 · Morning Batch A';
    const roll = this.me?.student.rollNumber;
    return this.isSchool ? [roll ? `Roll no. ${roll}` : '', this.schoolClass.classTeacher !== '—' ? `Class teacher: ${this.schoolClass.classTeacher}` : ''].filter(Boolean).join(' · ') || '—' : this.me?.student.course || '—';
  }
  get childDateOfBirth(): string { return this.isSchool ? '12 May 2012' : '14 February 2009'; }
  get childGender(): string { return this.isSchool ? 'Female' : 'Male'; }
  get childPhone(): string { return this.isSchool ? '98765 20001' : '98765 10001'; }
  get childEmail(): string { return this.isSchool ? 'ishita.r@email.com' : 'aarav.s@email.com'; }
  get otherGuardian(): string { return this.isSchool ? 'Arun Rao' : 'Vikram Sharma'; }
  /** Latest published result (dashboard card and Results banner). */
  get latestResult(): { percentage: number; exam: string; subject: string; date: string; grade: string } | null {
    if (!this.live) return { percentage: 88, exam: this.isSchool ? 'Unit Test 2' : 'Unit Test 3', subject: this.isSchool ? 'Mathematics' : 'Physics', date: 'September 18, 2026', grade: 'A' };
    const latest = this.portal.results[0];
    return latest ? { percentage: Math.round(latest.percentage), exam: latest.exam, subject: latest.subject, date: dayLabel(latest.date), grade: latest.grade } : null;
  }
  get latestAssessment(): string { return this.latestResult?.exam || '—'; }
  get latestSubject(): string { return this.latestResult?.subject || '—'; }
  get paymentDescription(): string {
    if (!this.live) return this.isSchool ? 'Term 2 fee balance · due Oct 5' : 'September balance · due Oct 5';
    const next = this.portal.fees?.fees.filter(fee => fee.due > 0).sort((a, b) => String(a.dueDate || '9').localeCompare(String(b.dueDate || '9')))[0];
    return next ? `${next.period} balance${next.dueDate ? ' · due ' + dayLabel(next.dueDate) : ''}` : 'Nothing due';
  }
  get officePhone(): string { return this.content.phone; }
  get officeTel(): string { return WebsiteContentService.telLink(this.content.phone); }
  get officeWhatsapp(): string { return WebsiteContentService.whatsappLink(this.content.whatsapp); }
  get instituteName(): string { return this.tenant.current.businessName; }
  /** Attendance in view: the chosen month on the Attendance page, this month elsewhere. */
  private get shownAttendance(): PortalAttendance | undefined { return this.section === 'attendance' && this.pageAttendance ? this.pageAttendance : this.portal.attendance; }
  private get shownMonth(): Date { const [year, month] = (this.section === 'attendance' ? this.attendanceMonth : StudentPortalComponent.monthKey(new Date())).split('-').map(Number); return new Date(year, month - 1, 1); }
  get attendanceRate(): number { return this.live ? this.shownAttendance?.percent ?? 0 : this.isSchool ? 94 : 96; }
  /** Days present or late in the month shown. */
  get attendanceDays(): number { return this.live ? (this.shownAttendance?.present ?? 0) + (this.shownAttendance?.late ?? 0) : this.isSchool ? 22 : 24; }
  /** Days attendance was taken in the month shown. */
  get markedDays(): number { return this.live ? this.shownAttendance?.records.length ?? 0 : 25; }
  get absentDays(): number { return this.live ? this.shownAttendance?.absent ?? 0 : 1; }
  get leaveDays(): number { return this.live ? this.shownAttendance?.leave ?? 0 : 0; }
  get absentDates(): string {
    if (!this.live) return 'September 12';
    const dates = (this.shownAttendance?.records || []).filter(record => record.status === 'absent').map(record => new Date(record.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }));
    return dates.join(', ') || 'No absences';
  }
  get attendanceVerdict(): string { const rate = this.attendanceRate; return !this.markedDays ? 'Not taken yet' : rate >= 90 ? 'Excellent' : rate >= 75 ? 'Good' : 'Needs attention'; }
  get monthLabel(): string { return this.live ? this.shownMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'September 2026'; }
  /** Earliest month to browse: the admission month, or a year back when it is not recorded. */
  private get firstMonth(): string {
    const admitted = this.me?.student.admissionDate;
    if (admitted) return admitted.slice(0, 7);
    const yearBack = new Date(); yearBack.setMonth(yearBack.getMonth() - 11);
    return StudentPortalComponent.monthKey(yearBack);
  }
  get canPrevMonth(): boolean { return this.attendanceMonth > this.firstMonth; }
  get canNextMonth(): boolean { return this.attendanceMonth < StudentPortalComponent.monthKey(new Date()); }
  /** Attendance page: step to the previous (-1) or next (+1) month. */
  changeMonth(step: number): void {
    if ((step < 0 && !this.canPrevMonth) || (step > 0 && !this.canNextMonth)) return;
    const [year, month] = this.attendanceMonth.split('-').map(Number);
    const target = StudentPortalComponent.monthKey(new Date(year, month - 1 + step, 1));
    this.attendanceMonth = target;
    if (target === StudentPortalComponent.monthKey(new Date())) { this.pageAttendance = undefined; return; }
    this.portalApi.attendance(this.auth.token!, target, this.childCode).subscribe({
      next: data => { if (this.attendanceMonth === target) this.pageAttendance = data; },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  get todayLabel(): string { return (this.live ? new Date() : new Date(2026, 8, 28)).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(); }
  get greeting(): string { if (!this.live) return 'Good morning'; const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'; }
  // ---------- Live data (signed-in student or parent) ----------
  /** Real accounts read crm-backend; demo sessions keep the sample content above. */
  get live(): boolean { return !!this.auth.token && (this.auth.role === 'Student' || this.auth.role === 'Parent'); }
  loading = false;
  me?: PortalMe;
  private childCode?: string;
  /** Month shown on the Attendance page (YYYY-MM) and its records; the dashboard keeps this month. */
  attendanceMonth = StudentPortalComponent.monthKey(new Date());
  private pageAttendance?: PortalAttendance;
  private static monthKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
  private proofFile?: File;
  readonly portal: { classInfo?: PortalClass; subjects: PortalSubject[]; timetable: ApiPeriod[]; attendance?: PortalAttendance; fees?: PortalFees; tests: PortalTest[]; results: PortalResult[]; materials: PortalMaterial[]; notices: PortalNotice[]; updates: PortalUpdate[]; tasks: PortalTask[]; syllabus: PortalSyllabus[]; optional?: PortalOptionalSubjects } = { subjects: [], timetable: [], tests: [], results: [], materials: [], notices: [], updates: [], tasks: [], syllabus: [] };
  /** Optional subjects being picked on the Exams page (saved with "Save choice"). */
  optionalPicks: string[] = [];
  savingOptional = false;
  admitLoading = '';
  /** Live data in the row shapes the template uses. */
  readonly view: { results: { exam: string; date: string; subject: string; marks: string; percentage: string; grade: string }[]; materials: { title: string; subject: string; type: string; file: string; date: string }[]; notices: { type: string; title: string; body: string; date: string; tone: string }[]; updates: { title: string; body: string; date: string; type: string }[]; assignments: PortalTaskRow[]; homework: PortalTaskRow[] } = { results: [], materials: [], notices: [], updates: [], assignments: [], homework: [] };
  private liveFees: PortalFee[] = [];
  private liveSubmissions: FeeSubmission[] = [];

  /** Loads the student (or the parent's chosen child) and every portal section. One failing section does not hide the rest. */
  load(): void {
    const token = this.auth.token!;
    const month = StudentPortalComponent.monthKey(new Date());
    this.attendanceMonth = month;
    this.pageAttendance = undefined;
    const safe = <T>(source: import('rxjs').Observable<T>, fallback: T) => source.pipe(catchError(() => of(fallback)));
    this.loading = true;
    this.portalApi.me(token, this.childCode).pipe(switchMap(me => {
      this.me = me;
      this.childCode = me.student.studentCode;
      const child = this.childCode;
      const school = me.student.workType === 'school';
      return forkJoin({
        classInfo: safe(this.portalApi.classInfo(token, child), undefined as PortalClass | undefined),
        subjects: school ? safe(this.portalApi.subjects(token, child), [] as PortalSubject[]) : of([] as PortalSubject[]),
        timetable: school ? safe(this.portalApi.timetable(token, child), [] as ApiPeriod[]) : of([] as ApiPeriod[]),
        attendance: safe(this.portalApi.attendance(token, month, child), undefined as PortalAttendance | undefined),
        fees: safe(this.portalApi.fees(token, child), undefined as PortalFees | undefined),
        tests: safe(this.portalApi.tests(token, child), [] as PortalTest[]),
        results: safe(this.portalApi.results(token, child), [] as PortalResult[]),
        materials: safe(this.portalApi.materials(token, child), [] as PortalMaterial[]),
        notices: safe(this.portalApi.notices(token, child), [] as PortalNotice[]),
        updates: safe(this.portalApi.updates(token, child), [] as PortalUpdate[]),
        tasks: safe(this.portalApi.tasks(token, child), [] as PortalTask[]),
        syllabus: safe(this.portalApi.syllabus(token, child), [] as PortalSyllabus[]),
        optional: school ? safe(this.portalApi.optionalSubjects(token, child), undefined as PortalOptionalSubjects | undefined) : of(undefined as PortalOptionalSubjects | undefined)
      });
    })).subscribe({
      next: data => { this.selectedBatch = 0; Object.assign(this.portal, data); this.optionalPicks = [...(data.optional?.chosen || [])]; this.buildView(); this.loading = false; if (this.section === 'notices') this.markNoticesSeen(); this.refreshNoticeDot(); },
      error: (error: Error) => { this.loading = false; this.toast.error(error.message); }
    });
  }

  /** Parents with more than one child switch between them. */
  get children() { return this.me?.children || []; }
  switchChild(studentCode: string): void { if (studentCode === this.childCode) return; this.childCode = studentCode; this.load(); }

  private buildView(): void {
    const day = (value: string | null | undefined) => dayLabel(value);
    this.view.results = this.portal.results.map(row => ({ exam: row.exam, date: day(row.date), subject: row.subject, marks: row.absent ? 'Absent' : `${row.marks} / ${row.maxMarks}`, percentage: `${row.percentage}%`, grade: row.grade }));
    this.view.materials = this.portal.materials.map(item => ({ title: item.title, subject: item.subject || item.description || MATERIAL_LABELS[item.type] || 'Material', type: MATERIAL_LABELS[item.type] || 'PDF', file: item.file?.url || item.link || '', date: day(item.date) }));
    this.view.notices = this.portal.notices.map(item => ({ type: NOTICE_LABELS[item.type] || 'General', title: item.title, body: item.description, date: day(item.date), tone: NOTICE_TONES[item.type] || '' }));
    this.view.updates = this.portal.updates.map(item => ({ title: item.title, body: item.body, date: item.kind === 'event' && item.startTime ? `${day(item.date)} · ${BatchApiService.clock(item.startTime)}` : day(item.date), type: item.kind === 'event' ? 'Upcoming event' : 'Announcement' }));
    const row = (task: PortalTask): PortalTaskRow => {
      const status = task.kind === 'homework'
        ? (task.status === 'closed' ? 'Closed' : task.overdue ? 'Overdue' : 'Due')
        : task.submission?.status === 'checked' ? 'Checked' : task.submission ? 'Submitted' : task.status === 'closed' ? 'Closed' : task.overdue ? 'Overdue' : 'Pending';
      return {
        taskCode: task.taskCode, subject: task.subject, title: task.title, given: day(task.givenOn), due: day(task.dueDate), status,
        file: task.submission?.file.name || '', fileUrl: task.submission?.file.url, attachment: task.attachment, remark: task.submission?.remark,
        canSubmit: task.kind === 'assignment' && task.status === 'assigned' && task.submission?.status !== 'checked'
      };
    };
    this.view.homework = this.portal.tasks.filter(task => task.kind === 'homework').map(row);
    this.view.assignments = this.portal.tasks.filter(task => task.kind === 'assignment').map(row);
    this.liveFees = (this.portal.fees?.fees || []).map(fee => ({
      month: fee.period, amount: fee.totalFee - fee.discount, paid: fee.paid, due: fee.due, status: fee.status,
      date: fee.lastPayment ? day(fee.lastPayment.date) : '—', mode: fee.lastPayment?.mode || '—'
    }));
    this.liveSubmissions = (this.portal.fees?.submissions || []).map((item: PortalFeeSubmission, index) => ({
      id: index, workspace: this.workspace, studentId: item.studentId || '', student: item.student, period: item.period, amount: item.amount, mode: item.mode,
      reference: item.reference || '', proof: item.proof?.name || '', note: item.note || '', submittedBy: item.submittedBy || '—',
      submittedOn: day(item.submittedOn), status: SUBMISSION_LABELS[item.status], reviewNote: item.reviewNote || (item.receiptNo ? `Receipt ${item.receiptNo}` : '')
    }));
  }

  /** Coaching students can be in several batches; My Batch shows the chosen one. */
  selectedBatch = 0;
  get batchGroups() { return this.portal.classInfo?.groups || []; }
  get batchNames(): string { return this.live ? this.batchGroups.map(group => group.name).join(', ') || '—' : this.demoBatch.name; }
  /** Coaching: My Batch. */
  get batch() {
    if (!this.live) return this.demoBatch;
    const group = this.batchGroups[this.selectedBatch] || this.batchGroups[0];
    return {
      name: group?.name || '—', course: group?.course || '—',
      timing: group?.startTime && group.endTime ? `${BatchApiService.clock(group.startTime)} – ${BatchApiService.clock(group.endTime)}` : '—',
      days: group?.days.length ? BatchApiService.daysLabel(group.days) : '—', room: group?.room || '—', classmates: group?.students ?? 0,
      startDate: group?.startDate ? dayLabel(group.startDate) : '—', coordinator: '',
      teachers: (group?.teachers || []).map(teacher => ({ name: teacher.name || 'Teacher', subject: teacher.subjects.join(', ') || 'Teacher', initials: StudentPortalComponent.initials(teacher.name) }))
    };
  }
  get batchSchedule() {
    if (!this.live) return this.demoBatchSchedule;
    const group = this.batchGroups[this.selectedBatch] || this.batchGroups[0];
    return [...(group?.days || [])].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)).map(day => ({ day: DAY_NAMES[day], first: this.batch.timing, second: group?.room || '—' }));
  }
  get scheduleHeads(): [string, string] { return this.live ? ['TIME', 'ROOM'] : ['7:00 – 8:15 AM', '8:15 – 9:30 AM']; }
  get scheduleNote(): string { return this.live ? `${this.batch.days} · ${this.batch.timing}` : `${this.batch.timing} · two sessions with a short break`; }

  /** School: My Class. */
  get schoolClass() {
    if (!this.live) return this.demoSchoolClass;
    const group = this.portal.classInfo?.groups[0];
    const teacher = group?.teachers[0];
    return {
      name: this.me?.student.course || '—', section: group?.name || this.me?.student.batch || '—', rollNo: this.portal.classInfo?.rollNumber || '—',
      classTeacher: teacher?.name || '—', classTeacherSubject: teacher?.subjects.join(', ') || '', room: group?.room || '—',
      classmates: group?.students ?? 0, monitor: '', session: this.portal.classInfo?.session || '—', timing: ''
    };
  }
  get subjects() {
    if (!this.live) return this.demoSubjects;
    return this.portal.subjects.map(subject => {
      // Syllabus covered comes from the Syllabus page (chapters ticked for the student's section).
      const syllabus = this.portal.syllabus.find(item => item.subject.toLowerCase() === subject.name.toLowerCase());
      return {
        name: subject.name, teacher: subject.teacher || 'Not assigned yet', book: '',
        chapters: syllabus ? `${syllabus.done} of ${syllabus.total} chapters` : '', progress: syllabus?.percent ?? 0, hasSyllabus: !!syllabus, status: syllabus?.status ?? null,
        icon: SUBJECT_ICONS[subject.name.toLowerCase()] || 'menu_book', periods: subject.periodsPerWeek
      };
    });
  }
  /** School timetable: one column per time slot used in the week. */
  private get slots(): { start: string; end: string }[] {
    return [...new Map(this.portal.timetable.map(period => [`${period.startTime}-${period.endTime}`, { start: period.startTime, end: period.endTime }])).values()].sort((a, b) => a.start.localeCompare(b.start));
  }
  get periods() { return this.live ? this.slots.map((slot, index) => ({ label: `Period ${index + 1}`, time: `${BatchApiService.clock(slot.start)} – ${BatchApiService.clock(slot.end)}` })) : this.demoPeriods; }
  get timetableDays(): string[] {
    if (!this.live) return this.demoTimetableDays;
    return DAY_ORDER.filter(day => this.portal.timetable.some(period => period.day === day)).map(day => DAY_NAMES[day]);
  }
  get timetable(): Record<string, string[]> {
    if (!this.live) return this.demoTimetable;
    const grid: Record<string, string[]> = {};
    DAY_ORDER.forEach(day => grid[DAY_NAMES[day]] = this.slots.map(slot => this.portal.timetable.find(period => period.day === day && period.startTime === slot.start && period.endTime === slot.end)?.subject?.name || '—'));
    return grid;
  }
  get weeklyPeriods(): number { return this.portal.timetable.length; }
  get todayPeriods(): number { const today = DAY_ORDER[(new Date().getDay() + 6) % 7]; return this.portal.timetable.filter(period => period.day === today).length; }

  /** Coaching tests: upcoming papers and published results. */
  get upcomingTests() {
    if (!this.live) return this.demoUpcomingTests;
    return this.portal.tests.flatMap(test => test.papers.filter(paper => paper.upcoming).map(paper => ({ name: test.name, subject: paper.subject, date: dayLabel(paper.date), time: '', marks: paper.maxMarks, mode: '' })));
  }
  get pastTests() {
    if (!this.live) return this.demoPastTests;
    return this.portal.results.map(row => ({ name: row.exam, subject: row.subject, date: dayLabel(row.date), marks: row.absent ? 'Absent' : `${row.marks} / ${row.maxMarks}`, rank: row.rank ? `${row.rank} / ${row.outOf}` : '—', percentage: Math.round(row.percentage) }));
  }
  /** School exams: the session's exams and the date sheet of the next one. */
  get examSchedule() {
    if (!this.live) return this.demoExamSchedule.map(exam => ({ ...exam, testCode: '', admit: null as PortalTest['admitCard'] }));
    return this.portal.tests.map(test => {
      const dates = test.papers.map(paper => dayLabel(paper.date));
      const maxMarks = [...new Set(test.papers.map(paper => paper.maxMarks))];
      return {
        name: test.term ? `${test.name} · ${test.term}` : test.name, period: dates.length > 1 ? `${dates[0]} – ${dates[dates.length - 1]}` : dates[0] || '—',
        marks: maxMarks.length === 1 ? `${maxMarks[0]} marks per subject` : `${maxMarks.join(' / ')} marks`,
        status: test.resultsPublished ? 'Results out' : test.papers.some(paper => paper.upcoming) ? 'Upcoming' : 'Completed',
        testCode: test.testCode, admit: test.admitCard
      };
    });
  }
  /** Exam time line shown above the date sheet. */
  get examTime(): string {
    const exam = this.nextExam;
    return exam?.startTime ? `${BatchApiService.clock(exam.startTime)}${exam.endTime ? ` – ${BatchApiService.clock(exam.endTime)}` : ''}` : '';
  }
  get isStudentLogin(): boolean { return this.auth.role === 'Student'; }
  get optionalChanged(): boolean { return [...this.optionalPicks].sort().join('|') !== [...(this.portal.optional?.chosen || [])].sort().join('|'); }
  toggleOptional(subject: string, on: boolean): void { this.optionalPicks = on ? [...new Set([...this.optionalPicks, subject])] : this.optionalPicks.filter(name => name !== subject); }
  saveOptional(): void {
    if (this.savingOptional || !this.optionalChanged) return;
    this.savingOptional = true;
    this.portalApi.saveOptionalSubjects(this.auth.token!, this.optionalPicks).subscribe({
      next: optional => {
        this.savingOptional = false; this.portal.optional = optional; this.optionalPicks = [...optional.chosen];
        this.toast.success('Optional subjects saved. Your date sheet and admit card now show these papers.');
        this.portalApi.tests(this.auth.token!, this.childCode).subscribe({ next: tests => this.portal.tests = tests });
      },
      error: (error: Error) => { this.savingOptional = false; this.toast.error(error.message); }
    });
  }
  /** Student login: their own admit card once released (and fees cleared when the school requires it). */
  downloadAdmitCard(testCode: string): void {
    if (this.admitLoading) return;
    this.admitLoading = testCode;
    this.portalApi.admitCard(this.auth.token!, testCode).subscribe({
      next: card => {
        this.admitLoading = '';
        const profile = this.content.profile;
        const data: AdmitCardPrintData = { cards: [card], institution: profile.settings['name'] || this.instituteName, logo: this.content.customLogo, address: profile.settings['address'] || profile.contact['address'], registration: WebsiteContentService.registrationLine(profile, true) };
        this.dialog.open(AdmitCardPrintComponent, { width: '860px', maxWidth: 'calc(100vw - 24px)', data });
      },
      error: (error: Error) => { this.admitLoading = ''; this.toast.error(error.message); }
    });
  }
  private get nextExam(): PortalTest | undefined { return this.portal.tests.find(test => test.papers.some(paper => paper.upcoming)); }
  get dateSheetTitle(): string { return this.live ? this.nextExam?.name || 'No upcoming exam' : 'Term 1 (Half-yearly)'; }
  get dateSheet() {
    if (!this.live) return this.demoDateSheet;
    return (this.nextExam?.papers || []).map(paper => ({ date: new Date(paper.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }), subject: paper.optional ? `${paper.subject} (optional)` : paper.subject, time: `${paper.maxMarks} marks`, syllabus: '' }));
  }

  /** Calendar of the month shown (demo: September 2026). */
  get calendar(): { day: number; status: string }[] {
    if (!this.live) return this.demoCalendar;
    const shown = this.shownMonth;
    const now = new Date();
    const days = new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate();
    const current = shown.getFullYear() === now.getFullYear() && shown.getMonth() === now.getMonth();
    const marks = new Map((this.shownAttendance?.records || []).map(record => [Number(record.date.slice(8, 10)), record.status]));
    return Array.from({ length: days }, (_, index) => ({ day: index + 1, status: marks.get(index + 1) || (current && index + 1 > now.getDate() ? 'future' : 'none') }));
  }
  /** Blank cells before day 1 (weeks start on Monday). */
  get calendarOffset(): number[] {
    if (!this.live) return [1];
    return Array.from({ length: (this.shownMonth.getDay() + 6) % 7 });
  }
  /** Notices not opened yet on this device (all sample notices count in demo mode). */
  /** Sidebar and top-bar photo: the student's uploaded photo; parents and demo keep the stock avatars. */
  get avatar(): string { return this.isParent ? 'assets/images/people/parent.jpg' : this.me?.student.profileImage || 'assets/images/people/student.jpg'; }
  /** Syllabus covered per subject (coaching My Batch, parent Academic progress). */
  get syllabusRows(): PortalSyllabus[] { return this.live ? this.portal.syllabus : []; }
  syllabusTone(status: string): 'success' | 'danger' | 'neutral' | 'info' { return status === 'On track' ? 'success' : status === 'Behind' ? 'danger' : status === 'No targets' ? 'info' : 'neutral'; }
  get noticeCount(): number { return this.live ? this.portal.notices.filter(notice => !this.seenNotices.has(notice.noticeCode)).length : this.notices.length; }
  private seenNotices = new Set<string>();
  private get seenKey(): string { return `portal-seen-notices:${this.auth.user?._id || 'demo'}`; }
  private loadSeenNotices(): void { try { this.seenNotices = new Set(JSON.parse(localStorage.getItem(this.seenKey) || '[]')); } catch { this.seenNotices = new Set(); } }
  /** Opening Notices marks every notice there as read. */
  private markNoticesSeen(): void {
    if (!this.live || !this.portal.notices.length) return;
    this.portal.notices.forEach(notice => this.seenNotices.add(notice.noticeCode));
    try { localStorage.setItem(this.seenKey, JSON.stringify([...this.seenNotices].slice(-300))); } catch { /* storage unavailable: keep in memory */ }
    this.refreshNoticeDot();
  }
  /** Phone tab bar: the Notification dot shows only when something is unread. */
  private refreshNoticeDot(): void { const item = this.bottomNav.find(entry => entry.route === '/student/notices'); if (item) item.dot = this.noticeCount > 0; }
  /** Where to pay: the institute's UPI / bank details (demo shows sample details). */
  get paymentDetails(): PaymentDetails | null {
    if (!this.live) return { upiId: `fees@${this.isSchool ? 'greenfieldschool' : 'nsacademy'}`, accountName: null, accountNumber: '50200012345678', ifsc: 'HDFC0001234', bankName: null, note: null };
    const details = this.portal.fees?.paymentDetails;
    return details && (details.upiId || details.accountNumber) ? details : null;
  }
  get feePeriodsLabel(): string { return this.live ? `${this.fees.length} ${this.isSchool ? 'term' : 'fee'} period${this.fees.length === 1 ? '' : 's'}` : this.isSchool ? 'Academic year 2026–27' : 'July – September 2026'; }
  private static initials(name: string | null | undefined): string { return String(name || '?').split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
  /** Parent / guardian contacts on file (Family contacts tab). Only one parent mobile is stored, shared by both parents. */
  get familyContacts(): { initials: string; name: string; relation: string; phone: string; tel: string }[] {
    if (!this.live) return [
      { initials: `${this.firstName.charAt(0)}R`, name: `${this.firstName} ${this.isSchool ? 'Rao' : 'Sharma'}`, relation: this.isSchool ? 'Guardian' : 'Parent / guardian', phone: '98765 43210', tel: 'tel:9876543210' },
      { initials: this.isSchool ? 'AR' : 'VS', name: this.isSchool ? 'Arun Rao' : 'Vikram Sharma', relation: this.isSchool ? 'Guardian' : 'Parent / guardian', phone: '98765 43211', tel: 'tel:9876543211' }
    ];
    const parents = this.me?.student.parentsInfo;
    const phone = parents?.phoneNumber ? formatPhone(parents.countryCode, parents.phoneNumber) : '';
    const tel = parents?.phoneNumber ? `tel:${parents.countryCode || ''}${parents.phoneNumber}` : '';
    const people = [{ name: parents?.fatherName, relation: 'Father' }, { name: parents?.motherName, relation: 'Mother' }].filter(person => person.name);
    if (!people.length) return [{ initials: '?', name: 'Not on file', relation: 'Parent / guardian', phone, tel }];
    return people.map(person => ({ initials: StudentPortalComponent.initials(person.name), name: person.name!, relation: person.relation, phone, tel }));
  }
  get classTeacherInitials(): string { return this.live ? StudentPortalComponent.initials(this.schoolClass.classTeacher) : 'PN'; }

  get paidTotal(): number { return this.fees.reduce((sum, fee) => sum + fee.paid, 0); }
  get feeDue(): number { return this.fees.reduce((sum, fee) => sum + fee.due, 0); }
  get sectionLabel(): string { return this.menu.find(item => item.key === this.section)?.label || 'Overview'; }
  private update(url: string): void { const part = url.split('?')[0].split('/').filter(Boolean)[1]; this.section = part || 'dashboard'; if (this.section === 'notices') this.markNoticesSeen(); }
  go(key: string): void { this.router.navigate(['/student', key === 'dashboard' ? 'dashboard' : key]); }
  download(file: string): void { if (/^https?:\/\//.test(file)) { window.open(file, '_blank', 'noopener'); return; } const blob = new Blob([`EduNexa student portal demo file: ${file}`], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.endsWith('.mp4') ? 'lesson-recording.txt' : file; a.click(); URL.revokeObjectURL(a.href); this.toast.success(`Download started: ${a.download}`); }
  /** Demo receipt (sample data). */
  private printDemoReceipt(month: string, amount: number): void { this.toast.info(`Opening receipt for ${month} · ₹${amount.toLocaleString('en-IN')}.`); setTimeout(() => window.print(), 300); }
  markHomeworkDone(item: { title: string; status: string }): void { if (item.status === 'Submitted') { this.toast.info('This homework is already marked as done.'); return; } item.status = 'Submitted'; this.toast.success(`Marked as done: ${item.title}`); }
  startSubmission(item: PortalTaskRow, picker: HTMLInputElement): void { this.pendingSubmission = item; picker.value = ''; picker.click(); }
  onSubmissionFile(event: Event): void {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; const item = this.pendingSubmission; input.value = '';
    if (!file || !item) { this.toast.info('No file selected. Your assignment was not submitted.'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!StudentPortalComponent.ALLOWED_FILE_TYPES.includes(ext)) { this.toast.error('Unsupported file type. Upload a PDF, DOC, DOCX, JPG or PNG file.'); return; }
    if (file.size > StudentPortalComponent.MAX_FILE_BYTES) { this.toast.error(`File is too large (${(file.size / 1048576).toFixed(1)} MB). Maximum size is 10 MB.`); return; }
    this.pendingSubmission = null;
    if (this.live && item.taskCode) {
      const token = this.auth.token!;
      this.portalApi.upload(token, file).pipe(switchMap(saved => this.portalApi.submitTask(token, item.taskCode!, saved))).subscribe({
        next: task => { this.portal.tasks = this.portal.tasks.map(entry => entry.taskCode === task.taskCode ? task : entry); this.buildView(); this.toast.success(`Submitted “${item.title}” · ${file.name}`); },
        error: (error: Error) => this.toast.error(error.message)
      });
      return;
    }
    item.status = 'Submitted'; item.file = file.name; this.toast.success(`Submitted “${item.title}” · ${file.name}`);
  }
  /** Teachers are reached through the office: WhatsApp when the institute has a number, otherwise a call. */
  contactOffice(): void {
    const link = this.content.whatsapp ? this.officeWhatsapp : this.officeTel;
    if (!link) { this.toast.info(`Please contact the ${this.isSchool ? 'school' : 'institute'} office.`); return; }
    window.open(link, this.content.whatsapp ? '_blank' : '_self', 'noopener');
  }
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
    this.proofFile = undefined;
    if (!file) { this.pay.proof = ''; return; }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!StudentPortalComponent.PROOF_TYPES.includes(ext)) { input.value = ''; this.pay.proof = ''; this.toast.error('Upload the payment receipt as a PDF, JPG or PNG file.'); return; }
    if (file.size > StudentPortalComponent.MAX_PROOF_BYTES) { input.value = ''; this.pay.proof = ''; this.toast.error(`File is too large (${(file.size / 1048576).toFixed(1)} MB). Maximum size is 5 MB.`); return; }
    this.pay.proof = file.name;
    this.proofFile = file;
  }
  submitPayment(): void {
    const amount = Number(this.pay.amount); const max = this.selectedPayable; const cash = this.pay.mode === 'Cash at office'; const reference = this.pay.reference.trim();
    this.payError = !this.pay.period ? 'Choose the fee you are paying.'
      : !(amount > 0) || !Number.isInteger(amount) ? 'Enter the amount in whole rupees.'
      : amount > max ? `Amount cannot be more than the ₹${max.toLocaleString('en-IN')} due for ${this.pay.period}.`
      : !cash && !/^[A-Za-z0-9-]{6,30}$/.test(reference) ? 'Enter the transaction / UTR number (6–30 letters or digits).'
      : cash && !reference && !this.pay.note.trim() ? 'For cash payments, add the office receipt number or a note.' : '';
    if (this.payError) return;
    if (this.live) { this.submitLivePayment(amount, reference); return; }
    this.feeSubmissions.submit({ workspace: this.workspace, studentId: this.studentId, student: this.childName, period: this.pay.period, amount, mode: this.pay.mode, reference, proof: this.pay.proof, note: this.pay.note.trim(), submittedBy: this.isParent ? `${this.displayName} (Parent)` : this.displayName });
    this.payOpen = false;
    this.toast.success(`Payment of ₹${amount.toLocaleString('en-IN')} submitted. The ${this.isSchool ? 'school' : 'institute'} office will verify it and send your receipt.`);
  }
  /** Uploads the proof (if any), sends the payment to the office and reloads the fee rows. */
  private submitLivePayment(amount: number, reference: string): void {
    const token = this.auth.token!;
    const proof$ = this.proofFile ? this.portalApi.upload(token, this.proofFile) : of(null);
    proof$.pipe(
      switchMap(proof => this.portalApi.submitFee(token, { period: this.pay.period, amount, mode: this.pay.mode, reference: reference || null, proof, note: this.pay.note.trim() || null }, this.childCode)),
      switchMap(() => this.portalApi.fees(token, this.childCode))
    ).subscribe({
      next: fees => {
        this.portal.fees = fees; this.buildView(); this.payOpen = false; this.proofFile = undefined;
        this.toast.success(`Payment of ₹${amount.toLocaleString('en-IN')} submitted. The ${this.isSchool ? 'school' : 'institute'} office will verify it and send your receipt.`);
      },
      error: (error: Error) => this.payError = error.message
    });
  }
  submissionTone(status: string): 'success' | 'warning' | 'danger' { return status === 'Approved' ? 'success' : status === 'Rejected' ? 'danger' : 'warning'; }
  requestBook(book: LibraryBook): void {
    if (this.liveLibrary) {
      this.libraryApi.request(this.auth.token!, book).subscribe({
        next: () => this.toast.success(`Requested “${book.title}”. Collect it from the library once it is issued.`),
        error: (error: Error) => this.toast.info(error.message)
      });
      return;
    }
    const problem = this.demoLibrary.request(book, this.studentId, this.childName);
    if (problem) { this.toast.info(problem); return; }
    this.toast.success(`Requested “${book.title}”. Collect it from the library once it is issued.`);
  }
  /** Opens the receipt for a fee period: the latest payment's receipt number, with the period's total paid. */
  printReceipt(month: string, amount: number): void {
    if (!this.live) { this.printDemoReceipt(month, amount); return; }
    const fee = this.portal.fees?.fees.find(item => item.period === month);
    if (!fee?.lastPayment) { this.toast.info('No payment recorded for this period yet.'); return; }
    const data: ReceiptData = {
      receiptNo: fee.lastPayment.receiptNo, institution: this.instituteName, logo: this.content.customLogo,
      studentId: this.studentId, student: this.childName, month: fee.period, date: dayLabel(fee.lastPayment.date),
      mode: fee.lastPayment.mode, discount: fee.discount, paid: fee.paid, total: fee.totalFee, due: fee.due, status: fee.status
    };
    this.dialog.open(ReceiptPreviewComponent, { width: '450px', maxWidth: 'calc(100vw - 24px)', data });
  }
  /** Payments the office has approved count towards the fee rows (the rows are fresh on each visit). */
  private applyApprovedPayments(): void {
    this.feeSubmissions.forWorkspace(this.tenant.current.businessType).filter(item => item.studentId === this.studentId && item.status === 'Approved').forEach(item => {
      const fee = this.fees.find(row => row.month === item.period);
      if (!fee) return;
      fee.paid += item.amount; fee.due = Math.max(0, fee.amount - fee.paid); fee.status = fee.due ? 'Partial' : 'Paid'; fee.date = item.submittedOn; fee.mode = item.mode;
    });
  }
  showNotifications(): void { const unread = this.noticeCount; this.toast.info(unread ? `You have ${unread} new notice${unread === 1 ? '' : 's'}. Opening Notices.` : 'You are all caught up.'); this.go('notices'); }
}

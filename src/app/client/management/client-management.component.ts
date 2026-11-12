import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogService } from '../../core/confirmation-dialog.service';
import { MockDataService } from '../../core/mock-data.service';
import { RecordDialogComponent, RecordField } from './record-dialog.component';
import { TenantContextService } from '../../core/tenant-context.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { ToastService } from '../../core/toast.service';
import { AppValidators, normalizeMobile, validationMessage } from '../../core/app-validators';
import { COACHING_SUBJECTS, SCHOOL_CLASSES, SCHOOL_DEPARTMENTS, SCHOOL_DESIGNATIONS, SCHOOL_SECTIONS, SCHOOL_SUBJECTS, termsFor } from '../../core/workspace-terms';
import { ApiTeacher, ApiTeacherStatus, TeacherApiService, TeacherPayload } from '../../core/teacher-api.service';
import { ApiEnquiry, ApiEnquirySource, ApiEnquiryStatus, AdmissionApiService, EnquiryPayload } from '../../core/admission-api.service';
import { ApiCourse, ApiFeeFrequency, COACHING_FEE_FREQUENCIES, CourseApiService, CoursePayload, FEE_FREQUENCY_LABELS, SCHOOL_FEE_FREQUENCIES } from '../../core/course-api.service';
import { ApiBatch, ApiBatchDay, BATCH_DAYS, BatchApiService, BatchPayload } from '../../core/batch-api.service';
import { ApiResult, TestApiService } from '../../core/test-api.service';
import { AlbumPayload, ApiAlbum, ApiPost, ApiPostType, MediaApiService, PHOTO_ACCEPT, POST_TYPE_LABELS, PostPayload } from '../../core/media-api.service';
import { AlbumDialogComponent } from './album-dialog.component';
import { ApiNotice, ApiNoticeAudience, ApiNoticeType, NOTICE_AUDIENCE_LABELS, NOTICE_STATE_LABELS, NOTICE_TYPE_LABELS, NoticeApiService, NoticePayload } from '../../core/notice-api.service';
import { ApiMaterial, ApiMaterialFile, MATERIAL_ACCEPT, MATERIAL_TYPE_LABELS, MAX_MATERIAL_BYTES, MaterialApiService, MaterialPayload } from '../../core/material-api.service';
import { Observable, firstValueFrom, forkJoin, map } from 'rxjs';

interface FeatureConfig { title: string; description: string; singular: string; icon: string; fields: RecordField[]; action: string; }
type Row = any;
const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const TEACHER_STATUS_LABELS: Record<ApiTeacherStatus, string> = { active: 'Active', inactive: 'Inactive', pending: 'Pending', onLeave: 'On leave' };
const TEACHER_STATUS_VALUES: Record<string, ApiTeacherStatus> = { Active: 'active', Inactive: 'inactive', Pending: 'pending', 'On leave': 'onLeave' };
const ENQUIRY_STATUS_LABELS: Record<ApiEnquiryStatus, string> = { new: 'New', contacted: 'Contacted', interested: 'Interested', joined: 'Joined', rejected: 'Rejected' };
const ENQUIRY_SOURCE_LABELS: Record<ApiEnquirySource, string> = { website: 'Website', referral: 'Referral', instagram: 'Instagram', walkIn: 'Walk-in', phone: 'Phone' };
const invert = <T extends string>(labels: Record<T, string>) => Object.fromEntries(Object.entries(labels).map(([value, label]) => [label, value])) as Record<string, T>;
const ENQUIRY_STATUS_VALUES = invert(ENQUIRY_STATUS_LABELS);
const ENQUIRY_SOURCE_VALUES = invert(ENQUIRY_SOURCE_LABELS);
const FEE_FREQUENCY_VALUES = invert(FEE_FREQUENCY_LABELS);
const COURSE_ACCENTS = ['teal', 'blue', 'amber'];
const MATERIAL_TYPE_VALUES = invert(MATERIAL_TYPE_LABELS);
const WHOLE_COURSE = 'Whole course (all batches)';
const NOTICE_TYPE_VALUES = invert(NOTICE_TYPE_LABELS);
const NOTICE_AUDIENCE_VALUES = invert(NOTICE_AUDIENCE_LABELS);
const ALL_STUDENTS = 'All students';
const POST_TYPE_VALUES = invert(POST_TYPE_LABELS);
const ALBUM_ACCENTS = ['gallery-a', 'gallery-b', 'gallery-c', 'gallery-d'];
@Component({ selector: 'app-client-management', templateUrl: './client-management.component.html', styleUrls: ['./client-management.component.scss'] })
export class ClientManagementComponent implements OnInit {
  readonly options = {
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Accounts', 'Commerce'],
    courses: ['Class 12 Science', 'Class 11 Science', 'Class 10 Foundation', 'Class 12 Commerce'],
    batches: ['Physics · Morning', 'Chemistry · Evening', 'Mathematics · Morning', 'Foundation · Afternoon'],
    teachers: ['Priya Nair', 'Ankit Rao', 'Nisha Thomas', 'Dev Malhotra'],
    status: ['Active', 'Inactive'],
    publish: ['Published', 'Draft']
  };
  config!: FeatureConfig;
  isShop = false;
  readonly shopSocialData: Record<string, Row[]> = {
    posts: [
      { id: 101, title: 'New season, softer layers', description: 'Meet the easy pieces we have been reaching for. Thoughtful fabrics, relaxed shapes and colours made for everyday wear.', type: 'Image', date: '28 Sep 2026', status: 'Published', pinned: true, media: 'assets/images/top-products/03.png', views: 248 },
      { id: 102, title: 'A closer look at our linen edit', description: 'Lightweight, breathable and made to be worn on repeat. Find your favourite fit in store this week.', type: 'Image', date: '26 Sep 2026', status: 'Published', pinned: false, media: 'assets/images/top-products/01.png', views: 176 },
      { id: 103, title: 'Weekend store hours', description: 'We are here until 8 pm this Saturday. Drop by, try something on and say hello.', type: 'Announcement', date: '24 Sep 2026', status: 'Draft', pinned: false, media: '', views: 0 }
    ],
    gallery: [
      { id: 101, name: 'The new season edit', description: 'Soft layers and everyday favourites.', date: '28 Sep 2026', status: 'Published', media: 'assets/images/top-products/03.png', count: 12, accent: 'gallery-a' },
      { id: 102, name: 'Linen, in the sunshine', description: 'Natural textures, easy silhouettes.', date: '21 Sep 2026', status: 'Published', media: 'assets/images/top-products/01.png', count: 8, accent: 'gallery-b' },
      { id: 103, name: 'The little details', description: 'Accessories made for everyday.', date: '16 Sep 2026', status: 'Draft', media: 'assets/images/top-products/05.png', count: 6, accent: 'gallery-c' },
      { id: 104, name: 'A weekend in colour', description: 'A few favourites from the studio.', date: '08 Sep 2026', status: 'Published', media: 'assets/images/top-products/04.png', count: 10, accent: 'gallery-d' }
    ]
  };
  get brandName(): string { return this.isShop ? 'Atelier & Co.' : this.tenant.current.businessName; }
  get isSchool(): boolean { return !this.isShop && this.tenant.current.businessType === 'school'; }
  /** Classes offered by the school this session (Nursery – Class 12) with CBSE-style subjects and term fees. */
  readonly schoolClasses: Row[] = SCHOOL_CLASSES.map((name, index) => {
    const stage = index < 3 ? 0 : index < 8 ? 1 : index < 11 ? 2 : index < 13 ? 3 : 4;
    return { id: 30 + index, name, description: ['Play-based early learning, phonics, rhymes and number readiness.', 'Foundational literacy and numeracy with activity-based EVS.', 'Middle-school curriculum with periodic tests and project work.', 'Secondary classes focused on CBSE board readiness.', 'Senior secondary streams with practicals and board preparation.'][stage], duration: 'April – March', fee: `₹${(9000 + index * 1000).toLocaleString('en-IN')} / term`, subjects: ['English, Hindi, Number work, Art & Craft', 'English, Hindi, Mathematics, EVS', 'English, Hindi, Mathematics, Science, Social Science, Sanskrit', 'English, Hindi, Mathematics, Science, Social Science', 'English, Physics, Chemistry, Mathematics, Biology'][stage], status: 'Active', enrolled: [64, 92, 108, 116, 96][stage] + (index % 3) * 6, accent: ['teal', 'blue', 'amber'][index % 3] };
  });
  readonly schoolData: Record<string, Row[]> = {
    teachers: [
      { id: 41, name: 'Neha Iyer', qualification: 'M.Sc / M.A. / M.Com', employeeId: 'GPS-EMP-011', designation: 'PGT', department: 'Senior secondary', subjects: 'Physics, Mathematics', classes: 'Class 11 · Section A, Class 12 · Section A', phone: '98765 31001', email: 'neha.iyer@greenfieldpublic.edu.in', joining: '15 Jun 2018', status: 'Active', photo: 'NI', color: '#e7eefd' },
      { id: 42, name: 'Rahul Mehta', qualification: 'B.Ed', employeeId: 'GPS-EMP-017', designation: 'TGT', department: 'Secondary', subjects: 'English', classes: 'Class 9 · Section A, Class 10 · Section B', phone: '98765 31002', email: 'rahul.mehta@greenfieldpublic.edu.in', joining: '03 Jan 2020', status: 'Active', photo: 'RM', color: '#f2eafa' },
      { id: 43, name: 'Ananya Rao', qualification: 'B.Ed', employeeId: 'GPS-EMP-023', designation: 'Class teacher', department: 'Primary', subjects: 'EVS, Mathematics', classes: 'Class 3 · Section B, Class 4 · Section A', phone: '98765 31003', email: 'ananya.rao@greenfieldpublic.edu.in', joining: '21 Mar 2021', status: 'Active', photo: 'AR', color: '#fff0df' },
      { id: 44, name: 'Sunita Verma', qualification: 'D.El.Ed', employeeId: 'GPS-EMP-031', designation: 'Coordinator', department: 'Pre-primary', subjects: 'English, Art & Craft', classes: 'Nursery · Section A, LKG · Section A, UKG · Section A', phone: '98765 31004', email: 'sunita.verma@greenfieldpublic.edu.in', joining: '01 Apr 2019', status: 'On leave', photo: 'SV', color: '#e7eefb' }
    ],
    admissions: [
      { id: 41, name: 'Tanya Kapoor', parent: 'Ritika Kapoor', phone: '98100 31001', course: 'Class 1', previousSchool: 'Little Feet Playschool', source: 'Website', date: '28 Sep 2026', status: 'New', followup: 'Today · 4:00 pm' },
      { id: 42, name: 'Rishabh Nair', parent: 'Sanjay Nair', phone: '98100 31002', course: 'Class 6', previousSchool: 'Kendriya Vidyalaya, Hebbal', source: 'Referral', date: '27 Sep 2026', status: 'Contacted', followup: '29 Sep 2026' },
      { id: 43, name: 'Amara Das', parent: 'Maya Das', phone: '98100 31003', course: 'Nursery', previousSchool: '—', source: 'Walk-in', date: '26 Sep 2026', status: 'Interested', followup: '30 Sep 2026' },
      { id: 44, name: 'Kabir Sethi', parent: 'Harpreet Sethi', phone: '98100 31004', course: 'Class 11', previousSchool: 'Delhi Public School, Whitefield', source: 'Walk-in', date: '22 Sep 2026', status: 'Joined', followup: '—' }
    ],
    results: [
      { id: 41, student: 'Ishita Rao', course: 'Class 9', batch: 'Section A', exam: 'Unit Test 2', examDate: '18 Sep 2026', subject: 'Mathematics', marks: 44, total: 50, percentage: '88%', grade: 'A2', resultStatus: 'Published' },
      { id: 42, student: 'Aditya Menon', course: 'Class 10', batch: 'Section B', exam: 'Unit Test 2', examDate: '18 Sep 2026', subject: 'Science', marks: 41, total: 50, percentage: '82%', grade: 'A2', resultStatus: 'Published' },
      { id: 43, student: 'Sana Ahmed', course: 'Class 6', batch: 'Section A', exam: 'Unit Test 2', examDate: '17 Sep 2026', subject: 'English', marks: 38, total: 50, percentage: '76%', grade: 'B1', resultStatus: 'Draft' }
    ],
    notices: [
      { id: 41, title: 'Term 1 examinations begin October 12', type: 'Exam', description: 'The class-wise date sheet has been shared in the parent app and on the notice board.', date: '25 Sep 2026', expires: '15 Oct 2026', status: 'Published', pinned: true },
      { id: 42, title: 'Annual sports day registrations', type: 'General', description: 'Students of Classes 3–12 can register for track events with their class teacher.', date: '22 Sep 2026', expires: '04 Oct 2026', status: 'Published', pinned: false },
      { id: 43, title: 'Term 2 fee reminder', type: 'Fee Reminder', description: 'The Term 2 fee is due by October 10. Pay at the school office or online.', date: '20 Sep 2026', expires: '10 Oct 2026', status: 'Draft', pinned: false }
    ],
    materials: [
      { id: 41, title: 'Linear equations · Chapter notes', description: 'NCERT chapter notes with solved examples.', course: 'Class 9', batch: 'Section A', subject: 'Mathematics', type: 'PDF', file: 'linear-equations-notes.pdf', date: '26 Sep 2026', status: 'Published', size: '2.1 MB' },
      { id: 42, title: 'Light – reflection worksheet', description: 'Practice questions for the Term 1 exam.', course: 'Class 10', batch: 'Section B', subject: 'Science', type: 'Assignment', file: 'light-reflection-worksheet.pdf', date: '24 Sep 2026', status: 'Published', size: '950 KB' }
    ],
    posts: [
      { id: 41, title: 'Admissions open for 2027–28', description: 'Registrations for Nursery to Class 9 and Class 11 are now open. Visit the school office or apply online.', type: 'Announcement', date: '26 Sep 2026', status: 'Published', pinned: true, media: 'assets/images/gallery/01.png', views: 214 },
      { id: 42, title: 'Gold at the inter-school science olympiad', description: 'Congratulations to our Class 8 team for winning the regional science olympiad.', type: 'Image', date: '24 Sep 2026', status: 'Published', pinned: false, media: 'assets/images/gallery/02.png', views: 132 },
      { id: 43, title: 'Parent-teacher meeting this Saturday', description: 'Meet your child’s class teacher to discuss Term 1 progress.', type: 'Text', date: '22 Sep 2026', status: 'Draft', pinned: false, media: '', views: 0 }
    ],
    gallery: [
      { id: 41, name: 'School life', description: 'Everyday moments at Greenfield.', date: '18 Sep 2026', status: 'Published', media: 'assets/images/gallery/01.png', count: 18, accent: 'gallery-a' },
      { id: 42, name: 'Science exhibition 2026', description: 'Projects from Classes 6–10.', date: '12 Sep 2026', status: 'Published', media: 'assets/images/gallery/02.png', count: 24, accent: 'gallery-b' },
      { id: 43, name: 'Independence Day assembly', description: 'Celebrations across the school.', date: '15 Aug 2026', status: 'Draft', media: 'assets/images/gallery/03.png', count: 32, accent: 'gallery-c' },
      { id: 44, name: 'Classrooms & labs', description: 'Smart classrooms, library and labs.', date: '28 Aug 2026', status: 'Published', media: 'assets/images/gallery/cover-signup-bg.png', count: 12, accent: 'gallery-d' }
    ]
  };
  readonly coachingCourses: Row[] = Array.from({ length: 12 }, (_, index) => ({ id: 100 + index, name: `Class ${index + 1}${index === 9 ? ' Foundation' : index >= 10 ? ' Science' : ''}`, description: `Guided coaching and practice for students in Class ${index + 1}.`, duration: '10 months', fee: index >= 10 ? '₹4,500 / month' : '₹2,800 / month', subjects: index >= 10 ? 'Physics, Chemistry, Mathematics' : 'Mathematics, Science, English', status: 'Active', enrolled: 64 + index * 9, accent: ['teal', 'blue', 'amber'][index % 3] }));
  key = 'teachers'; search = ''; filter = ''; view = 'table'; page = 0; startDate: string | Date = ''; endDate: string | Date = '';
  detail?: Row;
  /** Teachers from crm-backend when signed in with a real Owner account; demo sessions keep the sample data. */
  apiTeachers?: Row[];
  /** Admission enquiries (including website form submissions) from crm-backend for a real Owner account. */
  apiAdmissions?: Row[];
  /** Coaching courses / school classes from crm-backend for a real Owner or Teacher account. */
  apiCourses?: Row[];
  /** Coaching batches from crm-backend; course and teacher names map to their codes for saving. */
  apiBatches?: Row[];
  /** Marks entered against tests (published and draft) from crm-backend. */
  apiResults?: Row[];
  /** Study materials from crm-backend; batch / section labels map to their codes for saving. */
  apiMaterials?: Row[];
  private batchCodes = new Map<string, string>();
  /** Notices from crm-backend. */
  apiNotices?: Row[];
  /** Posts and gallery albums from crm-backend. */
  apiPosts?: Row[];
  apiAlbums?: Row[];
  private courseCodes = new Map<string, string>();
  /** Add / edit teacher pick lists: subjects (standard + the owner's course subjects) and real courses or sections. */
  private teacherSubjectOptions: string[] = [];
  private teacherClassOptions: string[] = [];
  private teacherCodes = new Map<string, string>();
  loading = false;
  selectedDate = '2026-09-28'; selectedBatch = 'All batches'; selectedTeacher = 'All teachers'; attendanceView: 'daily'|'monthly' = 'daily';
  readonly featureData: Record<string, Row[]> = {
    teachers: [
      { id: 1, name: 'Priya Nair', qualification: 'M.Sc. Physics, B.Ed.', classes: 'Class 11, Class 12', experience: '8 years', subjects: 'Physics, Mathematics', phone: '98765 12001', email: 'priya.nair@northstar.edu', joining: '15 Jun 2022', status: 'Active', photo: 'PN', color: '#e7eefd' },
      { id: 2, name: 'Ankit Rao', qualification: 'M.Sc. Chemistry', classes: 'Class 11, Class 12', experience: '6 years', subjects: 'Chemistry', phone: '98765 12002', email: 'ankit.rao@northstar.edu', joining: '03 Jan 2023', status: 'Active', photo: 'AR', color: '#f2eafa' },
      { id: 3, name: 'Nisha Thomas', qualification: 'M.A. English, B.Ed.', classes: 'Class 6, Class 7, Class 8', experience: '11 years', subjects: 'English', phone: '98765 12003', email: 'nisha.thomas@northstar.edu', joining: '21 Mar 2020', status: 'Active', photo: 'NT', color: '#fff0df' },
      { id: 4, name: 'Dev Malhotra', qualification: 'M.Com, NET', classes: 'Class 11, Class 12', experience: '5 years', subjects: 'Accounts, Commerce', phone: '98765 12004', email: 'dev.m@northstar.edu', joining: '07 Aug 2024', status: 'Inactive', photo: 'DM', color: '#e7eefb' }
    ],
    courses: [
      { id: 1, name: 'Class 12 Science', description: 'Complete board preparation with weekly tests.', duration: '12 months', fee: '₹4,500 / month', subjects: 'Physics, Chemistry, Mathematics', status: 'Active', enrolled: 186, accent: 'teal' },
      { id: 2, name: 'Class 11 Science', description: 'Strong foundations for science stream students.', duration: '12 months', fee: '₹4,000 / month', subjects: 'Physics, Chemistry, Biology', status: 'Active', enrolled: 142, accent: 'blue' },
      { id: 3, name: 'Class 10 Foundation', description: 'Concept led learning and exam readiness.', duration: '10 months', fee: '₹3,200 / month', subjects: 'Mathematics, Biology, English', status: 'Active', enrolled: 98, accent: 'amber' }
    ],
    batches: [
      { id: 1, name: 'Physics · Morning', course: 'Class 12 Science', teacher: 'Priya Nair', start: '01 Apr 2026', end: '31 Mar 2027', timing: '7:00 – 8:30 am', days: 'Mon, Wed, Fri', room: 'Room 204', students: 36, status: 'Active' },
      { id: 2, name: 'Chemistry · Evening', course: 'Class 11 Science', teacher: 'Ankit Rao', start: '01 Apr 2026', end: '31 Mar 2027', timing: '4:00 – 5:30 pm', days: 'Tue, Thu, Sat', room: 'Lab 1', students: 32, status: 'Active' },
      { id: 3, name: 'Foundation · Afternoon', course: 'Class 10 Foundation', teacher: 'Nisha Thomas', start: '15 Jun 2026', end: '31 Mar 2027', timing: '2:00 – 3:30 pm', days: 'Mon – Fri', room: 'Room 101', students: 25, status: 'Active' }
    ],
    admissions: [
      { id: 1, name: 'Aditi Kulkarni', parent: 'Sameer Kulkarni', phone: '98100 21001', course: 'Class 12 Science', source: 'Website', date: '28 Sep 2026', status: 'New', followup: 'Today · 4:00 pm' },
      { id: 2, name: 'Vivaan Patel', parent: 'Rina Patel', phone: '98100 21002', course: 'Class 11 Science', source: 'Referral', date: '27 Sep 2026', status: 'Contacted', followup: '29 Sep 2026' },
      { id: 3, name: 'Anaya Bose', parent: 'Arindam Bose', phone: '98100 21003', course: 'Class 10 Foundation', source: 'Instagram', date: '26 Sep 2026', status: 'Interested', followup: '30 Sep 2026' },
      { id: 4, name: 'Ishaan Gupta', parent: 'Nitin Gupta', phone: '98100 21004', course: 'Class 12 Science', source: 'Walk-in', date: '24 Sep 2026', status: 'Joined', followup: '—' }
    ],
    posts: [
      { id: 1, title: 'New batch admissions are open', description: 'Our new academic batches are now enrolling. Join us for focused learning and a great start to the year.', type: 'Announcement', date: '26 Sep 2026', status: 'Published', pinned: true, media: 'assets/images/gallery/01.png', views: 124 },
      { id: 2, title: 'A proud moment for our students', description: 'Celebrating the hard work, curiosity and progress of our learners this month.', type: 'Image', date: '24 Sep 2026', status: 'Published', pinned: false, media: 'assets/images/gallery/02.png', views: 89 },
      { id: 3, title: 'Parent orientation this Friday', description: 'Meet the teachers and learn about our learning approach for the new term.', type: 'Text', date: '22 Sep 2026', status: 'Draft', pinned: false, media: '', views: 0 }
    ],
    gallery: [
      { id: 1, name: 'Campus life', description: 'Everyday moments at Northstar.', date: '18 Sep 2026', status: 'Published', media: 'assets/images/gallery/01.png', count: 18, accent: 'gallery-a' },
      { id: 2, name: 'Science fair 2026', description: 'Curiosity on full display.', date: '12 Sep 2026', status: 'Published', media: 'assets/images/gallery/02.png', count: 24, accent: 'gallery-b' },
      { id: 3, name: 'Annual day', description: 'A wonderful evening together.', date: '04 Sep 2026', status: 'Draft', media: 'assets/images/gallery/03.png', count: 32, accent: 'gallery-c' },
      { id: 4, name: 'Learning spaces', description: 'Our classrooms and labs.', date: '28 Aug 2026', status: 'Published', media: 'assets/images/gallery/cover-signup-bg.png', count: 12, accent: 'gallery-d' }
    ],
    notices: [
      { id: 1, title: 'Mid-term examinations begin October 12', type: 'Exam', description: 'The detailed timetable is available at reception and on the student portal.', date: '25 Sep 2026', expires: '15 Oct 2026', status: 'Published', pinned: true },
      { id: 2, title: 'Institute closed for Gandhi Jayanti', type: 'Holiday', description: 'All classes will resume on Saturday, October 3.', date: '22 Sep 2026', expires: '03 Oct 2026', status: 'Published', pinned: false },
      { id: 3, title: 'October fee reminder', type: 'Fee Reminder', description: 'Please complete the monthly fee payment by October 10.', date: '20 Sep 2026', expires: '10 Oct 2026', status: 'Draft', pinned: false }
    ],
    results: [
      { id: 1, student: 'Aarav Sharma', course: 'Class 12 Science', batch: 'Physics · Morning', exam: 'Unit Test 3', examDate: '18 Sep 2026', subject: 'Physics', marks: 88, total: 100, percentage: '88%', grade: 'A', resultStatus: 'Published' },
      { id: 2, student: 'Meera Kapoor', course: 'Class 11 Science', batch: 'Chemistry · Evening', exam: 'Unit Test 3', examDate: '18 Sep 2026', subject: 'Chemistry', marks: 76, total: 100, percentage: '76%', grade: 'B+', resultStatus: 'Draft' },
      { id: 3, student: 'Diya Iyer', course: 'Class 10 Foundation', batch: 'Foundation · Afternoon', exam: 'Unit Test 3', examDate: '17 Sep 2026', subject: 'Mathematics', marks: 94, total: 100, percentage: '94%', grade: 'A+', resultStatus: 'Published' }
    ],
    materials: [
      { id: 1, title: 'Motion and laws of motion', description: 'Chapter notes with worked examples.', course: 'Class 12 Science', batch: 'Physics · Morning', subject: 'Physics', type: 'PDF', file: 'motion-chapter-4.pdf', date: '26 Sep 2026', status: 'Published', size: '2.4 MB' },
      { id: 2, title: 'Organic chemistry practice set', description: 'Revision questions for the upcoming unit test.', course: 'Class 11 Science', batch: 'Chemistry · Evening', subject: 'Chemistry', type: 'Assignment', file: 'organic-practice.pdf', date: '24 Sep 2026', status: 'Published', size: '840 KB' },
      { id: 3, title: 'Calculus lesson recording', description: 'Class recording: introduction to derivatives.', course: 'Class 12 Science', batch: 'Mathematics · Morning', subject: 'Mathematics', type: 'Video', file: 'calculus-lesson.mp4', date: '21 Sep 2026', status: 'Draft', size: '18 min' }
    ]
  };
  readonly configMap: Record<string, FeatureConfig> = {
    teachers: { title: 'Teachers', description: 'Manage teacher profiles, subjects and teaching assignments.', singular: 'teacher', icon: 'school', action: 'Add teacher', fields: [{ key: 'name', label: 'Full name', required: true }, { key: 'qualification', label: 'Qualification', required: true }, { key: 'experience', label: 'Experience', hint: 'e.g. 5 years' }, { key: 'subjects', label: 'Subjects', type: 'tags', required: true }, { key: 'classes', label: 'Classes taught', type: 'tags', hint: 'e.g. Class 9, Class 10' }, { key: 'phone', label: 'Phone', type: 'phone', required: true }, { key: 'email', label: 'Email', type: 'email', required: true }, { key: 'joining', label: 'Joining date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true }] },
    courses: { title: 'Courses', description: 'Build and manage the courses offered by your institute.', singular: 'course', icon: 'menu_book', action: 'Add course', fields: [{ key: 'name', label: 'Course name', required: true }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'duration', label: 'Duration', required: true, hint: 'e.g. 12 months' }, { key: 'fee', label: 'Fee', required: true, hint: 'e.g. ₹4,500 / month' }, { key: 'subjects', label: 'Subjects', type: 'tags', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true }] },
    batches: { title: 'Batches', description: 'Plan class schedules, rooms and teacher assignments.', singular: 'batch', icon: 'groups', action: 'Create batch', fields: [{ key: 'name', label: 'Batch name', required: true }, { key: 'course', label: 'Course', type: 'select', options: ['Class 12 Science', 'Class 11 Science', 'Class 10 Foundation', 'Class 12 Commerce'], required: true }, { key: 'teacher', label: 'Teachers', type: 'multiselect', options: ['Priya Nair', 'Ankit Rao', 'Nisha Thomas', 'Dev Malhotra'], required: true }, { key: 'start', label: 'Start date', type: 'date', required: true }, { key: 'end', label: 'End date', type: 'date' }, { key: 'timing', label: 'Timing', required: true }, { key: 'days', label: 'Days', required: true }, { key: 'room', label: 'Room' }, { key: 'students', label: 'Student capacity', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true }] },
    admissions: { title: 'Admissions / Enquiries', description: 'Track prospective students from their first enquiry to admission.', singular: 'inquiry', icon: 'person_add_alt', action: 'Add inquiry', fields: [{ key: 'name', label: 'Student name', required: true }, { key: 'parent', label: 'Parent name', required: true }, { key: 'phone', label: 'Phone', type: 'phone', required: true }, { key: 'course', label: 'Course', type: 'select', options: ['Class 12 Science', 'Class 11 Science', 'Class 10 Foundation', 'Class 12 Commerce'] }, { key: 'source', label: 'Source', type: 'select', options: ['Website', 'Referral', 'Instagram', 'Walk-in', 'Phone'] }, { key: 'date', label: 'Inquiry date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['New', 'Contacted', 'Interested', 'Joined', 'Rejected'], required: true }, { key: 'followup', label: 'Follow-up', type: 'date' }] },
    posts: { title: 'Posts & updates', description: 'Share news, moments and announcements with your community.', singular: 'post', icon: 'campaign', action: 'Create post', fields: [{ key: 'title', label: 'Title', required: true }, { key: 'description', label: 'Description', type: 'textarea', required: true }, { key: 'type', label: 'Post type', type: 'select', options: ['Image', 'Video', 'Text', 'Announcement'], required: true }, { key: 'media', label: 'Upload image or video', type: 'file' }, { key: 'date', label: 'Publish date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] },
    gallery: { title: 'Gallery', description: 'Bring everyday moments together in albums of photos and videos.', singular: 'album', icon: 'photo_library', action: 'Create album', fields: [{ key: 'name', label: 'Album name', required: true }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'media', label: 'Cover image / media', type: 'file' }, { key: 'date', label: 'Date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] },
    notices: { title: 'Notices', description: 'Keep students and families up to date with important announcements.', singular: 'notice', icon: 'campaign', action: 'Add notice', fields: [{ key: 'title', label: 'Notice title', required: true }, { key: 'description', label: 'Notice details', type: 'textarea', required: true }, { key: 'type', label: 'Notice type', type: 'select', options: ['General', 'Holiday', 'Exam', 'Fee Reminder', 'New Batch', 'Important'], required: true }, { key: 'date', label: 'Publish date', type: 'date' }, { key: 'expires', label: 'Expiry date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] },
    results: { title: 'Results', description: 'Record and publish student exam performance.', singular: 'result', icon: 'assignment_turned_in', action: 'Add result', fields: [{ key: 'student', label: 'Students', type: 'multiselect', options: ['Aarav Sharma', 'Meera Kapoor', 'Diya Iyer', 'Rohan Verma'], required: true }, { key: 'course', label: 'Course', type: 'select', options: ['Class 12 Science', 'Class 11 Science', 'Class 10 Foundation'] }, { key: 'batch', label: 'Batch', type: 'select', options: ['Physics · Morning', 'Chemistry · Evening', 'Foundation · Afternoon'] }, { key: 'exam', label: 'Exam name', required: true }, { key: 'examDate', label: 'Exam date', type: 'date' }, { key: 'subject', label: 'Subject', type: 'select', options: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English'] }, { key: 'marks', label: 'Marks obtained', type: 'number', required: true }, { key: 'total', label: 'Maximum marks', type: 'number', required: true }, { key: 'grade', label: 'Grade' }, { key: 'resultStatus', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] },
    materials: { title: 'Study materials', description: 'Organize and share learning resources with your classes.', singular: 'material', icon: 'folder_open', action: 'Upload material', fields: [{ key: 'title', label: 'Title', required: true }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'course', label: 'Course', type: 'select', options: ['Class 12 Science', 'Class 11 Science', 'Class 10 Foundation'] }, { key: 'batch', label: 'Batch', type: 'select', options: ['Physics · Morning', 'Chemistry · Evening', 'Foundation · Afternoon'] }, { key: 'subject', label: 'Subject', type: 'select', options: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English'] }, { key: 'type', label: 'Material type', type: 'select', options: ['PDF', 'Notes', 'Assignment', 'Video', 'Question Paper'], required: true }, { key: 'file', label: 'File', type: 'file', required: true }, { key: 'date', label: 'Publish date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] }
  };
  constructor(private route: ActivatedRoute, public router: Router, private dialog: MatDialog, private confirm: ConfirmationDialogService, private mockData: MockDataService, private tenant: TenantContextService, public auth: MockAuthService, private toast: ToastService, private teacherApi: TeacherApiService, private admissionApi: AdmissionApiService, private courseApi: CourseApiService, private batchApi: BatchApiService, private testApi: TestApiService, private materialApi: MaterialApiService, private noticeApi: NoticeApiService, private mediaApi: MediaApiService) {}
  get isTeacher(): boolean { return this.auth.role === 'Teacher'; }
  get useTeacherApi(): boolean { return this.key === 'teachers' && !this.isShop && !!this.auth.token; }
  get useAdmissionApi(): boolean { return this.key === 'admissions' && !this.isShop && !!this.auth.token; }
  get useCourseApi(): boolean { return this.key === 'courses' && !this.isShop && !!this.auth.token; }
  get usePostApi(): boolean { return this.key === 'posts' && !this.isShop && !!this.auth.token; }
  get useGalleryApi(): boolean { return this.key === 'gallery' && !this.isShop && !!this.auth.token; }
  get useNoticeApi(): boolean { return this.key === 'notices' && !this.isShop && !!this.auth.token; }
  get useMaterialApi(): boolean { return this.key === 'materials' && !this.isShop && !!this.auth.token; }
  /** Live rows say whether this user may change them (teachers: their own batches); demo rows follow the role. */
  canManageRow(row: Row): boolean { return row.canManage ?? !this.isTeacher; }
  get useResultApi(): boolean { return this.key === 'results' && !this.isShop && !!this.auth.token; }
  get useBatchApi(): boolean { return this.key === 'batches' && !this.isShop && !!this.auth.token; }
  ngOnInit(): void {
    this.isShop = this.router.url.startsWith('/shop/');
    this.key = this.route.snapshot.url[1]?.path || this.route.snapshot.url[0]?.path || 'teachers';
    this.config = this.configMap[this.key] || this.configMap['teachers'];
    if (!this.isShop) this.configureWorkspaceFields();
    if (this.isShop && this.key === 'posts') this.config = { ...this.config, title: 'Posts', description: 'Share new arrivals, store news and styling ideas with your community.', singular: 'post', action: 'Create post' };
    if (this.isShop && this.key === 'gallery') this.config = { ...this.config, title: 'Gallery', description: 'Curate product photography and moments from your store.', singular: 'album', action: 'Create album' };
    if (this.router.url.endsWith('/add')) setTimeout(() => this.openRecord(), 0);
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (this.useTeacherApi) this.loadTeachers(id);
    else if (this.useAdmissionApi) this.loadAdmissions();
    else if (this.useCourseApi) this.loadCourses(id);
    else if (this.useBatchApi) this.loadBatches(id);
    else if (this.useResultApi) this.loadResults();
    else if (this.useMaterialApi) this.loadMaterials();
    else if (this.useNoticeApi) this.loadNotices();
    else if (this.usePostApi) this.loadPosts();
    else if (this.useGalleryApi) this.loadAlbums();
    else if (id) this.detail = this.rows.find(row => row.id === id);
    if (!this.isShop && this.auth.token && !this.useBatchApi && this.config.fields.some(field => field.key === 'course')) this.loadCourseOptions();
    if (!this.isShop && this.auth.token && this.config.fields.some(field => field.key === 'batch')) this.loadBatchOptions();
  }
  get rows(): Row[] { if (this.key === 'teachers' && this.apiTeachers) return this.apiTeachers; if (this.key === 'admissions' && this.apiAdmissions) return this.apiAdmissions; if (this.key === 'courses' && this.apiCourses) return this.apiCourses; if (this.key === 'batches' && this.apiBatches) return this.apiBatches; if (this.key === 'results' && this.apiResults) return this.apiResults; if (this.key === 'materials' && this.apiMaterials) return this.apiMaterials; if (this.key === 'notices' && this.apiNotices) return this.apiNotices; if (this.key === 'posts' && this.apiPosts) return this.apiPosts; if (this.key === 'gallery' && this.apiAlbums) return this.apiAlbums; if (this.key === 'courses' && !this.isShop) return this.isSchool ? this.schoolClasses : this.coachingCourses; if (this.isSchool && this.schoolData[this.key]) return this.schoolData[this.key]; return this.isShop && this.shopSocialData[this.key] ? this.shopSocialData[this.key] : this.featureData[this.key] || []; }
  get filtered(): Row[] {
    const query = this.search.trim().toLowerCase();
    return this.rows.filter(row => (!query || Object.values(row).join(' ').toLowerCase().includes(query)) && (!this.filter || String(row.status || '').toLowerCase() === this.filter.toLowerCase() || String(row.resultStatus || '').toLowerCase() === this.filter.toLowerCase() || String(row.type || '').toLowerCase() === this.filter.toLowerCase() || String(row.subjects || '').toLowerCase().includes(this.filter.toLowerCase()) || String(row.department || '').toLowerCase() === this.filter.toLowerCase()) && this.inDateRange(row.date || row.joining || row.examDate));
  }
  openRecord(row?: Row, draft?: Row): void {
    if (this.isTeacher && !['results', 'materials', 'notices', 'posts', 'gallery'].includes(this.key)) return;
    if (this.isTeacher && ['posts', 'gallery'].includes(this.key) && (!this.auth.token || (row && !row.canManage))) return;
    if (this.isTeacher && this.key === 'notices' && (!this.useNoticeApi || (row && !row.canManage))) return;
    if (this.isTeacher && this.key === 'notices' && !row && !this.batchCodes.size) { this.toast.warning('You can post notices once you are assigned a batch.'); return; }
    // Results come from marks entered against a test or exam.
    if (this.useResultApi) { this.toast.info(`Results come from ${this.isSchool ? 'exams' : 'tests'}: open one and choose “Enter marks”.`); this.router.navigate([this.testsRoute]); return; }
    if (this.useMaterialApi && !this.courseCodes.size) { this.toast.warning(`Add a ${this.isSchool ? 'class' : 'course'} first, then add its study materials.`); return; }
    if (this.useBatchApi && !this.courseCodes.size) { this.toast.warning(`Add a ${this.isSchool ? 'class' : 'course'} first, then create its batches.`); this.router.navigate(['/client/courses']); return; }
    const record = draft || (row ? { ...row, ...(row.phone ? { phone: normalizeMobile(String(row.phone)) } : {}) } : undefined);
    const ref = this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: `${row ? 'Edit' : 'Add'} ${this.config.singular}`, submitLabel: row ? 'Save changes' : this.config.action, fields: this.dialogFields(row), record, successMessage: '' } });
    ref.afterClosed().subscribe(async value => {
      if (!value) { if (this.router.url.endsWith('/add')) this.router.navigate([`${this.isShop ? '/shop' : '/client'}/${this.key}`]); return; }
      // Cross-field checks the shared dialog can't express: reopen with the entered values so nothing is lost.
      const problem = this.recordProblem(value) || (this.usePostApi ? '' : await this.mediaProblem(value.media, true)) || (this.useMaterialApi ? '' : await this.mediaProblem(value.file, false));
      // (Posts: the photo is resized and checked against 5 MB when it is uploaded.)
      if (problem) { this.toast.error(problem); this.openRecord(row, value); return; }
      if (this.useTeacherApi) { this.saveTeacher(value, row); return; }
      if (this.useAdmissionApi) { this.saveAdmission(value, row); return; }
      if (this.useCourseApi) { this.saveCourse(value, row); return; }
      if (this.useBatchApi) { this.saveBatch(value, row); return; }
      if (this.useMaterialApi) { this.saveMaterial(value, row); return; }
      if (this.useNoticeApi) { this.saveNotice(value, row); return; }
      if (this.usePostApi) { this.savePost(value, row); return; }
      if (this.useGalleryApi) { this.saveAlbum(value, row); return; }
      this.config.fields.forEach(field => { if (field.type === 'date' && value[field.key] instanceof Date) value[field.key] = (value[field.key] as Date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); });
      const normalized: Row = { ...value, id: row?.id || Date.now() };
      if (normalized.phone) normalized.phone = normalizeMobile(String(normalized.phone));
      if (this.isSchool && this.key === 'admissions') { normalized.date ||= new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); normalized.previousSchool ||= '—'; normalized.followup ||= '—'; }
      if (this.key === 'results' && normalized.marks !== undefined && normalized.total) { normalized.percentage = `${Math.round(Number(normalized.marks) / Number(normalized.total) * 100)}%`; normalized.resultStatus = normalized.resultStatus || 'Draft'; }
      if (this.key === 'teachers') { normalized.photo ||= (normalized.name || '?').split(' ').map((word: string) => word[0]).join('').slice(0, 2).toUpperCase(); normalized.color ||= '#e7eefd'; }
      if (this.key === 'results') { this.saveResults(normalized, row); return; }
      if (row) Object.assign(row, normalized); else this.rows.unshift(normalized);
      this.toast.success(this.key === 'results' ? `Result for ${normalized.student} ${row ? 'updated' : 'added'}.` : `${this.singularLabel} “${normalized.name || normalized.title}” ${row ? 'updated' : 'added'}.`);
      if (this.router.url.endsWith('/add')) this.router.navigate([`${this.isShop ? '/shop' : '/client'}/${this.key}`]);
    });
  }
  /** A result belongs to one student, so picking several students adds one result per student with the same exam details. */
  private saveResults(value: Row, row?: Row): void {
    const students = String(value.student || '').split(',').map(name => name.trim()).filter(Boolean);
    const [first, ...others] = students;
    if (row) Object.assign(row, { ...value, student: first }); else this.rows.unshift({ ...value, student: first });
    others.forEach((student, index) => this.rows.unshift({ ...value, student, id: Date.now() + index + 1 }));
    this.toast.success(students.length > 1 ? `Results ${row ? 'saved' : 'added'} for ${students.length} students.` : `Result for ${first} ${row ? 'updated' : 'added'}.`);
    if (this.router.url.endsWith('/add')) this.router.navigate(['/client/results']);
  }
  get singularLabel(): string { return this.config.singular.charAt(0).toUpperCase() + this.config.singular.slice(1); }
  private recordProblem(value: Row): string {
    const time = (v: unknown): number => v instanceof Date ? v.getTime() : v ? new Date(String(v)).getTime() : NaN;
    const nameCheck = (key: string, label: string): string => value[key] ? validationMessage(new FormControl(value[key], AppValidators.personName), label) : '';
    if (this.key === 'results') { const marks = Number(value.marks), total = Number(value.total); if (!(total > 0)) return 'Maximum marks must be greater than 0.'; if (marks < 0 || marks > total) return `Marks obtained must be between 0 and ${total}.`; }
    if (this.key === 'teachers' && value.experience && !/^\d+(\.\d+)?\b/.test(String(value.experience).trim())) return 'Enter experience in years, e.g. 5 years.';
    if (this.key === 'batches' && time(value.end) < time(value.start)) return 'End date must be on or after the start date.';
    if (this.key === 'notices' && time(value.expires) < time(value.date)) return 'Expiry date must be on or after the publish date.';
    if (this.key === 'admissions') return nameCheck('name', 'Student name') || (this.isSchool ? nameCheck('parent', 'Parent name') : '');
    return '';
  }
  /** Images/videos picked in the dialog arrive as blob: URLs; anything else is a plain file name. */
  private async mediaProblem(value: unknown, mediaOnly: boolean): Promise<string> {
    const src = String(value || ''); if (!src) return '';
    if (!src.startsWith('blob:')) return mediaOnly && !/^(assets\/|https?:|data:)/.test(src) ? 'Please choose an image or video file.' : '';
    try { const blob = await (await fetch(src)).blob(); return blob.size > MAX_MEDIA_BYTES ? 'File must be 10 MB or smaller.' : ''; } catch { return ''; }
  }
  viewRow(row: Row): void { this.dialog.open(RecordDialogComponent, { width: '660px', maxWidth: 'calc(100vw - 24px)', data: { title: `${this.singularLabel} details`, submitLabel: 'Done', fields: this.useAdmissionApi ? this.admissionFields(row) : this.useCourseApi ? this.courseFields() : this.useBatchApi ? this.batchFields() : this.useMaterialApi ? this.materialFields() : this.useNoticeApi ? this.noticeFields() : this.usePostApi ? this.postFields() : this.useGalleryApi ? this.albumFields() : this.config.fields, record: row, readonly: true } }); }
  followUp(row: Row): void { if (this.isTeacher) return; if (this.useAdmissionApi) { this.followUpApi(row); return; } const ref = this.dialog.open(RecordDialogComponent, { width: '560px', maxWidth: 'calc(100vw - 24px)', data: { title: `Schedule follow-up · ${row.name}`, submitLabel: 'Save follow-up', fields: [{ key: 'followup', label: 'Follow-up date and time', type: 'text', required: true }, { key: 'notes', label: 'Follow-up notes', type: 'textarea' }], record: { followup: row.followup }, successMessage: `Follow-up saved for ${row.name}.` } }); ref.afterClosed().subscribe(value => { if (value) row.followup = value.followup; }); }
  download(row: Row): void { if (row.url) { window.open(row.url, '_blank', 'noopener'); return; } const blob = new Blob([`Demo study material: ${row.title}\n${row.description || ''}\nFile reference: ${row.file || ''}`], { type: 'text/plain' }); const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = (row.file || `${row.title}.txt`).split('/').pop(); anchor.click(); URL.revokeObjectURL(anchor.href); this.toast.success(`Downloading “${row.title}”.`); }
  preview(media: string): void { if (media) window.open(media, '_blank', 'noopener'); }
  uploadMedia(row: Row): void { if (this.useGalleryApi) { this.openAlbum(row); return; } if (this.isTeacher) return; const ref = this.dialog.open(RecordDialogComponent, { width: '560px', maxWidth: 'calc(100vw - 24px)', data: { title: `Upload media · ${row.name}`, submitLabel: 'Add to album', fields: [{ key: 'media', label: 'Photo or video file', type: 'file', required: true, hint: 'Images or videos up to 10 MB' }], successMessage: '' } }); ref.afterClosed().subscribe(async value => { if (!value?.media) return; const problem = await this.mediaProblem(value.media, true); if (problem) { this.toast.error(problem); return; } row.media = value.media; row.count = (Number(row.count) || 0) + 1; this.toast.success(`Media added to “${row.name}”.`); }); }
  private inDateRange(value: string): boolean { if (!value || (!this.startDate && !this.endDate)) return true; const date = new Date(value); const from = this.startDate ? new Date(this.startDate instanceof Date ? this.startDate.getTime() : this.startDate) : undefined; const to = this.endDate ? new Date(this.endDate instanceof Date ? this.endDate.getTime() : this.endDate) : undefined; return !Number.isNaN(date.getTime()) && (!from || date >= from) && (!to || date <= to); }
  remove(row: Row): void { if (this.isTeacher) return; this.confirm.confirm({ title: `Delete ${this.config.singular}?`, message: `Delete “${row.name || row.title || row.student}” from this workspace? ${this.useTeacherApi ? 'Their sign-in account is closed too. This action' : this.useAdmissionApi || this.useCourseApi || this.useBatchApi || this.useMaterialApi || this.useNoticeApi || this.usePostApi || this.useGalleryApi ? 'This action' : 'This mock action'} cannot be undone.`, confirmLabel: `Delete ${this.config.singular}`, destructive: true }).subscribe(ok => { if (ok && this.useTeacherApi) { this.deleteTeacher(row); return; } if (ok && this.useAdmissionApi) { this.deleteAdmission(row); return; } if (ok && this.useCourseApi) { this.deleteCourse(row); return; } if (ok && this.useBatchApi) { this.deleteBatch(row); return; } if (ok && this.useMaterialApi) { this.deleteMaterial(row); return; } if (ok && this.useNoticeApi) { this.deleteNotice(row); return; } if (ok && (this.usePostApi || this.useGalleryApi)) { this.deleteMedia(row); return; } if (ok) { const collection = this.rows; const index = collection.indexOf(row); if (index >= 0) collection.splice(index, 1); this.toast.success(`${this.singularLabel} “${row.name || row.title || row.student}” deleted.`); } }); }
  toggleStatus(row: Row): void { if (this.usePostApi) { this.updatePost(row, { status: row.status === 'Draft' ? 'published' : 'draft' }, row.status === 'Draft' ? `“${row.title}” published.` : `“${row.title}” moved to drafts.`); return; } if (this.useGalleryApi) { this.updateAlbum(row, { status: row.status === 'Draft' ? 'published' : 'draft' }, row.status === 'Draft' ? `“${row.name}” published.` : `“${row.name}” moved to drafts.`); return; } if (this.useNoticeApi) { this.updateNotice(row, { status: row.status === 'Draft' ? 'published' : 'draft' }, row.status === 'Draft' ? `“${row.title}” published.` : `“${row.title}” moved to drafts.`); return; } if (this.isTeacher) return; if (this.useCourseApi) { this.toggleCourseStatus(row); return; } if (this.useBatchApi) { this.toggleBatchStatus(row); return; } if (this.useMaterialApi) { this.toggleMaterialStatus(row); return; } if (row.status || !row.resultStatus) row.status = row.status === 'Published' ? 'Draft' : row.status === 'Draft' ? 'Published' : row.status === 'Active' ? 'Inactive' : 'Active'; if (row.resultStatus) row.resultStatus = row.resultStatus === 'Published' ? 'Draft' : 'Published'; const state = row.resultStatus || row.status; this.toast.success(`“${row.name || row.title || row.student}” ${state === 'Published' ? 'published' : state === 'Draft' ? 'moved to drafts' : `marked ${String(state).toLowerCase()}`}.`); }
  togglePin(row: Row): void { if (this.usePostApi) { if (!row.canManage) return; this.updatePost(row, { pinned: !row.pinned }, row.pinned ? `“${row.title}” unpinned.` : `“${row.title}” pinned to the top.`); return; } if (this.useNoticeApi) { this.updateNotice(row, { pinned: !row.pinned }, row.pinned ? `“${row.title}” unpinned.` : `“${row.title}” pinned to the top.`); return; } if (this.isTeacher) return; row.pinned = !row.pinned; this.toast.success(row.pinned ? `“${row.title || row.name}” pinned to the top.` : `“${row.title || row.name}” unpinned.`); }
  convert(row: Row): void { if (this.useAdmissionApi) { this.convertApi(row); return; } this.confirm.confirm({ title: 'Convert inquiry to student?', message: `Create a student record for ${row.name}? This will add a mock student to the directory.`, confirmLabel: 'Convert to student' }).subscribe(ok => { if (ok) { row.status = 'Joined'; const student = this.mockData.addStudent({ name: row.name, father: row.parent || '', mother: '', phone: normalizeMobile(String(row.phone || '')), email: '', course: row.course, batch: this.isSchool ? 'Section A' : row.course.includes('12') ? 'Physics · Morning' : 'Chemistry · Evening', admission: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), dob: '', gender: '', address: '', city: '', state: '', pincode: '', monthlyFee: 0, discount: 0, feeStatus: 'Pending' }); this.toast.success(`${row.name} added to students.`); this.router.navigate(['/client/students', student.id]); } }); }
  addChild(): void { this.openRecord(); }
  initials(name: string): string { return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
  get filters(): string[] { if (this.key === 'teachers') return this.isSchool ? SCHOOL_DEPARTMENTS : this.options.subjects; if (this.key === 'admissions') return ['New', 'Contacted', 'Interested', 'Joined', 'Rejected']; if (this.key === 'posts') return ['Image', 'Video', 'Text', 'Announcement', 'Published', 'Draft']; if (this.key === 'notices') return ['General', 'Holiday', 'Exam', 'Fee Reminder', this.isSchool ? 'PTM' : 'New Batch', 'Important', 'Published', ...(this.apiNotices ? ['Scheduled', 'Expired'] : []), 'Draft']; if (this.key === 'materials') return ['PDF', 'Notes', 'Assignment', 'Video', 'Question Paper', 'Published', 'Draft']; if (this.key === 'gallery') return ['Published', 'Draft']; if (this.key === 'results') return ['Published', 'Draft']; return ['Active', 'Inactive']; }
  get filterLabel(): string { return this.key === 'teachers' ? (this.isSchool ? 'Department' : 'Subject') : this.key === 'admissions' ? (this.isSchool ? 'Admission status' : 'Enquiry status') : ['posts','notices','materials'].includes(this.key) ? 'Type / status' : 'Status'; }
  get cardMode(): boolean { return ['courses', 'posts', 'gallery', 'materials'].includes(this.key); }
  get statusTone(): 'success'|'warning'|'danger'|'neutral'|'info' { return 'success'; }
  trackById(_: number, row: Row): number { return row.id; }
  private loadTeachers(id: number): void {
    this.loading = true;
    this.teacherApi.list(this.auth.token!).subscribe({
      next: teachers => {
        this.loading = false;
        this.apiTeachers = teachers.map(teacher => this.teacherRow(teacher));
        if (id) this.detail = this.apiTeachers.find(row => row.id === id);
      },
      error: (error: Error) => { this.loading = false; this.apiTeachers = []; this.toast.error(error.message); }
    });
    // Pick lists for the form; on error the form keeps free-text entry.
    forkJoin({ courses: this.courseApi.list(this.auth.token!), batches: this.batchApi.list(this.auth.token!, { status: 'active' }) }).subscribe({
      next: ({ courses, batches }) => {
        const active = courses.filter(course => course.status === 'active');
        this.teacherSubjectOptions = [...new Set([...(this.isSchool ? SCHOOL_SUBJECTS : COACHING_SUBJECTS), ...active.flatMap(course => course.subjects)])];
        this.teacherClassOptions = this.isSchool ? batches.map(batch => BatchApiService.label(batch)) : active.map(course => course.name);
      },
      error: () => { /* keep free-text subjects / classes */ }
    });
  }
  /** The backend assigns the employee ID, and a new teacher needs a password to sign in with. */
  private dialogFields(row?: Row): RecordField[] {
    if (this.useAdmissionApi) return this.admissionFields(row);
    if (this.useCourseApi) return this.courseFields();
    if (this.useBatchApi) return this.batchFields();
    if (this.useMaterialApi) return this.materialFields();
    if (this.useNoticeApi) return this.noticeFields();
    if (this.usePostApi) return this.postFields();
    if (this.useGalleryApi) return this.albumFields();
    if (!this.useTeacherApi) return this.config.fields;
    // Subjects and classes are picked from lists so names match exactly (school subject teachers enter marks by subject).
    const keep = (key: string, options: string[]): string[] => [...new Set([...options, ...String(row?.[key] || '').split(',').map((item: string) => item.trim()).filter(Boolean)])];
    const fields = this.config.fields.filter(field => field.key !== 'employeeId').map<RecordField>(field =>
      field.key === 'subjects' && this.teacherSubjectOptions.length ? { ...field, type: 'multiselect', options: keep('subjects', this.teacherSubjectOptions), hint: undefined }
      : field.key === 'classes' && this.teacherClassOptions.length ? { ...field, label: this.isSchool ? 'Classes / sections taught' : 'Courses taught', type: 'multiselect', options: keep('classes', this.teacherClassOptions), hint: undefined }
      : field);
    if (row) return fields;
    const after = fields.findIndex(field => field.key === 'email') + 1;
    return [...fields.slice(0, after), { key: 'password', label: 'Login password', type: 'password', required: true, hint: 'The teacher signs in with their email or phone and this password.' }, ...fields.slice(after)];
  }
  private saveTeacher(value: Row, row?: Row): void {
    const token = this.auth.token!;
    const payload = this.teacherPayload(value);
    const request: Observable<ApiTeacher> = row
      ? this.teacherApi.update(token, row.code, payload)
      : this.teacherApi.create(token, { ...payload, password: String(value.password || '') }).pipe(map(result => result.teacher));
    request.subscribe({
      next: teacher => {
        const saved = this.teacherRow(teacher);
        if (row) Object.assign(row, saved); else this.apiTeachers?.unshift(saved);
        this.toast.success(`${this.singularLabel} “${saved.name}” ${row ? 'updated' : 'added'}.`);
        if (this.router.url.endsWith('/add')) this.router.navigate(['/client/teachers']);
      },
      // Reopen with the entered values so nothing is lost.
      error: (error: Error) => { this.toast.error(error.message); this.openRecord(row, value); }
    });
  }
  private deleteTeacher(row: Row): void {
    this.teacherApi.remove(this.auth.token!, row.code).subscribe({
      next: () => {
        this.apiTeachers = this.apiTeachers?.filter(item => item !== row);
        this.toast.success(`${this.singularLabel} “${row.name}” deleted.`);
        if (this.detail === row) this.router.navigate(['/client/teachers']);
      },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  private teacherPayload(value: Row): TeacherPayload {
    const list = (text: unknown): string[] => String(text || '').split(',').map(item => item.trim()).filter(Boolean);
    const info = { qualification: list(value.qualification), subjects: list(value.subjects), classesTaught: list(value.classes) };
    const years = parseFloat(String(value.experience || ''));
    return {
      fullName: String(value.name || '').trim(),
      email: String(value.email || '').trim().toLowerCase(),
      countryCode: '+91',
      phoneNumber: normalizeMobile(String(value.phone || '')),
      joiningDate: ClientManagementComponent.isoDate(value.joining),
      status: TEACHER_STATUS_VALUES[value.status] || 'active',
      ...(this.isSchool
        ? { schoolInfo: { ...info, designation: value.designation || null, department: value.department || null } }
        : { coachingInfo: { ...info, experience: Number.isFinite(years) ? years : null } })
    };
  }
  /** Maps an API teacher to the row shape the table, cards and dialog already use. `id` is the 6-digit teacher code. */
  private teacherRow(teacher: ApiTeacher): Row {
    const info = (teacher.workType === 'school' ? teacher.schoolInfo : teacher.coachingInfo) ?? { qualification: [], subjects: [], classesTaught: [] };
    const name = teacher.fullName || '';
    const years = teacher.coachingInfo?.experience;
    const joining = teacher.joiningDate ? new Date(teacher.joiningDate) : null;
    return {
      id: Number(teacher.teacherCode),
      code: teacher.teacherCode,
      name,
      employeeId: teacher.schoolInfo?.employeeId || teacher.teacherCode,
      designation: teacher.schoolInfo?.designation || '',
      department: teacher.schoolInfo?.department || '',
      qualification: info.qualification.join(', '),
      subjects: info.subjects.join(', '),
      classes: info.classesTaught.join(', '),
      experience: years !== null && years !== undefined ? `${years} year${years === 1 ? '' : 's'}` : '',
      phone: teacher.phoneNumber || '',
      email: teacher.email || '',
      joining: joining && !Number.isNaN(joining.getTime()) ? joining.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      status: TEACHER_STATUS_LABELS[teacher.status] || 'Active',
      photo: this.initials(name) || '?',
      color: '#e7eefd'
    };
  }
  /** Open enquiries with a follow-up date set, and enquiries marked Joined this month (API data only). */
  get admissionFollowUps(): number { return (this.apiAdmissions || []).filter(row => row.followup && !['Joined', 'Rejected'].includes(row.status)).length; }
  get admissionsJoinedThisMonth(): number { const now = new Date(); return (this.apiAdmissions || []).filter(row => row.status === 'Joined' && row.updatedAt && new Date(row.updatedAt).getMonth() === now.getMonth() && new Date(row.updatedAt).getFullYear() === now.getFullYear()).length; }
  private loadAdmissions(): void {
    this.loading = true;
    this.admissionApi.list(this.auth.token!).subscribe({
      next: enquiries => { this.loading = false; this.apiAdmissions = enquiries.map(enquiry => this.admissionRow(enquiry)); },
      error: (error: Error) => { this.loading = false; this.apiAdmissions = []; this.toast.error(error.message); }
    });
  }
  /** Website enquiries can name a class that is not in the dialog's list, so keep it selectable; the visitor's question shows as notes. */
  private admissionFields(row?: Row): RecordField[] {
    const fields = this.config.fields.map(field => field.key === 'course' && row?.course && !field.options?.includes(row.course) ? { ...field, options: [row.course, ...(field.options || [])] } : field);
    return [...fields, { key: 'message', label: 'Message / notes', type: 'textarea' }];
  }
  private saveAdmission(value: Row, row?: Row): void {
    const token = this.auth.token!;
    const payload = this.admissionPayload(value);
    const request = row ? this.admissionApi.update(token, row.code, payload) : this.admissionApi.create(token, payload);
    request.subscribe({
      next: enquiry => {
        const saved = this.admissionRow(enquiry);
        if (row) Object.assign(row, saved); else this.apiAdmissions?.unshift(saved);
        this.toast.success(`${this.singularLabel} for “${saved.name}” ${row ? 'updated' : 'added'}.`);
        if (this.router.url.endsWith('/add')) this.router.navigate(['/client/admissions']);
      },
      // Reopen with the entered values so nothing is lost.
      error: (error: Error) => { this.toast.error(error.message); this.openRecord(row, value); }
    });
  }
  private updateAdmission(row: Row, payload: EnquiryPayload, message: string, then?: () => void): void {
    this.admissionApi.update(this.auth.token!, row.code, payload).subscribe({
      next: enquiry => { Object.assign(row, this.admissionRow(enquiry)); this.toast.success(message); then?.(); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  private followUpApi(row: Row): void {
    const ref = this.dialog.open(RecordDialogComponent, { width: '560px', maxWidth: 'calc(100vw - 24px)', data: { title: `Schedule follow-up · ${row.name}`, submitLabel: 'Save follow-up', fields: [{ key: 'followup', label: 'Follow-up date', type: 'date', required: true }], record: { followup: row.followup }, successMessage: '' } });
    ref.afterClosed().subscribe(value => { if (value) this.updateAdmission(row, { followUpDate: ClientManagementComponent.isoDate(value.followup) }, `Follow-up saved for ${row.name}.`); });
  }
  /** Marks the enquiry Joined, then opens the student form; the student's sign-in account is created there. */
  private convertApi(row: Row): void {
    this.confirm.confirm({ title: 'Convert enquiry to student?', message: `Mark ${row.name}'s enquiry as Joined and open the new student form?`, confirmLabel: 'Convert to student' }).subscribe(ok => {
      if (ok) this.updateAdmission(row, { status: 'joined' }, `${row.name} marked as joined. Add their student details next.`, () => this.router.navigate(['/client/students/add']));
    });
  }
  private deleteAdmission(row: Row): void {
    this.admissionApi.remove(this.auth.token!, row.code).subscribe({
      next: () => { this.apiAdmissions = this.apiAdmissions?.filter(item => item !== row); this.toast.success(`${this.singularLabel} for “${row.name}” deleted.`); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  /** Only fields present in this workspace's dialog are sent, so editing a school enquiry never clears its source or dates. */
  private admissionPayload(value: Row): EnquiryPayload {
    const text = (v: unknown): string | null => String(v ?? '').trim() || null;
    const payload: EnquiryPayload = { studentName: String(value.name || '').trim(), parentName: text(value.parent), countryCode: '+91', phoneNumber: normalizeMobile(String(value.phone || '')), className: text(value.course), message: text(value.message) };
    if ('previousSchool' in value) payload.previousSchool = text(value.previousSchool);
    if ('source' in value && ENQUIRY_SOURCE_VALUES[value.source]) payload.source = ENQUIRY_SOURCE_VALUES[value.source];
    if ('status' in value) payload.status = ENQUIRY_STATUS_VALUES[value.status] || 'new';
    if ('date' in value && value.date) payload.enquiryDate = ClientManagementComponent.isoDate(value.date);
    if ('followup' in value) payload.followUpDate = ClientManagementComponent.isoDate(value.followup);
    return payload;
  }
  /** Maps an API enquiry to the row shape the table and dialog already use. `id` is the 6-digit enquiry code. */
  private admissionRow(enquiry: ApiEnquiry): Row {
    const day = (value: string | null): string => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''; };
    return {
      id: Number(enquiry.enquiryCode),
      code: enquiry.enquiryCode,
      name: enquiry.studentName,
      parent: enquiry.parentName || '',
      phone: enquiry.phoneNumber,
      course: enquiry.className || '',
      previousSchool: enquiry.previousSchool || '',
      source: ENQUIRY_SOURCE_LABELS[enquiry.source] || 'Website',
      date: day(enquiry.enquiryDate),
      status: ENQUIRY_STATUS_LABELS[enquiry.status] || 'New',
      followup: day(enquiry.followUpDate),
      message: enquiry.message || '',
      updatedAt: (enquiry as ApiEnquiry & { updatedAt?: string }).updatedAt
    };
  }
  /** Local calendar date as YYYY-MM-DD (toISOString would shift it a day back in IST). */
  private static isoDate(value: unknown): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  /** Active courses from the API, totals for the summary cards (sample numbers in demo sessions). */
  get activeCourseOrBatchCount(): number { return this.rows.filter(row => row.status === 'Active').length; }
  get enrolledTotal(): string { return this.apiCourses ? this.apiCourses.reduce((sum, row) => sum + (Number(row.enrolled) || 0), 0).toLocaleString('en-IN') : this.isSchool ? '1,486' : '426'; }
  private loadCourses(id: number): void {
    this.loading = true;
    this.courseApi.list(this.auth.token!).subscribe({
      next: courses => {
        this.loading = false;
        this.apiCourses = courses.map((course, index) => this.courseRow(course, index));
        if (id) this.detail = this.apiCourses.find(row => row.id === id);
      },
      error: (error: Error) => { this.loading = false; this.apiCourses = []; this.toast.error(error.message); }
    });
  }
  /** Course / class pickers in other modules list the owner's real active courses once any exist. */
  private loadCourseOptions(): void {
    this.courseApi.activeNames(this.auth.token).subscribe(names => {
      if (names.length) this.config.fields = this.config.fields.map(field => field.key === 'course' ? { ...field, options: names } : field);
    });
  }
  /** The fee is an amount plus how often it is charged; the choices differ for coaching and school. */
  private courseFields(): RecordField[] {
    const frequencies = (this.isSchool ? SCHOOL_FEE_FREQUENCIES : COACHING_FEE_FREQUENCIES).map(value => FEE_FREQUENCY_LABELS[value]);
    return this.config.fields.flatMap<RecordField>(field => field.key !== 'fee' ? [field] : [
      { key: 'feeAmount', label: 'Fee amount (₹)', type: 'number', required: true, hint: this.isSchool ? 'e.g. 18500' : 'e.g. 4500' },
      { key: 'feeFrequency', label: 'Fee charged', type: 'select', options: frequencies, required: true }
    ]);
  }
  private coursePayload(value: Row): CoursePayload {
    const text = (v: unknown): string | null => String(v ?? '').trim() || null;
    const fallback: ApiFeeFrequency = this.isSchool ? 'perTerm' : 'monthly';
    return {
      name: String(value.name || '').trim(),
      description: text(value.description),
      duration: text(value.duration),
      feeAmount: Number(value.feeAmount) || 0,
      feeFrequency: FEE_FREQUENCY_VALUES[value.feeFrequency] || fallback,
      subjects: String(value.subjects || '').split(',').map(item => item.trim()).filter(Boolean),
      status: value.status === 'Inactive' ? 'inactive' : 'active'
    };
  }
  private saveCourse(value: Row, row?: Row): void {
    const token = this.auth.token!;
    const payload = this.coursePayload(value);
    const request = row ? this.courseApi.update(token, row.code, payload) : this.courseApi.create(token, payload);
    request.subscribe({
      next: course => {
        const saved = this.courseRow(course, row ? this.apiCourses?.indexOf(row) ?? 0 : this.apiCourses?.length ?? 0);
        if (row) Object.assign(row, saved); else this.apiCourses?.push(saved);
        this.toast.success(`${this.singularLabel} “${saved.name}” ${row ? 'updated' : 'added'}.`);
        if (this.router.url.endsWith('/add')) this.router.navigate(['/client/courses']);
      },
      // Reopen with the entered values so nothing is lost.
      error: (error: Error) => { this.toast.error(error.message); this.openRecord(row, value); }
    });
  }
  private toggleCourseStatus(row: Row): void {
    const status = row.status === 'Active' ? 'inactive' : 'active';
    this.courseApi.update(this.auth.token!, row.code, { status }).subscribe({
      next: course => { Object.assign(row, this.courseRow(course, this.apiCourses?.indexOf(row) ?? 0)); this.toast.success(`“${row.name}” marked ${status}.`); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  private deleteCourse(row: Row): void {
    this.courseApi.remove(this.auth.token!, row.code).subscribe({
      next: () => {
        this.apiCourses = this.apiCourses?.filter(item => item !== row);
        this.toast.success(`${this.singularLabel} “${row.name}” deleted.`);
        if (this.detail === row) this.router.navigate(['/client/courses']);
      },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  /** Maps an API course to the card / dialog row shape. `id` is the 6-digit course code. */
  private courseRow(course: ApiCourse, index: number): Row {
    return {
      id: Number(course.courseCode),
      code: course.courseCode,
      name: course.name,
      description: course.description || '',
      duration: course.duration || '—',
      fee: CourseApiService.feeLabel(course.feeAmount, course.feeFrequency),
      feeAmount: course.feeAmount,
      feeFrequency: FEE_FREQUENCY_LABELS[course.feeFrequency],
      subjects: course.subjects.join(', '),
      status: course.status === 'inactive' ? 'Inactive' : 'Active',
      enrolled: course.enrolled ?? 0,
      accent: COURSE_ACCENTS[Math.max(0, index) % COURSE_ACCENTS.length]
    };
  }
  /** Students in active batches, against total seats where a capacity is set (sample numbers in demo sessions). */
  get batchStudentTotal(): string { return this.apiBatches ? this.apiBatches.filter(row => row.status === 'Active').reduce((sum, row) => sum + (Number(row.students) || 0), 0).toLocaleString('en-IN') : '93'; }
  get activeBatchCount(): number { return this.activeCourseOrBatchCount; }
  overCapacity(row: Row): boolean { return !!row.capacity && Number(row.students) > Number(row.capacity); }
  /** Batches need the owner's courses and teachers (names to codes) as well as the batches themselves. */
  private loadBatches(id: number): void {
    const token = this.auth.token!;
    this.loading = true;
    forkJoin({ batches: this.batchApi.list(token), courses: this.courseApi.list(token), teachers: this.teacherApi.list(token) }).subscribe({
      next: ({ batches, courses, teachers }) => {
        this.loading = false;
        this.courseCodes = new Map(courses.map(course => [course.name, course.courseCode]));
        this.teacherCodes = new Map(teachers.filter(teacher => teacher.fullName).map(teacher => [teacher.fullName!, teacher.teacherCode]));
        this.apiBatches = batches.map(batch => this.batchRow(batch));
        if (id) this.detail = this.apiBatches.find(row => row.id === id);
      },
      error: (error: Error) => { this.loading = false; this.apiBatches = []; this.toast.error(error.message); }
    });
  }
  /** Batch / section pickers in other modules (Results, Materials) list the real active batches once any exist. */
  private loadBatchOptions(): void {
    this.batchApi.active(this.auth.token).subscribe(batches => {
      const names = batches.map(batch => BatchApiService.label(batch));
      if (names.length) this.config.fields = this.config.fields.map(field => field.key === 'batch' ? { ...field, options: names } : field);
    });
  }
  /** Structured schedule: days picked from Mon–Sun plus a start and end time. */
  private batchFields(): RecordField[] {
    const status = this.config.fields.find(field => field.key === 'status')!;
    return [
      { key: 'name', label: 'Batch name', required: true, hint: 'e.g. Physics · Morning' },
      { key: 'course', label: 'Course', type: 'select', options: [...this.courseCodes.keys()], required: true },
      { key: 'teacher', label: 'Teachers', type: 'multiselect', options: [...this.teacherCodes.keys()] },
      { key: 'dayList', label: 'Days', type: 'multiselect', options: [...BATCH_DAYS], required: true },
      { key: 'startTime', label: 'Start time', type: 'time', required: true },
      { key: 'endTime', label: 'End time', type: 'time', required: true },
      { key: 'start', label: 'Start date', type: 'date', required: true },
      { key: 'end', label: 'End date', type: 'date' },
      { key: 'room', label: 'Room', hint: 'e.g. Room 204' },
      { key: 'capacity', label: 'Student capacity', type: 'number' },
      status
    ];
  }
  private batchPayload(value: Row): BatchPayload {
    const list = (text: unknown): string[] => String(text || '').split(',').map(item => item.trim()).filter(Boolean);
    const capacity = Number(value.capacity);
    return {
      name: String(value.name || '').trim(),
      courseCode: this.courseCodes.get(value.course) || '',
      teacherCodes: list(value.teacher).map(name => this.teacherCodes.get(name)).filter((code): code is string => !!code),
      days: list(value.dayList) as ApiBatchDay[],
      startTime: value.startTime || null,
      endTime: value.endTime || null,
      startDate: ClientManagementComponent.isoDate(value.start),
      endDate: ClientManagementComponent.isoDate(value.end),
      room: String(value.room || '').trim() || null,
      capacity: capacity > 0 ? capacity : null,
      status: value.status === 'Inactive' ? 'inactive' : 'active'
    };
  }
  private saveBatch(value: Row, row?: Row): void {
    const token = this.auth.token!;
    const payload = this.batchPayload(value);
    if (value.startTime && value.endTime && value.endTime <= value.startTime) { this.toast.error('End time must be after the start time.'); this.openRecord(row, value); return; }
    const request = row ? this.batchApi.update(token, row.code, payload) : this.batchApi.create(token, payload);
    request.subscribe({
      next: batch => {
        const saved = this.batchRow(batch);
        if (row) Object.assign(row, saved); else this.apiBatches?.push(saved);
        this.toast.success(`${this.singularLabel} “${saved.name}” ${row ? 'updated' : 'added'}.`);
        if (this.overCapacity(saved)) this.toast.warning(`“${saved.name}” has ${saved.students} students but room for ${saved.capacity}.`);
        if (this.router.url.endsWith('/add')) this.router.navigate(['/client/batches']);
      },
      // Reopen with the entered values so nothing is lost (e.g. a teacher or room clash).
      error: (error: Error) => { this.toast.error(error.message); this.openRecord(row, value); }
    });
  }
  private toggleBatchStatus(row: Row): void {
    const status = row.status === 'Active' ? 'inactive' : 'active';
    this.batchApi.update(this.auth.token!, row.code, { status }).subscribe({
      next: batch => { Object.assign(row, this.batchRow(batch)); this.toast.success(`“${row.name}” marked ${status}.`); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  private deleteBatch(row: Row): void {
    this.batchApi.remove(this.auth.token!, row.code).subscribe({
      next: () => {
        this.apiBatches = this.apiBatches?.filter(item => item !== row);
        this.toast.success(`${this.singularLabel} “${row.name}” deleted.`);
        if (this.detail === row) this.router.navigate(['/client/batches']);
      },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  /** Maps an API batch to the card / table / dialog row shape. `id` is the 6-digit batch code. */
  private batchRow(batch: ApiBatch): Row {
    const day = (value: string | null): string => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
    return {
      id: Number(batch.batchCode),
      code: batch.batchCode,
      name: batch.name,
      course: batch.course?.name || '—',
      teacher: batch.teachers.map(teacher => teacher.fullName).filter(Boolean).join(', ') || '—',
      days: BatchApiService.daysLabel(batch.days),
      dayList: batch.days.join(', '),
      startTime: batch.startTime || '',
      endTime: batch.endTime || '',
      timing: batch.startTime && batch.endTime ? `${BatchApiService.clock(batch.startTime)} – ${BatchApiService.clock(batch.endTime)}` : '—',
      start: day(batch.startDate),
      end: day(batch.endDate),
      room: batch.room || '—',
      capacity: batch.capacity ?? '',
      students: batch.students ?? 0,
      status: batch.status === 'inactive' ? 'Inactive' : 'Active'
    };
  }
  private loadMaterials(): void {
    const token = this.auth.token!;
    this.loading = true;
    forkJoin({ materials: this.materialApi.list(token), courses: this.courseApi.list(token), batches: this.batchApi.list(token, { status: 'active' }) }).subscribe({
      next: ({ materials, courses, batches }) => {
        this.loading = false;
        this.courseCodes = new Map(courses.filter(course => course.status === 'active').map(course => [course.name, course.courseCode]));
        this.batchCodes = new Map(batches.map(batch => [BatchApiService.label(batch), batch.batchCode]));
        this.apiMaterials = materials.map(material => this.materialRow(material));
      },
      error: (error: Error) => { this.loading = false; this.apiMaterials = []; this.toast.error(error.message); }
    });
  }
  /** Course (school: class), optional batch (school: sections), subject, and a file or a link. */
  private materialFields(): RecordField[] {
    const subject = this.config.fields.find(field => field.key === 'subject')!;
    const groups = [...this.batchCodes.keys()];
    return [
      { key: 'title', label: 'Title', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'course', label: this.isSchool ? 'Class' : 'Course', type: 'select', options: [...this.courseCodes.keys()], required: true },
      this.isSchool
        ? { key: 'batch', label: 'Sections', type: 'multiselect', options: groups, hint: 'Leave empty for the whole class' }
        : { key: 'batch', label: 'Batch', type: 'select', options: [WHOLE_COURSE, ...groups] },
      { ...subject, required: false },
      { key: 'type', label: 'Material type', type: 'select', options: Object.values(MATERIAL_TYPE_LABELS), required: true },
      { key: 'file', label: 'File', type: 'file', accept: MATERIAL_ACCEPT, hint: 'PDF, Word, PowerPoint, Excel or image · up to 25 MB' },
      { key: 'link', label: 'Link', hint: 'For videos (YouTube, Google Drive, Vimeo), or instead of a file' },
      { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }
    ];
  }
  private async saveMaterial(value: Row, row?: Row): Promise<void> {
    const token = this.auth.token!;
    const type = MATERIAL_TYPE_VALUES[value.type] || 'pdf';
    const picked: File | undefined = value.fileFile;
    const link = String(value.link || '').trim();
    const problem = picked && picked.size > MAX_MATERIAL_BYTES ? 'Files must be 25 MB or smaller.'
      : link && !/^https?:\/\//i.test(link) ? 'Link must start with http:// or https://'
      : type === 'video' && !link ? 'Add the video link (YouTube, Google Drive, Vimeo…). Videos are not uploaded.'
      : type !== 'video' && !picked && !link && !row?.fileInfo ? 'Upload a file or add a link.' : '';
    if (problem) { this.toast.error(problem); this.openRecord(row, value); return; }
    const groups = String(value.batch || '').split(',').map(item => item.trim()).filter(item => item && item !== WHOLE_COURSE);
    const payload: MaterialPayload = {
      title: String(value.title || '').trim(), description: String(value.description || '').trim() || null,
      courseCode: this.courseCodes.get(value.course) || '', batchCodes: groups.map(label => this.batchCodes.get(label)).filter((code): code is string => !!code),
      subject: value.subject || null, type, link: link || null, status: value.status === 'Draft' ? 'draft' : 'published'
    };
    try {
      let file: ApiMaterialFile | undefined;
      if (picked && type !== 'video') { this.toast.info(`Uploading “${picked.name}”…`); file = await firstValueFrom(this.materialApi.upload(token, picked)); }
      if (file) payload.file = file; else if (link || type === 'video') payload.file = null;
      const material = await firstValueFrom(row ? this.materialApi.update(token, row.code, payload) : this.materialApi.create(token, payload));
      const saved = this.materialRow(material);
      if (row) Object.assign(row, saved); else this.apiMaterials?.unshift(saved);
      this.toast.success(`${this.singularLabel} “${saved.title}” ${row ? 'updated' : 'added'}.`);
      if (this.router.url.endsWith('/add')) this.router.navigate(['/client/materials']);
    } catch (error) {
      this.toast.error((error as Error).message);
      this.openRecord(row, { ...value, fileFile: undefined });
    }
  }
  private toggleMaterialStatus(row: Row): void {
    const status = row.status === 'Published' ? 'draft' : 'published';
    this.materialApi.update(this.auth.token!, row.code, { status }).subscribe({
      next: material => { Object.assign(row, this.materialRow(material)); this.toast.success(`“${row.title}” ${status === 'published' ? 'published' : 'moved to drafts'}.`); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  private deleteMaterial(row: Row): void {
    this.materialApi.remove(this.auth.token!, row.code).subscribe({
      next: () => { this.apiMaterials = this.apiMaterials?.filter(item => item !== row); this.toast.success(`${this.singularLabel} “${row.title}” deleted.`); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  /** Maps an API material to the card / table / dialog row shape. `id` is the 6-digit material code. */
  private materialRow(material: ApiMaterial): Row {
    const host = (url: string): string => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Link'; } };
    const groups = material.batches.map(batch => material.workType === 'school' && material.course ? `${material.course.name} · ${batch.name}` : batch.name);
    return {
      id: Number(material.materialCode), code: material.materialCode, title: material.title, description: material.description || '',
      course: material.course?.name || '—', batch: this.isSchool ? groups.join(', ') : groups[0] || WHOLE_COURSE,
      subject: material.subject || '—', type: MATERIAL_TYPE_LABELS[material.type] || 'PDF',
      file: material.file ? material.file.name : material.link ? host(material.link) : '', fileInfo: material.file,
      link: material.link || '', url: material.file?.url || material.link || '',
      size: material.file ? MaterialApiService.sizeLabel(material.file.size) : 'Link',
      date: new Date(material.publishedAt || material.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: material.status === 'draft' ? 'Draft' : 'Published', canManage: material.canManage
    };
  }
  private loadNotices(): void {
    const token = this.auth.token!;
    this.loading = true;
    forkJoin({ notices: this.noticeApi.list(token), courses: this.courseApi.list(token), batches: this.batchApi.list(token, { status: 'active' }) }).subscribe({
      next: ({ notices, courses, batches }) => {
        this.loading = false;
        this.courseCodes = new Map(courses.filter(course => course.status === 'active').map(course => [course.name, course.courseCode]));
        // Teachers address only their own batches / sections; the backend checks this too.
        this.batchCodes = new Map(batches.map(batch => [BatchApiService.label(batch), batch.batchCode]));
        this.apiNotices = notices.map(notice => this.noticeRow(notice));
      },
      error: (error: Error) => { this.loading = false; this.apiNotices = []; this.toast.error(error.message); }
    });
  }
  /** Audience, optional course / batches for student notices, pin and (owner) website display. */
  private noticeFields(): RecordField[] {
    const types = Object.entries(NOTICE_TYPE_LABELS).filter(([value]) => this.isSchool ? value !== 'newBatch' : value !== 'ptm').map(([, label]) => label);
    const audiences = this.isTeacher ? [NOTICE_AUDIENCE_LABELS.students] : Object.values(NOTICE_AUDIENCE_LABELS);
    return [
      { key: 'title', label: 'Notice title', required: true },
      { key: 'description', label: 'Notice details', type: 'textarea', required: true },
      { key: 'type', label: 'Notice type', type: 'select', options: types, required: true },
      { key: 'audience', label: 'Send to', type: 'select', options: audiences, required: true },
      { key: 'course', label: this.isSchool ? 'Class (students only)' : 'Course (students only)', type: 'select', options: [ALL_STUDENTS, ...this.courseCodes.keys()] },
      { key: 'batch', label: this.isSchool ? 'Sections (students only)' : 'Batches (students only)', type: 'multiselect', options: [...this.batchCodes.keys()], hint: 'Leave empty for every batch of the course' },
      { key: 'date', label: 'Publish date', type: 'date', hint: 'Later dates stay hidden until then' },
      { key: 'expires', label: 'Expiry date', type: 'date', hint: 'Hidden from students after this date' },
      { key: 'pinnedLabel', label: 'Pin to top', type: 'select', options: ['No', 'Yes'] },
      ...(this.isTeacher ? [] : [{ key: 'websiteLabel', label: 'Show on website', type: 'select' as const, options: ['No', 'Yes'] }]),
      { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }
    ];
  }
  private saveNotice(value: Row, row?: Row): void {
    const audience: ApiNoticeAudience = NOTICE_AUDIENCE_VALUES[value.audience] || (this.isTeacher ? 'students' : 'everyone');
    const groups = String(value.batch || '').split(',').map(item => item.trim()).filter(Boolean);
    if (this.isTeacher && !groups.length) { this.toast.error(`Choose the ${this.isSchool ? 'sections' : 'batches'} this notice is for.`); this.openRecord(row, value); return; }
    const payload: NoticePayload = {
      title: String(value.title || '').trim(), description: String(value.description || '').trim(),
      type: (NOTICE_TYPE_VALUES[value.type] || 'general') as ApiNoticeType, audience,
      courseCode: audience === 'students' && value.course && value.course !== ALL_STUDENTS ? this.courseCodes.get(value.course) || null : null,
      batchCodes: audience === 'students' ? groups.map(label => this.batchCodes.get(label)).filter((code): code is string => !!code) : [],
      publishDate: ClientManagementComponent.isoDate(value.date), expiryDate: ClientManagementComponent.isoDate(value.expires),
      pinned: value.pinnedLabel === 'Yes', status: value.status === 'Draft' ? 'draft' : 'published',
      ...(this.isTeacher ? {} : { showOnWebsite: value.websiteLabel === 'Yes' })
    };
    const token = this.auth.token!;
    (row ? this.noticeApi.update(token, row.code, payload) : this.noticeApi.create(token, payload)).subscribe({
      next: notice => {
        const saved = this.noticeRow(notice);
        if (row) Object.assign(row, saved); else this.apiNotices?.unshift(saved);
        this.toast.success(`${this.singularLabel} “${saved.title}” ${row ? 'updated' : 'posted'}.`);
        if (this.router.url.endsWith('/add')) this.router.navigate(['/client/notices']);
      },
      error: (error: Error) => { this.toast.error(error.message); this.openRecord(row, value); }
    });
  }
  private updateNotice(row: Row, payload: Partial<NoticePayload>, message: string): void {
    this.noticeApi.update(this.auth.token!, row.code, payload).subscribe({
      next: notice => { Object.assign(row, this.noticeRow(notice)); this.toast.success(message); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  private deleteNotice(row: Row): void {
    this.noticeApi.remove(this.auth.token!, row.code).subscribe({
      next: () => { this.apiNotices = this.apiNotices?.filter(item => item !== row); this.toast.success(`${this.singularLabel} “${row.title}” deleted.`); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  /** Maps an API notice to the notice card / dialog row shape. `status` shows the date-based state. */
  private noticeRow(notice: ApiNotice): Row {
    const day = (value: string | null): string => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
    const groups = notice.batches.map(batch => notice.workType === 'school' && notice.course ? `${notice.course.name} · ${batch.name}` : batch.name);
    const audience = notice.audience === 'students' ? (groups.length ? groups.join(', ') : notice.course?.name ? `${notice.course.name} students` : 'All students') : NOTICE_AUDIENCE_LABELS[notice.audience];
    return {
      id: Number(notice.noticeCode), code: notice.noticeCode, title: notice.title, description: notice.description,
      type: NOTICE_TYPE_LABELS[notice.type] || 'General', audience: NOTICE_AUDIENCE_LABELS[notice.audience], audienceLabel: audience,
      course: notice.course?.name || ALL_STUDENTS, batch: groups.join(', '),
      date: day(notice.publishDate), expires: day(notice.expiryDate) || '—',
      pinned: notice.pinned, pinnedLabel: notice.pinned ? 'Yes' : 'No', showOnWebsite: notice.showOnWebsite, websiteLabel: notice.showOnWebsite ? 'Yes' : 'No',
      status: NOTICE_STATE_LABELS[notice.state], canManage: notice.canManage
    };
  }
  private loadPosts(): void {
    this.loading = true;
    this.mediaApi.posts(this.auth.token!).subscribe({
      next: posts => { this.loading = false; this.apiPosts = posts.map(post => this.postRow(post)); },
      error: (error: Error) => { this.loading = false; this.apiPosts = []; this.toast.error(error.message); }
    });
  }
  private loadAlbums(): void {
    this.loading = true;
    this.mediaApi.albums(this.auth.token!).subscribe({
      next: albums => { this.loading = false; this.apiAlbums = albums.map((album, index) => this.albumRow(album, index)); },
      error: (error: Error) => { this.loading = false; this.apiAlbums = []; this.toast.error(error.message); }
    });
  }
  private websiteField(label: string): RecordField[] { return this.isTeacher ? [] : [{ key: 'websiteLabel', label, type: 'select', options: ['No', 'Yes'] }]; }
  /** Image posts carry an uploaded photo; video posts a link (videos are not uploaded). */
  private postFields(): RecordField[] {
    return [
      { key: 'title', label: 'Title', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
      { key: 'type', label: 'Post type', type: 'select', options: Object.values(POST_TYPE_LABELS), required: true },
      { key: 'media', label: 'Photo (image posts)', type: 'file', accept: PHOTO_ACCEPT, hint: 'JPG, PNG, WebP or GIF · resized automatically' },
      { key: 'videoLink', label: 'Video link (video posts)', hint: 'YouTube, Google Drive or Vimeo' },
      { key: 'date', label: 'Publish date', type: 'date' },
      { key: 'pinnedLabel', label: 'Pin to top', type: 'select', options: ['No', 'Yes'] },
      ...this.websiteField('Show on website'),
      { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }
    ];
  }
  private albumFields(): RecordField[] {
    return [
      { key: 'name', label: 'Album name', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'date', label: 'Date', type: 'date' },
      ...this.websiteField('Show photos on website'),
      { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }
    ];
  }
  private async savePost(value: Row, row?: Row): Promise<void> {
    const token = this.auth.token!;
    const type = (POST_TYPE_VALUES[value.type] || 'text') as ApiPostType;
    const picked: File | undefined = value.mediaFile;
    const videoLink = String(value.videoLink || '').trim();
    const problem = type === 'video' && !/^https?:\/\//i.test(videoLink) ? 'Add the video link (starting with https://). Videos are not uploaded.'
      : type === 'image' && !picked && !row?.media ? 'Choose a photo for an image post.'
      : picked && !picked.type.startsWith('image/') ? 'Choose a JPG, PNG, WebP or GIF photo.' : '';
    if (problem) { this.toast.error(problem); this.openRecord(row, { ...value, mediaFile: undefined }); return; }
    const payload: PostPayload = {
      title: String(value.title || '').trim(), description: String(value.description || '').trim(), type,
      videoLink: type === 'video' ? videoLink : null, publishDate: ClientManagementComponent.isoDate(value.date),
      pinned: value.pinnedLabel === 'Yes', status: value.status === 'Draft' ? 'draft' : 'published',
      ...(this.isTeacher ? {} : { showOnWebsite: value.websiteLabel === 'Yes' })
    };
    try {
      if (picked && type !== 'video') payload.imageUrl = (await firstValueFrom(this.mediaApi.uploadPhoto(token, picked))).url;
      else if (type === 'text' || type === 'video') payload.imageUrl = null;
      const post = await firstValueFrom(row ? this.mediaApi.updatePost(token, row.code, payload) : this.mediaApi.createPost(token, payload));
      const saved = this.postRow(post);
      if (row) Object.assign(row, saved); else this.apiPosts?.unshift(saved);
      this.toast.success(`Post “${saved.title}” ${row ? 'updated' : 'shared'}.`);
      if (this.router.url.endsWith('/add')) this.router.navigate(['/client/posts']);
    } catch (error) {
      this.toast.error((error as Error).message);
      this.openRecord(row, { ...value, mediaFile: undefined });
    }
  }
  private saveAlbum(value: Row, row?: Row): void {
    const payload: AlbumPayload = {
      name: String(value.name || '').trim(), description: String(value.description || '').trim() || null, date: ClientManagementComponent.isoDate(value.date),
      status: value.status === 'Draft' ? 'draft' : 'published', ...(this.isTeacher ? {} : { showOnWebsite: value.websiteLabel === 'Yes' })
    };
    const token = this.auth.token!;
    (row ? this.mediaApi.updateAlbum(token, row.code, payload) : this.mediaApi.createAlbum(token, payload)).subscribe({
      next: album => {
        const saved = this.albumRow(album, row ? this.apiAlbums?.indexOf(row) ?? 0 : this.apiAlbums?.length ?? 0);
        if (row) { Object.assign(row, saved); this.toast.success(`Album “${saved.name}” updated.`); return; }
        this.apiAlbums?.unshift(saved);
        this.toast.success(`Album “${saved.name}” created. Add its photos now.`);
        this.openAlbum(saved);
      },
      error: (error: Error) => { this.toast.error(error.message); this.openRecord(row, value); }
    });
  }
  /** Live albums open the photo manager; demo albums preview their cover. */
  openAlbum(row: Row): void {
    if (!this.useGalleryApi) { this.preview(row.media); return; }
    this.dialog.open(AlbumDialogComponent, { width: '860px', maxWidth: 'calc(100vw - 24px)', data: { album: row.album } }).afterClosed().subscribe((album?: ApiAlbum) => {
      if (album) Object.assign(row, this.albumRow(album, this.apiAlbums?.indexOf(row) ?? 0));
    });
  }
  private updatePost(row: Row, payload: Partial<PostPayload>, message: string): void {
    this.mediaApi.updatePost(this.auth.token!, row.code, payload).subscribe({
      next: post => { Object.assign(row, this.postRow(post)); this.toast.success(message); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  private updateAlbum(row: Row, payload: Partial<AlbumPayload>, message: string): void {
    this.mediaApi.updateAlbum(this.auth.token!, row.code, payload).subscribe({
      next: album => { Object.assign(row, this.albumRow(album, this.apiAlbums?.indexOf(row) ?? 0)); this.toast.success(message); },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  private deleteMedia(row: Row): void {
    const posts = this.usePostApi;
    (posts ? this.mediaApi.removePost(this.auth.token!, row.code) : this.mediaApi.removeAlbum(this.auth.token!, row.code)).subscribe({
      next: () => {
        if (posts) this.apiPosts = this.apiPosts?.filter(item => item !== row); else this.apiAlbums = this.apiAlbums?.filter(item => item !== row);
        this.toast.success(`${posts ? 'Post' : 'Album'} “${row.title || row.name}” deleted.`);
      },
      error: (error: Error) => this.toast.error(error.message)
    });
  }
  private static dayLabel(value: string): string { return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
  private postRow(post: ApiPost): Row {
    return {
      id: Number(post.postCode), code: post.postCode, title: post.title, description: post.description, type: POST_TYPE_LABELS[post.type] || 'Text',
      media: post.imageUrl || '', videoLink: post.videoLink || '', date: ClientManagementComponent.dayLabel(post.publishDate),
      status: post.state === 'draft' ? 'Draft' : post.state === 'scheduled' ? 'Scheduled' : 'Published',
      pinned: post.pinned, pinnedLabel: post.pinned ? 'Yes' : 'No', showOnWebsite: post.showOnWebsite, websiteLabel: post.showOnWebsite ? 'Yes' : 'No',
      author: post.authorName || '', canManage: post.canManage
    };
  }
  private albumRow(album: ApiAlbum, index: number): Row {
    return {
      id: Number(album.albumCode), code: album.albumCode, album, name: album.name, description: album.description || '',
      date: ClientManagementComponent.dayLabel(album.date), status: album.status === 'draft' ? 'Draft' : 'Published',
      media: album.coverUrl || '', count: album.items.length, accent: ALBUM_ACCENTS[Math.max(0, index) % ALBUM_ACCENTS.length],
      showOnWebsite: album.showOnWebsite, websiteLabel: album.showOnWebsite ? 'Yes' : 'No', canManage: album.canManage
    };
  }
  get testsRoute(): string { return this.isSchool ? '/client/exams' : '/client/tests'; }
  private loadResults(): void {
    this.loading = true;
    this.config = { ...this.config, action: this.isSchool ? 'Enter exam marks' : 'Enter test marks' };
    this.testApi.results(this.auth.token!).subscribe({
      next: results => { this.loading = false; this.apiResults = results.map((result, index) => this.resultRow(result, index)); },
      error: (error: Error) => { this.loading = false; this.apiResults = []; this.toast.error(error.message); }
    });
  }
  /** Maps an API result (one student, one paper) to the results table row. */
  private resultRow(result: ApiResult, index: number): Row {
    return {
      id: index + 1, code: result.testCode, student: result.student || result.studentCode, studentCode: result.studentCode,
      course: result.course, batch: result.batch, exam: result.term ? `${result.exam} (${result.term})` : result.exam,
      examDate: new Date(result.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }),
      subject: result.subject, marks: result.absent ? 'AB' : result.marks, total: result.total,
      percentage: result.absent ? '—' : `${result.percentage}%`, grade: result.grade, passed: result.passed,
      resultStatus: result.published ? 'Published' : 'Draft'
    };
  }
  private configureWorkspaceFields(): void {
    const classes = [...Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`), 'JEE Foundation', 'JEE Preparation', 'NEET Preparation', 'Commerce Entrance'];
    const classGroups = [...Array.from({ length: 12 }, (_, index) => `Class ${index + 1} · ${index % 2 ? 'Evening' : 'Morning'}`), 'JEE · Weekend', 'NEET · Weekend'];
    const schoolExams = ['Unit Test 1', 'Unit Test 2', 'Term 1', 'Unit Test 3', 'Unit Test 4', 'Term 2'];
    this.config = { ...this.config, fields: this.config.fields.map(field => ({ ...field, options: field.options ? [...field.options] : undefined })) };
    if (this.isSchool) this.configureSchool(schoolExams);
    this.config.fields = this.config.fields.map(field => {
      if (field.key === 'student') return { ...field, options: this.mockData.students.map(student => student.name) };
      if (field.key === 'teacher') return { ...field, options: (this.isSchool ? this.schoolData['teachers'] : this.featureData['teachers']).map(teacher => teacher.name) };
      if (this.isSchool && field.key === 'subject') return { ...field, options: [...SCHOOL_SUBJECTS] };
      if (this.isSchool && field.key === 'type' && this.key === 'notices') return { ...field, options: ['General', 'Holiday', 'Exam', 'Fee Reminder', 'PTM', 'Important'] };
      if (!['course', 'batch'].includes(field.key)) return field;
      const options = this.isSchool ? field.key === 'course' ? [...SCHOOL_CLASSES] : [...SCHOOL_SECTIONS] : field.key === 'course' ? classes : classGroups;
      return { ...field, label: this.isSchool ? (field.key === 'course' ? (this.key === 'admissions' ? 'Class applying for' : 'Class') : 'Section') : (field.key === 'course' ? 'Class / course' : 'Class / batch'), options };
    });
  }
  /** School (K-12) wording and forms: classes, sections, teachers & staff, admissions and term exams. */
  private configureSchool(exams: string[]): void {
    const status = (options: string[]): RecordField => ({ key: 'status', label: 'Status', type: 'select', options, required: true });
    if (this.key === 'courses') this.config = { ...this.config, title: 'Classes', description: 'Classes offered this session with their subjects and term fees.', singular: 'class', action: 'Add class', fields: this.config.fields.map<RecordField>(field => ({ ...field, ...(field.key === 'name' ? { label: 'Class', type: 'select' as const, options: [...SCHOOL_CLASSES] } : field.key === 'duration' ? { label: 'Session', hint: 'e.g. April – March' } : field.key === 'fee' ? { label: 'Term fee', hint: 'e.g. ₹18,500 / term' } : {}) })) };
    if (this.key === 'teachers') this.config = { ...this.config, title: 'Teachers & Staff', description: 'Manage teachers and staff, their subjects, classes and departments.', singular: 'teacher / staff member', action: 'Add teacher / staff', fields: [{ key: 'name', label: 'Full name', required: true }, { key: 'employeeId', label: 'Employee ID', hint: 'e.g. GPS-EMP-042' }, { key: 'designation', label: 'Designation', type: 'select', options: [...SCHOOL_DESIGNATIONS], required: true }, { key: 'department', label: 'Department', type: 'select', options: [...SCHOOL_DEPARTMENTS], required: true }, { key: 'qualification', label: 'Qualification', type: 'select', options: [...termsFor('school').qualificationOptions], required: true }, { key: 'subjects', label: 'Subjects', type: 'tags', required: true, hint: 'e.g. Mathematics, Science' }, { key: 'classes', label: 'Classes taught', type: 'tags', hint: 'e.g. Class 9 · Section A' }, { key: 'phone', label: 'Phone', type: 'phone', required: true }, { key: 'email', label: 'Email', type: 'email', required: true }, { key: 'joining', label: 'Joining date', type: 'date' }, status(['Active', 'On leave', 'Inactive'])] };
    if (this.key === 'admissions') this.config = { ...this.config, title: 'Admissions', description: 'Track admission enquiries and applications for each class.', singular: 'admission', action: 'New admission', fields: [{ key: 'name', label: 'Student name', required: true }, { key: 'parent', label: 'Parent name', required: true }, { key: 'phone', label: 'Phone', type: 'phone', required: true }, { key: 'course', label: 'Class applying for', type: 'select', options: [...SCHOOL_CLASSES], required: true }, { key: 'previousSchool', label: 'Previous school', hint: 'Leave blank for first-time admission' }, status(['New', 'Contacted', 'Interested', 'Joined', 'Rejected'])] };
    if (this.key === 'results') this.config = { ...this.config, title: 'Results', description: 'Record class-wise marks for unit tests and term exams, then publish them.', fields: this.config.fields.map<RecordField>(field => field.key === 'exam' ? { ...field, label: 'Exam', type: 'select', options: [...exams] } : field) };
  }
}

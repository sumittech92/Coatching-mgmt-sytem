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
import { SCHOOL_CLASSES, SCHOOL_DEPARTMENTS, SCHOOL_DESIGNATIONS, SCHOOL_SECTIONS, SCHOOL_SUBJECTS, termsFor } from '../../core/workspace-terms';

interface FeatureConfig { title: string; description: string; singular: string; icon: string; fields: RecordField[]; action: string; }
type Row = any;
const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
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
    batches: { title: 'Batches', description: 'Plan class schedules, rooms and teacher assignments.', singular: 'batch', icon: 'groups', action: 'Create batch', fields: [{ key: 'name', label: 'Batch name', required: true }, { key: 'course', label: 'Course', type: 'select', options: ['Class 12 Science', 'Class 11 Science', 'Class 10 Foundation', 'Class 12 Commerce'], required: true }, { key: 'teacher', label: 'Teacher', type: 'select', options: ['Priya Nair', 'Ankit Rao', 'Nisha Thomas', 'Dev Malhotra'], required: true }, { key: 'start', label: 'Start date', type: 'date', required: true }, { key: 'end', label: 'End date', type: 'date' }, { key: 'timing', label: 'Timing', required: true }, { key: 'days', label: 'Days', required: true }, { key: 'room', label: 'Room' }, { key: 'students', label: 'Student capacity', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true }] },
    admissions: { title: 'Admissions / Enquiries', description: 'Track prospective students from their first enquiry to admission.', singular: 'inquiry', icon: 'person_add_alt', action: 'Add inquiry', fields: [{ key: 'name', label: 'Student name', required: true }, { key: 'parent', label: 'Parent name', required: true }, { key: 'phone', label: 'Phone', type: 'phone', required: true }, { key: 'course', label: 'Course', type: 'select', options: ['Class 12 Science', 'Class 11 Science', 'Class 10 Foundation', 'Class 12 Commerce'] }, { key: 'source', label: 'Source', type: 'select', options: ['Website', 'Referral', 'Instagram', 'Walk-in', 'Phone'] }, { key: 'date', label: 'Inquiry date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['New', 'Contacted', 'Interested', 'Joined', 'Rejected'], required: true }, { key: 'followup', label: 'Follow-up', type: 'date' }] },
    posts: { title: 'Posts & updates', description: 'Share news, moments and announcements with your community.', singular: 'post', icon: 'campaign', action: 'Create post', fields: [{ key: 'title', label: 'Title', required: true }, { key: 'description', label: 'Description', type: 'textarea', required: true }, { key: 'type', label: 'Post type', type: 'select', options: ['Image', 'Video', 'Text', 'Announcement'], required: true }, { key: 'media', label: 'Upload image or video', type: 'file' }, { key: 'date', label: 'Publish date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] },
    gallery: { title: 'Gallery', description: 'Bring everyday moments together in albums of photos and videos.', singular: 'album', icon: 'photo_library', action: 'Create album', fields: [{ key: 'name', label: 'Album name', required: true }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'media', label: 'Cover image / media', type: 'file' }, { key: 'date', label: 'Date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] },
    notices: { title: 'Notices', description: 'Keep students and families up to date with important announcements.', singular: 'notice', icon: 'campaign', action: 'Add notice', fields: [{ key: 'title', label: 'Notice title', required: true }, { key: 'description', label: 'Notice details', type: 'textarea', required: true }, { key: 'type', label: 'Notice type', type: 'select', options: ['General', 'Holiday', 'Exam', 'Fee Reminder', 'New Batch', 'Important'], required: true }, { key: 'date', label: 'Publish date', type: 'date' }, { key: 'expires', label: 'Expiry date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] },
    results: { title: 'Results', description: 'Record and publish student exam performance.', singular: 'result', icon: 'assignment_turned_in', action: 'Add result', fields: [{ key: 'student', label: 'Student', type: 'select', options: ['Aarav Sharma', 'Meera Kapoor', 'Diya Iyer', 'Rohan Verma'], required: true }, { key: 'course', label: 'Course', type: 'select', options: ['Class 12 Science', 'Class 11 Science', 'Class 10 Foundation'] }, { key: 'batch', label: 'Batch', type: 'select', options: ['Physics · Morning', 'Chemistry · Evening', 'Foundation · Afternoon'] }, { key: 'exam', label: 'Exam name', required: true }, { key: 'examDate', label: 'Exam date', type: 'date' }, { key: 'subject', label: 'Subject', type: 'select', options: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English'] }, { key: 'marks', label: 'Marks obtained', type: 'number', required: true }, { key: 'total', label: 'Maximum marks', type: 'number', required: true }, { key: 'grade', label: 'Grade' }, { key: 'resultStatus', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] },
    materials: { title: 'Study materials', description: 'Organize and share learning resources with your classes.', singular: 'material', icon: 'folder_open', action: 'Upload material', fields: [{ key: 'title', label: 'Title', required: true }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'course', label: 'Course', type: 'select', options: ['Class 12 Science', 'Class 11 Science', 'Class 10 Foundation'] }, { key: 'batch', label: 'Batch', type: 'select', options: ['Physics · Morning', 'Chemistry · Evening', 'Foundation · Afternoon'] }, { key: 'subject', label: 'Subject', type: 'select', options: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English'] }, { key: 'type', label: 'Material type', type: 'select', options: ['PDF', 'Notes', 'Assignment', 'Video', 'Question Paper'], required: true }, { key: 'file', label: 'File', type: 'file', required: true }, { key: 'date', label: 'Publish date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] }
  };
  constructor(private route: ActivatedRoute, public router: Router, private dialog: MatDialog, private confirm: ConfirmationDialogService, private mockData: MockDataService, private tenant: TenantContextService, public auth: MockAuthService, private toast: ToastService) {}
  get isTeacher(): boolean { return this.auth.role === 'Teacher'; }
  ngOnInit(): void {
    this.isShop = this.router.url.startsWith('/shop/');
    this.key = this.route.snapshot.url[1]?.path || this.route.snapshot.url[0]?.path || 'teachers';
    this.config = this.configMap[this.key] || this.configMap['teachers'];
    if (!this.isShop) this.configureWorkspaceFields();
    if (this.isShop && this.key === 'posts') this.config = { ...this.config, title: 'Posts', description: 'Share new arrivals, store news and styling ideas with your community.', singular: 'post', action: 'Create post' };
    if (this.isShop && this.key === 'gallery') this.config = { ...this.config, title: 'Gallery', description: 'Curate product photography and moments from your store.', singular: 'album', action: 'Create album' };
    if (this.router.url.endsWith('/add')) setTimeout(() => this.openRecord(), 0);
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) this.detail = this.rows.find(row => row.id === id);
  }
  get rows(): Row[] { if (this.key === 'courses' && !this.isShop) return this.isSchool ? this.schoolClasses : this.coachingCourses; if (this.isSchool && this.schoolData[this.key]) return this.schoolData[this.key]; return this.isShop && this.shopSocialData[this.key] ? this.shopSocialData[this.key] : this.featureData[this.key] || []; }
  get filtered(): Row[] {
    const query = this.search.trim().toLowerCase();
    return this.rows.filter(row => (!query || Object.values(row).join(' ').toLowerCase().includes(query)) && (!this.filter || String(row.status || '').toLowerCase() === this.filter.toLowerCase() || String(row.resultStatus || '').toLowerCase() === this.filter.toLowerCase() || String(row.type || '').toLowerCase() === this.filter.toLowerCase() || String(row.subjects || '').toLowerCase().includes(this.filter.toLowerCase()) || String(row.department || '').toLowerCase() === this.filter.toLowerCase()) && this.inDateRange(row.date || row.joining || row.examDate));
  }
  openRecord(row?: Row, draft?: Row): void {
    if (this.isTeacher && !['results', 'materials'].includes(this.key)) return;
    const record = draft || (row ? { ...row, ...(row.phone ? { phone: normalizeMobile(String(row.phone)) } : {}) } : undefined);
    const ref = this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: `${row ? 'Edit' : 'Add'} ${this.config.singular}`, submitLabel: row ? 'Save changes' : this.config.action, fields: this.config.fields, record, successMessage: '' } });
    ref.afterClosed().subscribe(async value => {
      if (!value) { if (this.router.url.endsWith('/add')) this.router.navigate([`${this.isShop ? '/shop' : '/client'}/${this.key}`]); return; }
      // Cross-field checks the shared dialog can't express: reopen with the entered values so nothing is lost.
      const problem = this.recordProblem(value) || await this.mediaProblem(value.media, true) || await this.mediaProblem(value.file, false);
      if (problem) { this.toast.error(problem); this.openRecord(row, value); return; }
      this.config.fields.forEach(field => { if (field.type === 'date' && value[field.key] instanceof Date) value[field.key] = (value[field.key] as Date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); });
      const normalized: Row = { ...value, id: row?.id || Date.now() };
      if (normalized.phone) normalized.phone = normalizeMobile(String(normalized.phone));
      if (this.isSchool && this.key === 'admissions') { normalized.date ||= new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); normalized.previousSchool ||= '—'; normalized.followup ||= '—'; }
      if (this.key === 'results' && normalized.marks !== undefined && normalized.total) { normalized.percentage = `${Math.round(Number(normalized.marks) / Number(normalized.total) * 100)}%`; normalized.resultStatus = normalized.resultStatus || 'Draft'; }
      if (this.key === 'teachers') { normalized.photo ||= (normalized.name || '?').split(' ').map((word: string) => word[0]).join('').slice(0, 2).toUpperCase(); normalized.color ||= '#e7eefd'; }
      if (row) Object.assign(row, normalized); else this.rows.unshift(normalized);
      this.toast.success(this.key === 'results' ? `Result for ${normalized.student} ${row ? 'updated' : 'added'}.` : `${this.singularLabel} “${normalized.name || normalized.title}” ${row ? 'updated' : 'added'}.`);
      if (this.router.url.endsWith('/add')) this.router.navigate([`${this.isShop ? '/shop' : '/client'}/${this.key}`]);
    });
  }
  get singularLabel(): string { return this.config.singular.charAt(0).toUpperCase() + this.config.singular.slice(1); }
  private recordProblem(value: Row): string {
    const time = (v: unknown): number => v instanceof Date ? v.getTime() : v ? new Date(String(v)).getTime() : NaN;
    const nameCheck = (key: string, label: string): string => value[key] ? validationMessage(new FormControl(value[key], AppValidators.personName), label) : '';
    if (this.key === 'results') { const marks = Number(value.marks), total = Number(value.total); if (!(total > 0)) return 'Maximum marks must be greater than 0.'; if (marks < 0 || marks > total) return `Marks obtained must be between 0 and ${total}.`; }
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
  viewRow(row: Row): void { this.dialog.open(RecordDialogComponent, { width: '660px', maxWidth: 'calc(100vw - 24px)', data: { title: `${this.singularLabel} details`, submitLabel: 'Done', fields: this.config.fields, record: row, readonly: true } }); }
  followUp(row: Row): void { if (this.isTeacher) return; const ref = this.dialog.open(RecordDialogComponent, { width: '560px', maxWidth: 'calc(100vw - 24px)', data: { title: `Schedule follow-up · ${row.name}`, submitLabel: 'Save follow-up', fields: [{ key: 'followup', label: 'Follow-up date and time', type: 'text', required: true }, { key: 'notes', label: 'Follow-up notes', type: 'textarea' }], record: { followup: row.followup }, successMessage: `Follow-up saved for ${row.name}.` } }); ref.afterClosed().subscribe(value => { if (value) row.followup = value.followup; }); }
  download(row: Row): void { const blob = new Blob([`Demo study material: ${row.title}\n${row.description || ''}\nFile reference: ${row.file || ''}`], { type: 'text/plain' }); const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = (row.file || `${row.title}.txt`).split('/').pop(); anchor.click(); URL.revokeObjectURL(anchor.href); this.toast.success(`Downloading “${row.title}”.`); }
  preview(media: string): void { if (media) window.open(media, '_blank', 'noopener'); }
  uploadMedia(row: Row): void { if (this.isTeacher) return; const ref = this.dialog.open(RecordDialogComponent, { width: '560px', maxWidth: 'calc(100vw - 24px)', data: { title: `Upload media · ${row.name}`, submitLabel: 'Add to album', fields: [{ key: 'media', label: 'Photo or video file', type: 'file', required: true, hint: 'Images or videos up to 10 MB' }], successMessage: '' } }); ref.afterClosed().subscribe(async value => { if (!value?.media) return; const problem = await this.mediaProblem(value.media, true); if (problem) { this.toast.error(problem); return; } row.media = value.media; row.count = (Number(row.count) || 0) + 1; this.toast.success(`Media added to “${row.name}”.`); }); }
  private inDateRange(value: string): boolean { if (!value || (!this.startDate && !this.endDate)) return true; const date = new Date(value); const from = this.startDate ? new Date(this.startDate instanceof Date ? this.startDate.getTime() : this.startDate) : undefined; const to = this.endDate ? new Date(this.endDate instanceof Date ? this.endDate.getTime() : this.endDate) : undefined; return !Number.isNaN(date.getTime()) && (!from || date >= from) && (!to || date <= to); }
  remove(row: Row): void { if (this.isTeacher) return; this.confirm.confirm({ title: `Delete ${this.config.singular}?`, message: `Delete “${row.name || row.title || row.student}” from this workspace? This mock action cannot be undone.`, confirmLabel: `Delete ${this.config.singular}`, destructive: true }).subscribe(ok => { if (ok) { const collection = this.rows; const index = collection.indexOf(row); if (index >= 0) collection.splice(index, 1); this.toast.success(`${this.singularLabel} “${row.name || row.title || row.student}” deleted.`); } }); }
  toggleStatus(row: Row): void { if (this.isTeacher) return; if (row.status || !row.resultStatus) row.status = row.status === 'Published' ? 'Draft' : row.status === 'Draft' ? 'Published' : row.status === 'Active' ? 'Inactive' : 'Active'; if (row.resultStatus) row.resultStatus = row.resultStatus === 'Published' ? 'Draft' : 'Published'; const state = row.resultStatus || row.status; this.toast.success(`“${row.name || row.title || row.student}” ${state === 'Published' ? 'published' : state === 'Draft' ? 'moved to drafts' : `marked ${String(state).toLowerCase()}`}.`); }
  togglePin(row: Row): void { if (this.isTeacher) return; row.pinned = !row.pinned; this.toast.success(row.pinned ? `“${row.title || row.name}” pinned to the top.` : `“${row.title || row.name}” unpinned.`); }
  convert(row: Row): void { this.confirm.confirm({ title: 'Convert inquiry to student?', message: `Create a student record for ${row.name}? This will add a mock student to the directory.`, confirmLabel: 'Convert to student' }).subscribe(ok => { if (ok) { row.status = 'Joined'; const student = this.mockData.addStudent({ name: row.name, father: row.parent || '', mother: '', phone: normalizeMobile(String(row.phone || '')), email: '', course: row.course, batch: this.isSchool ? 'Section A' : row.course.includes('12') ? 'Physics · Morning' : 'Chemistry · Evening', admission: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), dob: '', gender: '', address: '', city: '', state: '', pincode: '', monthlyFee: 0, discount: 0, feeStatus: 'Pending' }); this.toast.success(`${row.name} added to students.`); this.router.navigate(['/client/students', student.id]); } }); }
  addChild(): void { this.openRecord(); }
  initials(name: string): string { return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
  get filters(): string[] { if (this.key === 'teachers') return this.isSchool ? SCHOOL_DEPARTMENTS : this.options.subjects; if (this.key === 'admissions') return ['New', 'Contacted', 'Interested', 'Joined', 'Rejected']; if (this.key === 'posts') return ['Image', 'Video', 'Text', 'Announcement', 'Published', 'Draft']; if (this.key === 'notices') return ['General', 'Holiday', 'Exam', 'Fee Reminder', this.isSchool ? 'PTM' : 'New Batch', 'Important', 'Published', 'Draft']; if (this.key === 'materials') return ['PDF', 'Notes', 'Assignment', 'Video', 'Question Paper', 'Published', 'Draft']; if (this.key === 'gallery') return ['Published', 'Draft']; if (this.key === 'results') return ['Published', 'Draft']; return ['Active', 'Inactive']; }
  get filterLabel(): string { return this.key === 'teachers' ? (this.isSchool ? 'Department' : 'Subject') : this.key === 'admissions' ? (this.isSchool ? 'Admission status' : 'Enquiry status') : ['posts','notices','materials'].includes(this.key) ? 'Type / status' : 'Status'; }
  get cardMode(): boolean { return ['courses', 'posts', 'gallery', 'materials'].includes(this.key); }
  get statusTone(): 'success'|'warning'|'danger'|'neutral'|'info' { return 'success'; }
  trackById(_: number, row: Row): number { return row.id; }
  private configureWorkspaceFields(): void {
    const classes = [...Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`), 'JEE Foundation', 'JEE Preparation', 'NEET Preparation', 'Commerce Entrance'];
    const classGroups = [...Array.from({ length: 12 }, (_, index) => `Class ${index + 1} · ${index % 2 ? 'Evening' : 'Morning'}`), 'JEE · Weekend', 'NEET · Weekend'];
    const schoolExams = ['Unit Test 1', 'Unit Test 2', 'Term 1', 'Unit Test 3', 'Unit Test 4', 'Term 2'];
    this.config = { ...this.config, fields: this.config.fields.map(field => ({ ...field, options: field.options ? [...field.options] : undefined })) };
    if (this.isSchool) this.configureSchool(schoolExams);
    this.config.fields = this.config.fields.map(field => {
      if (this.isSchool && field.key === 'student') return { ...field, options: this.mockData.students.map(student => student.name) };
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

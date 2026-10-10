import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogService } from '../../core/confirmation-dialog.service';
import { MockDataService } from '../../core/mock-data.service';
import { RecordDialogComponent, RecordField } from './record-dialog.component';
import { TenantContextService } from '../../core/tenant-context.service';
import { MockAuthService } from '../../core/mock-auth.service';

interface FeatureConfig { title: string; description: string; singular: string; icon: string; fields: RecordField[]; action: string; }
type Row = any;
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
  get isCollege(): boolean { return !this.isShop && this.tenant.current.businessType === 'college'; }
  readonly collegePrograms: Row[] = [
    { id: 31, name: 'B.Sc Computer Science', description: 'Build strong foundations in computing, systems and software.', duration: '3 years', fee: '₹42,000 / year', subjects: 'Programming, Data Structures, Mathematics', status: 'Active', enrolled: 286, accent: 'blue' },
    { id: 32, name: 'B.Com', description: 'Develop practical knowledge across commerce and finance.', duration: '3 years', fee: '₹36,000 / year', subjects: 'Accounting, Economics, Business Law', status: 'Active', enrolled: 312, accent: 'teal' },
    { id: 33, name: 'BA Psychology', description: 'Explore human behaviour, research and wellbeing.', duration: '3 years', fee: '₹38,000 / year', subjects: 'Psychology, Sociology, Research Methods', status: 'Active', enrolled: 184, accent: 'amber' },
    { id: 34, name: 'BBA', description: 'Learn how organisations build and lead successful teams.', duration: '3 years', fee: '₹48,000 / year', subjects: 'Marketing, Finance, Management', status: 'Active', enrolled: 206, accent: 'blue' }
  ];
  readonly collegeData: Record<string, Row[]> = {
    teachers: [
      { id: 41, name: 'Dr. Neha Iyer', qualification: 'Ph.D. Computer Science', experience: '12 years', subjects: 'Data Structures, Programming', phone: '+91 98765 31001', email: 'neha.iyer@greenfield.edu', joining: '15 Jun 2018', status: 'Active', photo: 'NI', color: '#e2f2ed' },
      { id: 42, name: 'Prof. Rahul Mehta', qualification: 'M.Com, NET', experience: '10 years', subjects: 'Accounting, Economics', phone: '+91 98765 31002', email: 'rahul.mehta@greenfield.edu', joining: '03 Jan 2020', status: 'Active', photo: 'RM', color: '#f2eafa' },
      { id: 43, name: 'Dr. Ananya Rao', qualification: 'Ph.D. Psychology', experience: '9 years', subjects: 'Psychology, Research Methods', phone: '+91 98765 31003', email: 'ananya.rao@greenfield.edu', joining: '21 Mar 2021', status: 'Active', photo: 'AR', color: '#fff0df' }
    ],
    admissions: [
      { id: 41, name: 'Tanya Kapoor', parent: 'Ritika Kapoor', phone: '+91 98100 31001', course: 'B.Sc Computer Science', source: 'Website', date: '28 Sep 2026', status: 'New', followup: 'Today · 4:00 pm' },
      { id: 42, name: 'Rishabh Nair', parent: 'Sanjay Nair', phone: '+91 98100 31002', course: 'B.Com', source: 'Referral', date: '27 Sep 2026', status: 'Contacted', followup: '29 Sep 2026' },
      { id: 43, name: 'Amara Das', parent: 'Maya Das', phone: '+91 98100 31003', course: 'BA Psychology', source: 'Walk-in', date: '26 Sep 2026', status: 'Interested', followup: '30 Sep 2026' }
    ],
    results: [
      { id: 41, student: 'Ishita Rao', course: 'B.Sc Computer Science', batch: 'Year 2 · Section A', exam: 'Internal Assessment 2', examDate: '18 Sep 2026', subject: 'Data Structures', marks: 88, total: 100, percentage: '88%', grade: 'A', resultStatus: 'Published' },
      { id: 42, student: 'Aditya Menon', course: 'B.Com', batch: 'Year 1 · Section B', exam: 'Internal Assessment 2', examDate: '18 Sep 2026', subject: 'Accounting', marks: 82, total: 100, percentage: '82%', grade: 'A', resultStatus: 'Published' }
    ],
    notices: [
      { id: 41, title: 'Mid-term assessment schedule published', type: 'Exam', description: 'Review the examination schedule and assigned rooms in the student portal.', date: '25 Sep 2026', expires: '15 Oct 2026', status: 'Published', pinned: true },
      { id: 42, title: 'Annual cultural festival registrations', type: 'Event', description: 'Sign up for music, dance, theatre and student showcases.', date: '22 Sep 2026', expires: '04 Oct 2026', status: 'Published', pinned: false },
      { id: 43, title: 'Tuition installment reminder', type: 'Fee Reminder', description: 'The next tuition installment is due on October 5.', date: '20 Sep 2026', expires: '05 Oct 2026', status: 'Draft', pinned: false }
    ],
    materials: [
      { id: 41, title: 'Data structures · Lecture notes', description: 'Core concepts and worked examples for Unit 3.', course: 'B.Sc Computer Science', batch: 'Year 2 · Section A', subject: 'Data Structures', type: 'PDF', file: 'data-structures-notes.pdf', date: '26 Sep 2026', status: 'Published', size: '2.1 MB' },
      { id: 42, title: 'Database systems worksheet', description: 'Practice questions for the upcoming assessment.', course: 'B.Sc Computer Science', batch: 'Year 2 · Section A', subject: 'Database Systems', type: 'Assignment', file: 'database-systems.pdf', date: '24 Sep 2026', status: 'Published', size: '950 KB' }
    ]
  };
  readonly coachingCourses: Row[] = Array.from({ length: 12 }, (_, index) => ({ id: 100 + index, name: `Class ${index + 1}${index === 9 ? ' Foundation' : index >= 10 ? ' Science' : ''}`, description: `Guided coaching and practice for students in Class ${index + 1}.`, duration: '10 months', fee: index >= 10 ? '₹4,500 / month' : '₹2,800 / month', subjects: index >= 10 ? 'Physics, Chemistry, Mathematics' : 'Mathematics, Science, English', status: 'Active', enrolled: 64 + index * 9, accent: ['teal', 'blue', 'amber'][index % 3] }));
  key = 'teachers'; search = ''; filter = ''; view = 'table'; page = 0; startDate: string | Date = ''; endDate: string | Date = '';
  detail?: Row;
  selectedDate = '2026-09-28'; selectedBatch = 'All batches'; selectedTeacher = 'All teachers'; attendanceView: 'daily'|'monthly' = 'daily';
  readonly featureData: Record<string, Row[]> = {
    teachers: [
      { id: 1, name: 'Priya Nair', qualification: 'M.Sc. Physics, B.Ed.', experience: '8 years', subjects: 'Physics, Mathematics', phone: '+91 98765 12001', email: 'priya.nair@northstar.edu', joining: '15 Jun 2022', status: 'Active', photo: 'PN', color: '#e2f2ed' },
      { id: 2, name: 'Ankit Rao', qualification: 'M.Sc. Chemistry', experience: '6 years', subjects: 'Chemistry', phone: '+91 98765 12002', email: 'ankit.rao@northstar.edu', joining: '03 Jan 2023', status: 'Active', photo: 'AR', color: '#f2eafa' },
      { id: 3, name: 'Nisha Thomas', qualification: 'M.A. English, B.Ed.', experience: '11 years', subjects: 'English', phone: '+91 98765 12003', email: 'nisha.thomas@northstar.edu', joining: '21 Mar 2020', status: 'Active', photo: 'NT', color: '#fff0df' },
      { id: 4, name: 'Dev Malhotra', qualification: 'M.Com, NET', experience: '5 years', subjects: 'Accounts, Commerce', phone: '+91 98765 12004', email: 'dev.m@northstar.edu', joining: '07 Aug 2024', status: 'Inactive', photo: 'DM', color: '#e7eefb' }
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
      { id: 1, name: 'Aditi Kulkarni', parent: 'Sameer Kulkarni', phone: '+91 98100 21001', course: 'Class 12 Science', source: 'Website', date: '28 Sep 2026', status: 'New', followup: 'Today · 4:00 pm' },
      { id: 2, name: 'Vivaan Patel', parent: 'Rina Patel', phone: '+91 98100 21002', course: 'Class 11 Science', source: 'Referral', date: '27 Sep 2026', status: 'Contacted', followup: '29 Sep 2026' },
      { id: 3, name: 'Anaya Bose', parent: 'Arindam Bose', phone: '+91 98100 21003', course: 'Class 10 Foundation', source: 'Instagram', date: '26 Sep 2026', status: 'Interested', followup: '30 Sep 2026' },
      { id: 4, name: 'Ishaan Gupta', parent: 'Nitin Gupta', phone: '+91 98100 21004', course: 'Class 12 Science', source: 'Walk-in', date: '24 Sep 2026', status: 'Joined', followup: '—' }
    ],
    posts: [
      { id: 1, title: 'New batch admissions are open', description: 'Our new academic batches are now enrolling. Join us for focused learning and a great start to the year.', type: 'Announcement', date: '26 Sep 2026', status: 'Published', pinned: true, media: 'assets/images/gallery/01.png', views: 124 },
      { id: 2, title: 'A proud moment for our students', description: 'Celebrating the hard work, curiosity and progress of our learners this month.', type: 'Image', date: '24 Sep 2026', status: 'Published', pinned: false, media: 'assets/images/gallery/02.png', views: 89 },
      { id: 3, title: 'Parent orientation this Friday', description: 'Meet the faculty and learn about our learning approach for the new term.', type: 'Text', date: '22 Sep 2026', status: 'Draft', pinned: false, media: '', views: 0 }
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
    ],
    departments: [
      { id: 1, name: 'Computer Science', head: 'Dr. Neha Iyer', programs: 3, students: 642, faculty: 32, status: 'Active' },
      { id: 2, name: 'Commerce & Management', head: 'Prof. Rahul Mehta', programs: 4, students: 518, faculty: 28, status: 'Active' },
      { id: 3, name: 'Life Sciences', head: 'Dr. Ananya Rao', programs: 2, students: 394, faculty: 24, status: 'Active' },
      { id: 4, name: 'Arts & Humanities', head: 'Dr. Kavita Menon', programs: 3, students: 361, faculty: 22, status: 'Active' }
    ],
    programs: [
      { id: 1, name: 'B.Sc Computer Science', department: 'Computer Science', duration: '3 years', subjects: 'Data Structures, Mathematics, Programming', students: 286, status: 'Active' },
      { id: 2, name: 'B.Com', department: 'Commerce & Management', duration: '3 years', subjects: 'Accounting, Economics, Business Law', students: 312, status: 'Active' },
      { id: 3, name: 'BA Psychology', department: 'Arts & Humanities', duration: '3 years', subjects: 'Psychology, Sociology, Research Methods', students: 184, status: 'Active' },
      { id: 4, name: 'BBA', department: 'Commerce & Management', duration: '3 years', subjects: 'Marketing, Finance, Management', students: 206, status: 'Active' }
    ],
    timetable: [
      { id: 1, name: 'Introduction to Psychology', program: 'BA Psychology', faculty: 'Dr. Ananya Rao', room: 'A-204', timing: '09:00 – 10:00 am', day: 'Monday', status: 'Active' },
      { id: 2, name: 'Principles of Microeconomics', program: 'B.Com', faculty: 'Prof. Rahul Mehta', room: 'B-108', timing: '10:30 – 11:30 am', day: 'Monday', status: 'Active' },
      { id: 3, name: 'Data Structures & Algorithms', program: 'B.Sc Computer Science', faculty: 'Prof. Neha Iyer', room: 'Lab 3', timing: '12:00 – 01:00 pm', day: 'Monday', status: 'Active' },
      { id: 4, name: 'Business Communication', program: 'BBA', faculty: 'Dr. Karan Shah', room: 'C-302', timing: '02:00 – 03:00 pm', day: 'Monday', status: 'Active' }
    ]
  };
  readonly configMap: Record<string, FeatureConfig> = {
    teachers: { title: 'Teachers', description: 'Manage faculty profiles, subjects and teaching assignments.', singular: 'teacher', icon: 'school', action: 'Add teacher', fields: [{ key: 'name', label: 'Full name', required: true }, { key: 'qualification', label: 'Qualification', required: true }, { key: 'experience', label: 'Experience', hint: 'e.g. 5 years' }, { key: 'subjects', label: 'Subjects', type: 'tags', required: true }, { key: 'phone', label: 'Phone', required: true }, { key: 'email', label: 'Email', type: 'email', required: true }, { key: 'joining', label: 'Joining date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true }] },
    courses: { title: 'Courses', description: 'Build and manage the programs offered by your institute.', singular: 'course', icon: 'menu_book', action: 'Add course', fields: [{ key: 'name', label: 'Course name', required: true }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'duration', label: 'Duration', required: true }, { key: 'fee', label: 'Fee', required: true }, { key: 'subjects', label: 'Subjects', type: 'tags', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true }] },
    departments: { title: 'Departments', description: 'Organize academic departments, faculty teams and student groups.', singular: 'department', icon: 'account_tree', action: 'Add department', fields: [{ key: 'name', label: 'Department name', required: true }, { key: 'head', label: 'Department head', required: true }, { key: 'programs', label: 'Number of programs', type: 'number' }, { key: 'students', label: 'Students', type: 'number' }, { key: 'faculty', label: 'Faculty members', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true }] },
    programs: { title: 'Programs & subjects', description: 'Manage college programs, curriculum and subject groups.', singular: 'program', icon: 'menu_book', action: 'Add program', fields: [{ key: 'name', label: 'Program name', required: true }, { key: 'department', label: 'Department', type: 'select', options: ['Computer Science', 'Commerce & Management', 'Life Sciences', 'Arts & Humanities'], required: true }, { key: 'duration', label: 'Program duration', required: true }, { key: 'subjects', label: 'Core subjects', type: 'tags', required: true }, { key: 'students', label: 'Enrolled students', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true }] },
    timetable: { title: 'Class timetable', description: 'Coordinate teaching schedules, classrooms and faculty.', singular: 'class', icon: 'calendar_month', action: 'Add class', fields: [{ key: 'name', label: 'Class / subject', required: true }, { key: 'program', label: 'Program', type: 'select', options: ['BA Psychology', 'B.Com', 'B.Sc Computer Science', 'BBA'], required: true }, { key: 'faculty', label: 'Faculty member', required: true }, { key: 'room', label: 'Room / lab', required: true }, { key: 'timing', label: 'Class time', required: true }, { key: 'day', label: 'Day', type: 'select', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], required: true }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true }] },
    batches: { title: 'Batches', description: 'Plan class schedules, rooms and faculty assignments.', singular: 'batch', icon: 'groups', action: 'Create batch', fields: [{ key: 'name', label: 'Batch name', required: true }, { key: 'course', label: 'Course', type: 'select', options: ['Class 12 Science', 'Class 11 Science', 'Class 10 Foundation', 'Class 12 Commerce'], required: true }, { key: 'teacher', label: 'Teacher', type: 'select', options: ['Priya Nair', 'Ankit Rao', 'Nisha Thomas', 'Dev Malhotra'], required: true }, { key: 'start', label: 'Start date', type: 'date', required: true }, { key: 'end', label: 'End date', type: 'date' }, { key: 'timing', label: 'Timing', required: true }, { key: 'days', label: 'Days', required: true }, { key: 'room', label: 'Room' }, { key: 'students', label: 'Student count', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true }] },
    admissions: { title: 'Admissions & inquiries', description: 'Track prospective students from their first inquiry to enrollment.', singular: 'inquiry', icon: 'person_add_alt', action: 'Add inquiry', fields: [{ key: 'name', label: 'Student name', required: true }, { key: 'parent', label: 'Parent name', required: true }, { key: 'phone', label: 'Phone', required: true }, { key: 'course', label: 'Course', type: 'select', options: ['Class 12 Science', 'Class 11 Science', 'Class 10 Foundation', 'Class 12 Commerce'] }, { key: 'source', label: 'Source', type: 'select', options: ['Website', 'Referral', 'Instagram', 'Walk-in', 'Phone'] }, { key: 'date', label: 'Inquiry date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['New', 'Contacted', 'Interested', 'Joined', 'Rejected'], required: true }, { key: 'followup', label: 'Follow-up', type: 'date' }] },
    posts: { title: 'Posts & updates', description: 'Share news, moments and announcements with your community.', singular: 'post', icon: 'campaign', action: 'Create post', fields: [{ key: 'title', label: 'Title', required: true }, { key: 'description', label: 'Description', type: 'textarea', required: true }, { key: 'type', label: 'Post type', type: 'select', options: ['Image', 'Video', 'Text', 'Announcement'], required: true }, { key: 'media', label: 'Upload image or video', type: 'file' }, { key: 'date', label: 'Publish date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] },
    gallery: { title: 'Gallery', description: 'Bring campus life together in albums of photos and videos.', singular: 'album', icon: 'photo_library', action: 'Create album', fields: [{ key: 'name', label: 'Album name', required: true }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'media', label: 'Cover image / media', type: 'file' }, { key: 'date', label: 'Date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] },
    notices: { title: 'Notices', description: 'Keep students and families up to date with important announcements.', singular: 'notice', icon: 'campaign', action: 'Add notice', fields: [{ key: 'title', label: 'Notice title', required: true }, { key: 'description', label: 'Notice details', type: 'textarea', required: true }, { key: 'type', label: 'Notice type', type: 'select', options: ['General', 'Holiday', 'Exam', 'Fee Reminder', 'New Batch', 'Important'], required: true }, { key: 'date', label: 'Publish date', type: 'date' }, { key: 'expires', label: 'Expiry date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] },
    results: { title: 'Results', description: 'Record and publish student exam performance.', singular: 'result', icon: 'assignment_turned_in', action: 'Add result', fields: [{ key: 'student', label: 'Student', type: 'select', options: ['Aarav Sharma', 'Meera Kapoor', 'Diya Iyer', 'Rohan Verma'], required: true }, { key: 'course', label: 'Course', type: 'select', options: ['Class 12 Science', 'Class 11 Science', 'Class 10 Foundation'] }, { key: 'batch', label: 'Batch', type: 'select', options: ['Physics · Morning', 'Chemistry · Evening', 'Foundation · Afternoon'] }, { key: 'exam', label: 'Exam name', required: true }, { key: 'examDate', label: 'Exam date', type: 'date' }, { key: 'subject', label: 'Subject', type: 'select', options: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English'] }, { key: 'marks', label: 'Marks', type: 'number', required: true }, { key: 'total', label: 'Total marks', type: 'number', required: true }, { key: 'grade', label: 'Grade' }, { key: 'resultStatus', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] },
    materials: { title: 'Study materials', description: 'Organize and share learning resources with your classes.', singular: 'material', icon: 'folder_open', action: 'Upload material', fields: [{ key: 'title', label: 'Title', required: true }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'course', label: 'Course', type: 'select', options: ['Class 12 Science', 'Class 11 Science', 'Class 10 Foundation'] }, { key: 'batch', label: 'Batch', type: 'select', options: ['Physics · Morning', 'Chemistry · Evening', 'Foundation · Afternoon'] }, { key: 'subject', label: 'Subject', type: 'select', options: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English'] }, { key: 'type', label: 'Material type', type: 'select', options: ['PDF', 'Notes', 'Assignment', 'Video', 'Question Paper'], required: true }, { key: 'file', label: 'File', type: 'file' }, { key: 'date', label: 'Publish date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'], required: true }] }
  };
  constructor(private route: ActivatedRoute, public router: Router, private dialog: MatDialog, private confirm: ConfirmationDialogService, private mockData: MockDataService, private tenant: TenantContextService, public auth: MockAuthService) {}
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
  get rows(): Row[] { if (this.key === 'courses' && !this.isShop) return this.isCollege ? this.collegePrograms : this.coachingCourses; if (this.isCollege && this.collegeData[this.key]) return this.collegeData[this.key]; return this.isShop && this.shopSocialData[this.key] ? this.shopSocialData[this.key] : this.featureData[this.key] || []; }
  get filtered(): Row[] {
    const query = this.search.trim().toLowerCase();
    return this.rows.filter(row => (!query || Object.values(row).join(' ').toLowerCase().includes(query)) && (!this.filter || String(row.status || '').toLowerCase() === this.filter.toLowerCase() || String(row.resultStatus || '').toLowerCase() === this.filter.toLowerCase() || String(row.type || '').toLowerCase() === this.filter.toLowerCase() || String(row.subjects || '').toLowerCase().includes(this.filter.toLowerCase())) && this.inDateRange(row.date || row.joining || row.examDate));
  }
  openRecord(row?: Row): void {
    if (this.isTeacher && !['results', 'materials'].includes(this.key)) return;
    const ref = this.dialog.open(RecordDialogComponent, { width: '660px', maxWidth: 'calc(100vw - 24px)', data: { title: `${row ? 'Edit' : 'Add'} ${this.config.singular}`, submitLabel: row ? 'Save changes' : this.config.action, fields: this.config.fields, record: row } });
    ref.afterClosed().subscribe(value => {
      if (!value) { if (this.router.url.endsWith('/add')) this.router.navigate([`${this.isShop ? '/shop' : '/client'}/${this.key}`]); return; }
      const normalized: Row = { ...value, id: row?.id || Date.now() };
      if (this.key === 'results' && normalized.marks !== undefined && normalized.total) { normalized.percentage = `${Math.round(Number(normalized.marks) / Number(normalized.total) * 100)}%`; normalized.resultStatus = normalized.resultStatus || 'Draft'; }
      if (this.key === 'teachers') { normalized.photo ||= (normalized.name || '?').split(' ').map((word: string) => word[0]).join('').slice(0, 2).toUpperCase(); normalized.color ||= '#e2f2ed'; }
      if (row) Object.assign(row, normalized); else this.rows.unshift(normalized);
      if (this.router.url.endsWith('/add')) this.router.navigate([`${this.isShop ? '/shop' : '/client'}/${this.key}`]);
    });
  }
  viewRow(row: Row): void { this.dialog.open(RecordDialogComponent, { width: '660px', maxWidth: 'calc(100vw - 24px)', data: { title: `${this.config.singular} details`, submitLabel: 'Done', fields: this.config.fields, record: row, readonly: true } }); }
  followUp(row: Row): void { if (this.isTeacher) return; const ref = this.dialog.open(RecordDialogComponent, { width: '470px', maxWidth: 'calc(100vw - 24px)', data: { title: `Schedule follow-up · ${row.name}`, submitLabel: 'Save follow-up', fields: [{ key: 'followup', label: 'Follow-up date and time', type: 'text', required: true }, { key: 'notes', label: 'Follow-up notes', type: 'textarea' }], record: { followup: row.followup } } }); ref.afterClosed().subscribe(value => { if (value) row.followup = value.followup; }); }
  download(row: Row): void { const blob = new Blob([`Demo study material: ${row.title}\n${row.description || ''}\nFile reference: ${row.file || ''}`], { type: 'text/plain' }); const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = (row.file || `${row.title}.txt`).split('/').pop(); anchor.click(); URL.revokeObjectURL(anchor.href); }
  preview(media: string): void { if (media) window.open(media, '_blank', 'noopener'); }
  uploadMedia(row: Row): void { if (this.isTeacher) return; const ref = this.dialog.open(RecordDialogComponent, { width: '470px', maxWidth: 'calc(100vw - 24px)', data: { title: `Upload media · ${row.name}`, submitLabel: 'Add to album', fields: [{ key: 'media', label: 'Photo or video file', type: 'file', required: true }] } }); ref.afterClosed().subscribe(value => { if (value?.media) { row.media = value.media; row.count = (Number(row.count) || 0) + 1; } }); }
  private inDateRange(value: string): boolean { if (!value || (!this.startDate && !this.endDate)) return true; const date = new Date(value); const from = this.startDate ? new Date(this.startDate instanceof Date ? this.startDate.getTime() : this.startDate) : undefined; const to = this.endDate ? new Date(this.endDate instanceof Date ? this.endDate.getTime() : this.endDate) : undefined; return !Number.isNaN(date.getTime()) && (!from || date >= from) && (!to || date <= to); }
  remove(row: Row): void { if (this.isTeacher) return; this.confirm.confirm({ title: `Delete ${this.config.singular}?`, message: `Delete “${row.name || row.title}” from this workspace? This mock action cannot be undone.`, confirmLabel: `Delete ${this.config.singular}`, destructive: true }).subscribe(ok => { if (ok) { const collection = this.rows; const index = collection.indexOf(row); if (index >= 0) collection.splice(index, 1); } }); }
  toggleStatus(row: Row): void { if (this.isTeacher) return; row.status = row.status === 'Published' ? 'Draft' : row.status === 'Draft' ? 'Published' : row.status === 'Active' ? 'Inactive' : 'Active'; if (row.resultStatus) row.resultStatus = row.resultStatus === 'Published' ? 'Draft' : 'Published'; }
  togglePin(row: Row): void { if (this.isTeacher) return; row.pinned = !row.pinned; }
  convert(row: Row): void { this.confirm.confirm({ title: 'Convert inquiry to student?', message: `Create a student record for ${row.name}? This will add a mock student to the directory.`, confirmLabel: 'Convert to student' }).subscribe(ok => { if (ok) { row.status = 'Joined'; const student = this.mockData.addStudent({ name: row.name, father: row.parent || '', mother: '', phone: row.phone, email: '', course: row.course, batch: row.course.includes('12') ? 'Physics · Morning' : 'Chemistry · Evening', admission: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), dob: '', gender: '', address: '', city: '', state: '', pincode: '', monthlyFee: 0, discount: 0, feeStatus: 'Pending' }); this.router.navigate(['/client/students', student.id]); } }); }
  addChild(): void { this.openRecord(); }
  initials(name: string): string { return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
  get filters(): string[] { if (this.key === 'teachers') return this.options.subjects; if (this.key === 'admissions') return ['New', 'Contacted', 'Interested', 'Joined', 'Rejected']; if (this.key === 'posts') return ['Image', 'Video', 'Text', 'Announcement', 'Published', 'Draft']; if (this.key === 'notices') return ['General', 'Holiday', 'Exam', 'Fee Reminder', 'New Batch', 'Important', 'Published', 'Draft']; if (this.key === 'materials') return ['PDF', 'Notes', 'Assignment', 'Video', 'Question Paper', 'Published', 'Draft']; if (this.key === 'gallery') return ['Published', 'Draft']; if (this.key === 'results') return ['Published', 'Draft']; return ['Active', 'Inactive']; }
  get filterLabel(): string { return this.key === 'teachers' ? 'Subject' : this.key === 'admissions' ? 'Inquiry status' : ['posts','notices','materials'].includes(this.key) ? 'Type / status' : 'Status'; }
  get cardMode(): boolean { return ['courses', 'posts', 'gallery', 'materials'].includes(this.key); }
  get statusTone(): 'success'|'warning'|'danger'|'neutral'|'info' { return 'success'; }
  trackById(_: number, row: Row): number { return row.id; }
  private configureWorkspaceFields(): void {
    const programs = ['BA Psychology', 'B.Com', 'B.Sc Computer Science', 'B.Sc Life Sciences', 'BBA', 'BCA', 'B.Tech'];
    const classes = [...Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`), 'JEE Foundation', 'JEE Preparation', 'NEET Preparation', 'Commerce Entrance'];
    const classGroups = [...Array.from({ length: 12 }, (_, index) => `Class ${index + 1} · ${index % 2 ? 'Evening' : 'Morning'}`), 'JEE · Weekend', 'NEET · Weekend'];
    const collegeGroups = ['Year 1 · Section A', 'Year 1 · Section B', 'Year 2 · Section A', 'Year 2 · Section B', 'Year 2 · Section C', 'Year 3 · Section A', 'Year 3 · Section B'];
    this.config = { ...this.config, fields: this.config.fields.map(field => ({ ...field, options: field.options ? [...field.options] : undefined })) };
    if (this.key === 'courses' && this.isCollege) this.config = { ...this.config, title: 'Programs & subjects', description: 'Manage college programs, curriculum and subject groups.', singular: 'program', action: 'Add program', fields: this.config.fields.map(field => ({ ...field, label: field.key === 'name' ? 'Program name' : field.key === 'duration' ? 'Program duration' : field.key === 'fee' ? 'Annual tuition fee' : field.label })) };
    if (this.key === 'teachers' && this.isCollege) this.config = { ...this.config, title: 'Faculty', description: 'Manage college faculty profiles and department assignments.', singular: 'faculty member', action: 'Add faculty member' };
    if (this.key === 'admissions' && this.isCollege) this.config = { ...this.config, title: 'Admissions & applications', description: 'Follow applicants from first enquiry through enrollment.', singular: 'application', action: 'Add applicant', fields: this.config.fields.map(field => ({ ...field, label: field.key === 'name' ? 'Applicant name' : field.key === 'parent' ? 'Guardian / contact name' : field.label })) };
    if (this.key === 'results' && this.isCollege) this.config = { ...this.config, title: 'Exams & results', description: 'Record assessments and publish student results.', singular: 'result' };
    this.config.fields = this.config.fields.map(field => {
      if (this.isCollege && field.key === 'student') return { ...field, options: this.mockData.students.map(student => student.name) };
      if (!['course', 'batch'].includes(field.key)) return field;
      const options = this.isCollege ? field.key === 'course' ? programs : collegeGroups : field.key === 'course' ? classes : classGroups;
      return { ...field, label: this.isCollege ? (field.key === 'course' ? 'Program' : 'Year / section') : (field.key === 'course' ? 'Class / course' : 'Class / batch'), options };
    });
  }
}

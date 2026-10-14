import { RecordField } from '../management/record-dialog.component';
import { BusinessType } from '../../core/models/business-type';
import { DemoRole } from '../../core/mock-auth.service';
import { SCHOOL_CLASSES, SCHOOL_SECTIONS, SCHOOL_SUBJECTS, SCHOOL_TERMS, COACHING_SUBJECTS } from '../../core/workspace-terms';

export type ModuleRow = Record<string, any> & { id: number };
export interface ModuleColumn { key: string; label: string; badge?: boolean; sub?: string; }

/** One academic page (Classes, Homework, Tests…) rendered by ModulePageComponent. */
export interface ModuleConfig {
  title: string;
  description: string;
  icon: string;
  singular: string;
  action: string;
  columns: ModuleColumn[];
  fields: RecordField[];
  rows: ModuleRow[];
  /** Roles that may add, edit and delete. Everyone else who can open the page only views. */
  editors: DemoRole[];
  /** Column used for the filter dropdown. */
  filterKey?: string;
  /** Optional shortcut shown on each row, e.g. "Take attendance". */
  rowLink?: { label: string; icon: string; route: string };
}

const STATUS = ['Active', 'Inactive'];
const PUBLISH = ['Published', 'Draft'];
const TASK_STATUS = ['Assigned', 'Closed'];
const COACHING_BATCHES = ['Class 10 Foundation · Morning', 'Class 12 Science · Evening', 'JEE · Weekend', 'NEET · Weekend'];
const SCHOOL_GROUPS = ['Class 6 · Section A', 'Class 7 · Section B', 'Class 8 · Section A', 'Class 9 · Section A', 'Class 10 · Section B'];
const status = (rows: Omit<ModuleRow, 'id'>[]): ModuleRow[] => rows.map((row, index) => ({ id: index + 1, ...row }));

/** Owner-side setup pages (school). */
const SCHOOL_SETUP: Record<string, ModuleConfig> = {
  sessions: {
    title: 'Academic sessions', description: 'Plan school years, terms and the current session.', icon: 'event_note', singular: 'session', action: 'Add session', editors: ['Owner'], filterKey: 'status',
    columns: [{ key: 'name', label: 'Session' }, { key: 'start', label: 'Starts' }, { key: 'end', label: 'Ends' }, { key: 'terms', label: 'Terms' }, { key: 'status', label: 'Status', badge: true }],
    fields: [{ key: 'name', label: 'Session name', required: true, hint: 'e.g. 2026–27' }, { key: 'start', label: 'Start date', type: 'date', required: true }, { key: 'end', label: 'End date', type: 'date', required: true }, { key: 'terms', label: 'Terms', type: 'tags', hint: 'e.g. Term 1, Term 2' }, { key: 'status', label: 'Status', type: 'select', options: ['Current', 'Upcoming', 'Completed'], required: true }],
    rows: status([
      { name: '2026–27', start: '01 Apr 2026', end: '31 Mar 2027', terms: 'Term 1, Term 2', status: 'Current' },
      { name: '2027–28', start: '01 Apr 2027', end: '31 Mar 2028', terms: 'Term 1, Term 2', status: 'Upcoming' },
      { name: '2025–26', start: '01 Apr 2025', end: '31 Mar 2026', terms: 'Term 1, Term 2', status: 'Completed' }
    ])
  },
  classes: {
    title: 'Classes', description: 'Classes offered this session, with class teachers and strength.', icon: 'class', singular: 'class', action: 'Add class', editors: ['Owner'], filterKey: 'status',
    columns: [{ key: 'name', label: 'Class' }, { key: 'sections', label: 'Sections' }, { key: 'classTeacher', label: 'Coordinator' }, { key: 'students', label: 'Students' }, { key: 'status', label: 'Status', badge: true }],
    fields: [{ key: 'name', label: 'Class', type: 'select', options: SCHOOL_CLASSES, required: true }, { key: 'sections', label: 'Sections', type: 'tags', hint: 'e.g. A, B, C' }, { key: 'classTeacher', label: 'Coordinator (full name)' }, { key: 'students', label: 'Students', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: STATUS, required: true }],
    rows: status([
      { name: 'Class 6', sections: 'A, B', classTeacher: 'Meena Joshi', students: 72, status: 'Active' },
      { name: 'Class 7', sections: 'A, B', classTeacher: 'Rakesh Kumar', students: 68, status: 'Active' },
      { name: 'Class 8', sections: 'A, B, C', classTeacher: 'Sunita Verma', students: 96, status: 'Active' },
      { name: 'Class 9', sections: 'A, B', classTeacher: 'Arjun Menon', students: 64, status: 'Active' },
      { name: 'Class 10', sections: 'A, B', classTeacher: 'Kavita Rao', students: 61, status: 'Active' }
    ])
  },
  sections: {
    title: 'Sections', description: 'Sections within each class, with room and class teacher.', icon: 'view_week', singular: 'section', action: 'Add section', editors: ['Owner'], filterKey: 'className',
    columns: [{ key: 'name', label: 'Section' }, { key: 'className', label: 'Class' }, { key: 'classTeacher', label: 'Class teacher' }, { key: 'room', label: 'Room' }, { key: 'capacity', label: 'Capacity' }, { key: 'status', label: 'Status', badge: true }],
    fields: [{ key: 'name', label: 'Section', type: 'select', options: SCHOOL_SECTIONS, required: true }, { key: 'className', label: 'Class', type: 'select', options: SCHOOL_CLASSES, required: true }, { key: 'classTeacher', label: 'Class teacher (full name)', required: true }, { key: 'room', label: 'Room' }, { key: 'capacity', label: 'Capacity', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: STATUS, required: true }],
    rows: status([
      { name: 'Section A', className: 'Class 6', classTeacher: 'Meena Joshi', room: '101', capacity: 40, status: 'Active' },
      { name: 'Section B', className: 'Class 6', classTeacher: 'Pooja Singh', room: '102', capacity: 40, status: 'Active' },
      { name: 'Section A', className: 'Class 9', classTeacher: 'Arjun Menon', room: '201', capacity: 35, status: 'Active' },
      { name: 'Section B', className: 'Class 10', classTeacher: 'Kavita Rao', room: '204', capacity: 35, status: 'Active' }
    ])
  },
  subjects: {
    title: 'Subjects', description: 'Subjects taught in each class and the teachers assigned to them.', icon: 'menu_book', singular: 'subject', action: 'Add subject', editors: ['Owner'], filterKey: 'className',
    columns: [{ key: 'name', label: 'Subject' }, { key: 'code', label: 'Code' }, { key: 'className', label: 'Class' }, { key: 'teacher', label: 'Teacher' }, { key: 'periods', label: 'Periods / week' }, { key: 'status', label: 'Status', badge: true }],
    fields: [{ key: 'name', label: 'Subject', type: 'select', options: SCHOOL_SUBJECTS, required: true }, { key: 'code', label: 'Subject code', hint: 'e.g. MATH-09' }, { key: 'className', label: 'Class', type: 'select', options: SCHOOL_CLASSES, required: true }, { key: 'teacher', label: 'Teacher (full name)', required: true }, { key: 'periods', label: 'Periods per week', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: STATUS, required: true }],
    rows: status([
      { name: 'Mathematics', code: 'MATH-09', className: 'Class 9', teacher: 'Arjun Menon', periods: 7, status: 'Active' },
      { name: 'Science', code: 'SCI-09', className: 'Class 9', teacher: 'Sunita Verma', periods: 6, status: 'Active' },
      { name: 'English', code: 'ENG-10', className: 'Class 10', teacher: 'Kavita Rao', periods: 6, status: 'Active' },
      { name: 'Social Science', code: 'SST-08', className: 'Class 8', teacher: 'Rakesh Kumar', periods: 5, status: 'Active' }
    ])
  },
  events: {
    title: 'Events', description: 'School events, celebrations and parent meetings.', icon: 'celebration', singular: 'event', action: 'Add event', editors: ['Owner'], filterKey: 'status',
    columns: [{ key: 'name', label: 'Event' }, { key: 'date', label: 'Date' }, { key: 'venue', label: 'Venue' }, { key: 'audience', label: 'For' }, { key: 'status', label: 'Status', badge: true }],
    fields: [{ key: 'name', label: 'Event name', required: true }, { key: 'date', label: 'Date', type: 'date', required: true }, { key: 'venue', label: 'Venue' }, { key: 'audience', label: 'For', type: 'select', options: ['All', 'Students', 'Parents', 'Staff'], required: true }, { key: 'description', label: 'Details', type: 'textarea' }, { key: 'status', label: 'Status', type: 'select', options: ['Upcoming', 'Completed', 'Cancelled'], required: true }],
    rows: status([
      { name: 'Annual Sports Day', date: '14 Nov 2026', venue: 'School ground', audience: 'All', status: 'Upcoming' },
      { name: 'Parent–Teacher Meeting', date: '25 Oct 2026', venue: 'Classrooms', audience: 'Parents', status: 'Upcoming' },
      { name: 'Science Exhibition', date: '20 Sep 2026', venue: 'Auditorium', audience: 'Students', status: 'Completed' }
    ])
  }
};

function assessments(type: BusinessType): ModuleConfig {
  const school = type === 'school';
  return {
    title: school ? 'Exams' : 'Tests', description: school ? 'Term exams, unit tests and their schedule.' : 'Weekly and chapter tests for each batch.', icon: 'quiz', singular: school ? 'exam' : 'test', action: school ? 'Schedule exam' : 'Schedule test', editors: ['Owner', 'Teacher'], filterKey: 'status',
    columns: [{ key: 'name', label: school ? 'Exam' : 'Test' }, { key: 'group', label: school ? 'Class' : 'Batch' }, { key: 'subject', label: 'Subject' }, { key: 'date', label: 'Date' }, { key: 'maxMarks', label: 'Max marks' }, { key: 'status', label: 'Status', badge: true }],
    fields: [{ key: 'name', label: school ? 'Exam name' : 'Test name', required: true, hint: school ? 'e.g. Term 1 – Mid-term' : 'e.g. Chapter 4 test' }, ...(school ? [{ key: 'term', label: 'Term', type: 'select' as const, options: SCHOOL_TERMS, required: true }] : []), { key: 'group', label: school ? 'Class / section' : 'Batch', type: 'select', options: school ? SCHOOL_GROUPS : COACHING_BATCHES, required: true }, { key: 'subject', label: 'Subject', type: 'select', options: school ? SCHOOL_SUBJECTS : COACHING_SUBJECTS, required: true }, { key: 'date', label: 'Date', type: 'date', required: true }, { key: 'maxMarks', label: 'Maximum marks', type: 'number', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Completed', 'Cancelled'], required: true }],
    rows: school ? status([
      { name: 'Term 1 – Mid-term', term: 'Term 1', group: 'Class 9 · Section A', subject: 'Mathematics', date: '28 Oct 2026', maxMarks: 80, status: 'Scheduled' },
      { name: 'Term 1 – Mid-term', term: 'Term 1', group: 'Class 9 · Section A', subject: 'Science', date: '30 Oct 2026', maxMarks: 80, status: 'Scheduled' },
      { name: 'Unit test 2', term: 'Term 1', group: 'Class 10 · Section B', subject: 'English', date: '18 Sep 2026', maxMarks: 25, status: 'Completed' }
    ]) : status([
      { name: 'Chapter 4 test', group: 'Class 12 Science · Evening', subject: 'Physics', date: '19 Oct 2026', maxMarks: 50, status: 'Scheduled' },
      { name: 'Weekly test 6', group: 'Class 10 Foundation · Morning', subject: 'Mathematics', date: '12 Oct 2026', maxMarks: 40, status: 'Completed' },
      { name: 'Mock test 1', group: 'NEET · Weekend', subject: 'Biology', date: '26 Oct 2026', maxMarks: 180, status: 'Scheduled' }
    ])
  };
}

function tasks(type: BusinessType, kind: 'assignments' | 'homework'): ModuleConfig {
  const school = type === 'school';
  const homework = kind === 'homework';
  return {
    title: homework ? 'Homework' : 'Assignments', description: homework ? 'Daily homework for your classes.' : 'Assignments with due dates and submissions.', icon: homework ? 'edit_note' : 'assignment', singular: homework ? 'homework' : 'assignment', action: homework ? 'Give homework' : 'Create assignment', editors: ['Teacher'], filterKey: 'status',
    columns: [{ key: 'title', label: 'Title' }, { key: 'group', label: school ? 'Class' : 'Batch' }, { key: 'subject', label: 'Subject' }, { key: 'due', label: 'Due' }, ...(homework ? [] : [{ key: 'submitted', label: 'Submitted' }]), { key: 'status', label: 'Status', badge: true }],
    fields: [{ key: 'title', label: 'Title', required: true }, { key: 'group', label: school ? 'Class / section' : 'Batch', type: 'select', options: school ? SCHOOL_GROUPS : COACHING_BATCHES, required: true }, { key: 'subject', label: 'Subject', type: 'select', options: school ? SCHOOL_SUBJECTS : COACHING_SUBJECTS, required: true }, { key: 'due', label: 'Due date', type: 'date', required: true }, { key: 'description', label: 'Instructions', type: 'textarea' }, ...(homework ? [] : [{ key: 'file', label: 'Attachment', type: 'file' as const }]), { key: 'status', label: 'Status', type: 'select', options: TASK_STATUS, required: true }],
    rows: homework ? status([
      { title: 'Exercise 5.2, Q1–10', group: 'Class 9 · Section A', subject: 'Mathematics', due: '15 Oct 2026', status: 'Assigned' },
      { title: 'Read chapter 7 and answer questions', group: 'Class 8 · Section A', subject: 'Science', due: '16 Oct 2026', status: 'Assigned' },
      { title: 'Write a letter to the editor', group: 'Class 10 · Section B', subject: 'English', due: '10 Oct 2026', status: 'Closed' }
    ]) : status(school ? [
      { title: 'Science project: water cycle model', group: 'Class 7 · Section B', subject: 'Science', due: '24 Oct 2026', submitted: '18 / 34', status: 'Assigned' },
      { title: 'Map work: rivers of India', group: 'Class 9 · Section A', subject: 'Social Science', due: '20 Oct 2026', submitted: '29 / 35', status: 'Assigned' },
      { title: 'Book review', group: 'Class 10 · Section B', subject: 'English', due: '05 Oct 2026', submitted: '35 / 35', status: 'Closed' }
    ] : [
      { title: 'Kinematics problem set', group: 'Class 12 Science · Evening', subject: 'Physics', due: '18 Oct 2026', submitted: '21 / 28', status: 'Assigned' },
      { title: 'Organic reactions worksheet', group: 'Class 12 Science · Evening', subject: 'Chemistry', due: '22 Oct 2026', submitted: '9 / 28', status: 'Assigned' },
      { title: 'Algebra practice sheet', group: 'Class 10 Foundation · Morning', subject: 'Mathematics', due: '08 Oct 2026', submitted: '30 / 30', status: 'Closed' }
    ])
  };
}

function timetable(type: BusinessType, todayOnly: boolean): ModuleConfig {
  const school = type === 'school';
  return {
    title: todayOnly ? (school ? "Today's timetable" : "Today's classes") : 'Timetable', description: todayOnly ? 'Your periods for today. Open attendance straight from a class.' : 'Weekly periods for every class and section.', icon: todayOnly ? 'today' : 'calendar_month', singular: 'period', action: 'Add period', editors: todayOnly ? [] : ['Owner'], filterKey: todayOnly ? undefined : 'day',
    rowLink: todayOnly ? { label: 'Take attendance', icon: 'event_available', route: '/client/attendance' } : undefined,
    columns: [{ key: 'time', label: 'Time' }, ...(todayOnly ? [] : [{ key: 'day', label: 'Day' }]), { key: 'group', label: school ? 'Class' : 'Batch' }, { key: 'subject', label: 'Subject' }, ...(todayOnly ? [] : [{ key: 'teacher', label: 'Teacher' }]), { key: 'room', label: 'Room' }],
    fields: [{ key: 'day', label: 'Day', type: 'select', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], required: true }, { key: 'time', label: 'Time', required: true, hint: 'e.g. 09:00 – 09:40 am' }, { key: 'group', label: school ? 'Class / section' : 'Batch', type: 'select', options: school ? SCHOOL_GROUPS : COACHING_BATCHES, required: true }, { key: 'subject', label: 'Subject', type: 'select', options: school ? SCHOOL_SUBJECTS : COACHING_SUBJECTS, required: true }, { key: 'teacher', label: 'Teacher (full name)', required: true }, { key: 'room', label: 'Room' }],
    rows: status(school ? [
      { day: 'Monday', time: '08:00 – 08:40 am', group: 'Class 9 · Section A', subject: 'Mathematics', teacher: 'Arjun Menon', room: '201' },
      { day: 'Monday', time: '08:40 – 09:20 am', group: 'Class 10 · Section B', subject: 'English', teacher: 'Kavita Rao', room: '204' },
      { day: 'Monday', time: '09:20 – 10:00 am', group: 'Class 8 · Section A', subject: 'Science', teacher: 'Sunita Verma', room: 'Lab 1' },
      { day: 'Tuesday', time: '08:00 – 08:40 am', group: 'Class 6 · Section A', subject: 'Hindi', teacher: 'Meena Joshi', room: '101' }
    ] : [
      { day: 'Monday', time: '07:00 – 08:30 am', group: 'Class 10 Foundation · Morning', subject: 'Mathematics', teacher: 'Priya Nair', room: 'Room 2' },
      { day: 'Monday', time: '04:00 – 05:30 pm', group: 'Class 12 Science · Evening', subject: 'Physics', teacher: 'Priya Nair', room: 'Room 1' },
      { day: 'Monday', time: '05:30 – 07:00 pm', group: 'Class 12 Science · Evening', subject: 'Chemistry', teacher: 'Ankit Rao', room: 'Room 1' }
    ])
  };
}

function teacherGroups(type: BusinessType): ModuleConfig {
  const school = type === 'school';
  return {
    title: school ? 'My classes' : 'My batches', description: school ? 'Classes and sections you teach this session.' : 'Batches you teach, with timings and strength.', icon: school ? 'class' : 'view_module', singular: school ? 'class' : 'batch', action: '', editors: [],
    rowLink: { label: 'Take attendance', icon: 'event_available', route: '/client/attendance' },
    columns: [{ key: 'name', label: school ? 'Class' : 'Batch' }, { key: 'subject', label: 'Subject' }, { key: 'timing', label: school ? 'Periods / week' : 'Timing' }, { key: 'students', label: 'Students' }, { key: 'room', label: 'Room' }],
    fields: [{ key: 'name', label: school ? 'Class' : 'Batch' }, { key: 'subject', label: 'Subject' }, { key: 'timing', label: school ? 'Periods / week' : 'Timing' }, { key: 'students', label: 'Students' }, { key: 'room', label: 'Room' }],
    rows: status(school ? [
      { name: 'Class 9 · Section A', subject: 'Mathematics', timing: '7', students: 35, room: '201' },
      { name: 'Class 10 · Section B', subject: 'Mathematics', timing: '7', students: 33, room: '204' },
      { name: 'Class 8 · Section A', subject: 'Mathematics', timing: '6', students: 32, room: '105' }
    ] : [
      { name: 'Class 10 Foundation · Morning', subject: 'Mathematics', timing: 'Mon–Fri · 7:00 am', students: 30, room: 'Room 2' },
      { name: 'Class 12 Science · Evening', subject: 'Physics', timing: 'Mon–Sat · 4:00 pm', students: 28, room: 'Room 1' },
      { name: 'JEE · Weekend', subject: 'Physics', timing: 'Sat–Sun · 9:00 am', students: 24, room: 'Room 3' }
    ])
  };
}

const MY_SUBJECTS: ModuleConfig = {
  title: 'My subjects', description: 'Subjects you teach and syllabus progress.', icon: 'menu_book', singular: 'subject', action: '', editors: [],
  columns: [{ key: 'name', label: 'Subject' }, { key: 'className', label: 'Class' }, { key: 'periods', label: 'Periods / week' }, { key: 'syllabus', label: 'Syllabus covered' }],
  fields: [{ key: 'name', label: 'Subject' }, { key: 'className', label: 'Class' }, { key: 'periods', label: 'Periods / week' }, { key: 'syllabus', label: 'Syllabus covered' }],
  rows: status([
    { name: 'Mathematics', className: 'Class 9 · Section A', periods: 7, syllabus: '45%' },
    { name: 'Mathematics', className: 'Class 10 · Section B', periods: 7, syllabus: '52%' },
    { name: 'Mathematics', className: 'Class 8 · Section A', periods: 6, syllabus: '40%' }
  ])
};

const MARKS: ModuleConfig = {
  title: 'Marks entry', description: 'Enter exam marks for your students before results are published.', icon: 'edit_square', singular: 'marks entry', action: 'Enter marks', editors: ['Teacher'], filterKey: 'exam',
  columns: [{ key: 'student', label: 'Student' }, { key: 'group', label: 'Class' }, { key: 'exam', label: 'Exam' }, { key: 'subject', label: 'Subject' }, { key: 'marks', label: 'Marks' }, { key: 'maxMarks', label: 'Out of' }, { key: 'status', label: 'Status', badge: true }],
  fields: [{ key: 'student', label: 'Student full name', required: true }, { key: 'group', label: 'Class / section', type: 'select', options: SCHOOL_GROUPS, required: true }, { key: 'exam', label: 'Exam', type: 'select', options: ['Unit test 2', 'Term 1 – Mid-term', 'Term 1 – Final'], required: true }, { key: 'subject', label: 'Subject', type: 'select', options: SCHOOL_SUBJECTS, required: true }, { key: 'marks', label: 'Marks obtained', type: 'number', required: true }, { key: 'maxMarks', label: 'Maximum marks', type: 'number', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Submitted'], required: true }],
  rows: status([
    { student: 'Ishita Rao', group: 'Class 9 · Section A', exam: 'Unit test 2', subject: 'Mathematics', marks: 23, maxMarks: 25, status: 'Submitted' },
    { student: 'Kabir Menon', group: 'Class 9 · Section A', exam: 'Unit test 2', subject: 'Mathematics', marks: 19, maxMarks: 25, status: 'Submitted' },
    { student: 'Zoya Ahmed', group: 'Class 10 · Section B', exam: 'Unit test 2', subject: 'Mathematics', marks: 21, maxMarks: 25, status: 'Draft' }
  ])
};

const cache = new Map<string, ModuleConfig>();

/** Config for a route key (cached per workspace type so edits survive navigation), or undefined if the key isn't a module page. */
export function moduleConfig(key: string, type: BusinessType): ModuleConfig | undefined {
  const cacheKey = `${type}:${key}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const build = (): ModuleConfig | undefined => {
    if (SCHOOL_SETUP[key]) return SCHOOL_SETUP[key];
    switch (key) {
      case 'exams': case 'tests': return assessments(type);
      case 'assignments': return tasks(type, 'assignments');
      case 'homework': return tasks(type, 'homework');
      case 'timetable': return timetable(type, false);
      case 'today': return timetable(type, true);
      case 'my-batches': case 'my-classes': return teacherGroups(type);
      case 'my-subjects': return MY_SUBJECTS;
      case 'marks': return MARKS;
      default: return undefined;
    }
  };
  const config = build();
  if (!config) return undefined;
  const copy = { ...config, rows: config.rows.map(row => ({ ...row })) };
  cache.set(cacheKey, copy);
  return copy;
}

export const MODULE_KEYS = ['sessions', 'classes', 'sections', 'subjects', 'events', 'exams', 'tests', 'assignments', 'homework', 'timetable', 'today', 'my-batches', 'my-classes', 'my-subjects', 'marks'];

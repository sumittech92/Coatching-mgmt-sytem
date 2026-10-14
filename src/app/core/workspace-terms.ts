import { BusinessType } from './models/business-type';

/** Labels and option lists that differ between a coaching centre and a school. */
export interface WorkspaceTerms {
  institute: string;
  ownerTitle: string;
  teacher: string;
  teachers: string;
  studentId: string;
  rollNo: string;
  course: string;
  courses: string;
  group: string;
  guardian: string;
  feeLabel: string;
  assessment: string;
  courseOptions: string[];
  groupOptions: string[];
  qualificationOptions: string[];
  experienceOptions: string[];
}

export const STUDENT_CLASSES = Array.from({ length: 12 }, (_, i) => i + 1);
export const COACHING_BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB / IGCSE', 'Other'];
export const COACHING_SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Science', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Sanskrit', 'EVS', 'Accountancy', 'Economics'];
export const SCHOOL_CLASSES = ['Nursery', 'LKG', 'UKG', ...STUDENT_CLASSES.map(c => `Class ${c}`)];
export const SCHOOL_SECTIONS = ['Section A', 'Section B', 'Section C', 'Section D'];
export const SCHOOL_SUBJECTS = ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'EVS', 'Computer Science', 'Sanskrit', 'Physics', 'Chemistry', 'Biology', 'Accountancy', 'Economics', 'Physical Education', 'Art & Craft'];
export const SCHOOL_DEPARTMENTS = ['Pre-primary', 'Primary', 'Middle school', 'Secondary', 'Senior secondary', 'Administration', 'Sports & activities'];
export const SCHOOL_DESIGNATIONS = ['PRT', 'TGT', 'PGT', 'Class teacher', 'Head of Department', 'Vice Principal', 'Coordinator', 'Librarian', 'Lab assistant', 'Office staff'];
export const SCHOOL_TERMS = ['Term 1', 'Term 2', 'Annual'];
export const ADMISSION_QUOTAS = ['General', 'RTE', 'Sibling', 'Staff ward', 'Transfer'];
export const EXPERIENCE_LEVELS = ['Fresher', '1–3 years', '3–5 years', '5–10 years', '10+ years'];

const COACHING: WorkspaceTerms = {
  institute: 'Coaching centre',
  ownerTitle: 'Director',
  teacher: 'Teacher',
  teachers: 'Teachers',
  studentId: 'Admission no.',
  rollNo: 'Roll no.',
  course: 'Class / course',
  courses: 'Courses',
  group: 'Batch & timing',
  guardian: 'Father name',
  feeLabel: 'Monthly fee',
  assessment: 'Test',
  courseOptions: [...STUDENT_CLASSES.map(c => `Class ${c}`), 'Class 10 Foundation', 'Class 11 Science', 'Class 11 Commerce', 'Class 11 Arts', 'Class 12 Science', 'Class 12 Commerce', 'Class 12 Arts'],
  groupOptions: ['Morning · 7:00 am', 'Morning · 9:00 am', 'Afternoon · 2:00 pm', 'Evening · 4:00 pm', 'Weekend · Saturday', 'Weekend · Sunday'],
  qualificationOptions: ['B.Ed', 'M.Ed', 'B.Sc / B.A. / B.Com', 'M.Sc / M.A. / M.Com', 'Ph.D', 'Other'],
  experienceOptions: EXPERIENCE_LEVELS
};

const SCHOOL: WorkspaceTerms = {
  institute: 'School',
  ownerTitle: 'Principal',
  teacher: 'Teacher',
  teachers: 'Teachers & Staff',
  studentId: 'Admission no.',
  rollNo: 'Roll no.',
  course: 'Class',
  courses: 'Classes',
  group: 'Section',
  guardian: 'Father name',
  feeLabel: 'Term fee',
  assessment: 'Exam',
  courseOptions: SCHOOL_CLASSES,
  groupOptions: SCHOOL_SECTIONS,
  qualificationOptions: ['D.El.Ed', 'B.Ed', 'M.Ed', 'B.Sc / B.A. / B.Com', 'M.Sc / M.A. / M.Com', 'Ph.D', 'Other'],
  experienceOptions: EXPERIENCE_LEVELS
};

export function termsFor(type: BusinessType): WorkspaceTerms {
  return type === 'school' ? SCHOOL : COACHING;
}

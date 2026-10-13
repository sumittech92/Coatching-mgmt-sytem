import { BusinessType } from './models/business-type';

/** Labels and option lists that differ between a coaching centre and a college. */
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
export const COLLEGE_PROGRAMS = ['B.Sc Computer Science', 'B.Sc Life Sciences', 'B.Com', 'BBA', 'BCA', 'BA Psychology', 'B.Tech', 'M.Sc', 'M.Com', 'MBA'];
export const COLLEGE_DEPARTMENTS = ['Computer Science', 'Commerce', 'Management', 'Life Sciences', 'Psychology', 'Engineering', 'Humanities', 'Mathematics'];
export const COLLEGE_DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Head of Department', 'Lecturer', 'Guest Faculty', 'Lab Instructor'];
export const COLLEGE_YEARS = ['1st year', '2nd year', '3rd year', '4th year'];
export const COLLEGE_SEMESTERS = Array.from({ length: 8 }, (_, i) => `Semester ${i + 1}`);
export const COLLEGE_SECTIONS = ['Section A', 'Section B', 'Section C'];
export const ADMISSION_QUOTAS = ['General merit', 'Management', 'Sports', 'NRI', 'Lateral entry'];
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

const COLLEGE: WorkspaceTerms = {
  institute: 'College',
  ownerTitle: 'Principal',
  teacher: 'Faculty member',
  teachers: 'Faculty',
  studentId: 'Enrollment no.',
  rollNo: 'University roll no.',
  course: 'Program',
  courses: 'Programs',
  group: 'Year & section',
  guardian: 'Guardian name',
  feeLabel: 'Semester fee',
  assessment: 'Internal assessment',
  courseOptions: COLLEGE_PROGRAMS,
  groupOptions: COLLEGE_YEARS.flatMap(year => COLLEGE_SECTIONS.map(section => `${year.replace(/(\d)\w+ year/, 'Year $1')} · ${section}`)),
  qualificationOptions: ['Ph.D', 'M.Phil', 'M.Tech / M.E.', 'M.Sc / M.A. / M.Com', 'MBA', 'NET / SET qualified', 'Other'],
  experienceOptions: EXPERIENCE_LEVELS
};

export function termsFor(type: BusinessType): WorkspaceTerms {
  return type === 'college' ? COLLEGE : COACHING;
}

/**
 * Modules the Super Admin can turn off per institute (same keys as crm-backend utilis/moduleAccess.ts).
 * Core pages (dashboard, students, teachers, classes / courses, sections / batches, subjects, sessions, profile) are always on.
 */
export type ModuleKey = 'admissions' | 'attendance' | 'fees' | 'exams' | 'homework' | 'timetable' | 'syllabus' | 'library' | 'labs'
  | 'salary' | 'entrance' | 'notices' | 'events' | 'posts' | 'gallery' | 'materials' | 'website' | 'reports';

export interface ModuleInfo { key: ModuleKey; label: string; icon: string; description: string; schoolOnly?: boolean; }

export const MODULES: ModuleInfo[] = [
  { key: 'admissions', label: 'Admissions', icon: 'person_add_alt', description: 'Enquiries and follow-ups' },
  { key: 'attendance', label: 'Attendance', icon: 'event_available', description: 'Daily and monthly registers' },
  { key: 'fees', label: 'Fees', icon: 'payments', description: 'Fee collection, dues and receipts' },
  { key: 'exams', label: 'Exams & results', icon: 'quiz', description: 'Tests, marks entry and results' },
  { key: 'homework', label: 'Homework & assignments', icon: 'edit_note', description: 'Tasks for classes and batches' },
  { key: 'timetable', label: 'Timetable', icon: 'calendar_month', description: 'Periods and today’s classes' },
  { key: 'syllabus', label: 'Syllabus', icon: 'fact_check', description: 'Chapters and progress' },
  { key: 'library', label: 'Library', icon: 'local_library', description: 'Books, loans and requests' },
  { key: 'labs', label: 'Labs', icon: 'science', description: 'Labs and their equipment' },
  { key: 'salary', label: 'Teacher salary', icon: 'account_balance_wallet', description: 'Monthly payroll and salary slips' },
  { key: 'entrance', label: 'Entrance tests', icon: 'assignment_ind', description: 'Admission tests for Nursery – Class 5', schoolOnly: true },
  { key: 'notices', label: 'Notices', icon: 'campaign', description: 'Announcements to families and staff' },
  { key: 'events', label: 'Events', icon: 'celebration', description: 'School events calendar', schoolOnly: true },
  { key: 'posts', label: 'Posts', icon: 'dynamic_feed', description: 'News and updates feed' },
  { key: 'gallery', label: 'Gallery', icon: 'photo_library', description: 'Photo albums' },
  { key: 'materials', label: 'Study materials', icon: 'folder_open', description: 'Notes and resources' },
  { key: 'website', label: 'Website', icon: 'language', description: 'Public website and CMS' },
  { key: 'reports', label: 'Reports', icon: 'bar_chart', description: 'Reports and exports' },
];

/** First path segment after /client -> module. */
const ROUTE_MODULES: Record<string, ModuleKey> = {
  admissions: 'admissions', attendance: 'attendance', fees: 'fees', exams: 'exams', tests: 'exams', marks: 'exams', results: 'exams',
  homework: 'homework', assignments: 'homework', timetable: 'timetable', today: 'timetable', syllabus: 'syllabus', library: 'library',
  labs: 'labs', 'lab-equipment': 'labs', salary: 'salary', entrance: 'entrance', notices: 'notices', events: 'events', posts: 'posts',
  gallery: 'gallery', materials: 'materials', website: 'website', reports: 'reports',
};

/** "/client/library/..." -> 'library'; undefined for core pages. */
export function moduleForRoute(url: string): ModuleKey | undefined {
  const [area, page] = url.split(/[?#]/)[0].split('/').filter(Boolean);
  return area === 'client' ? ROUTE_MODULES[page] : undefined;
}

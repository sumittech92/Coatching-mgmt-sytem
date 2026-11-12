import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { RecordField } from '../management/record-dialog.component';
import { ModuleColumn, ModuleRow } from './module-registry';
import { BusinessType } from '../../core/models/business-type';
import { MockAuthService } from '../../core/mock-auth.service';
import { ApiCourse, CourseApiService, FEE_FREQUENCY_LABELS, SCHOOL_FEE_FREQUENCIES } from '../../core/course-api.service';
import { ApiBatch, BatchApiService, SCHOOL_SECTION_OPTIONS } from '../../core/batch-api.service';
import { TeacherApiService } from '../../core/teacher-api.service';
import { SCHOOL_CLASSES } from '../../core/workspace-terms';
import { ApiTest, TEST_STATUS_LABELS, TestApiService, TestPayload } from '../../core/test-api.service';
import { TestDialogComponent, TestDialogData } from './test-dialog.component';
import { MarksDialogComponent } from './marks-dialog.component';

/**
 * Backend source for a ModulePageComponent page. `load` fills the rows (and any option lists the form needs),
 * `save` creates or updates one row and returns it in row shape, `remove` deletes it.
 */
export interface ModuleApiAdapter {
  columns?: ModuleColumn[];
  load(): Observable<ModuleRow[]>;
  fields(): RecordField[];
  save(value: Record<string, unknown>, row?: ModuleRow): Observable<ModuleRow>;
  remove(row: ModuleRow): Observable<unknown>;
  /** Shown instead of opening the form when something else must exist first. */
  blocker?(): string;
  /** Own add / edit form (e.g. the exam date sheet); returns the saved row, or undefined when cancelled. */
  edit?(row?: ModuleRow): Observable<ModuleRow | undefined>;
  /** Extra actions in a row's menu. `run` returns the updated row (or undefined to leave it as is). */
  rowActions?(row: ModuleRow): ModuleRowAction[];
  /** Whether this user may edit / delete this row (defaults to the page's editors). */
  canEditRow?(row: ModuleRow): boolean;
  /** False hides the page's add button (e.g. Marks entry, where rows come from exams). */
  canCreate?: boolean;
}

export interface ModuleRowAction { label: string; icon: string; run(): Observable<ModuleRow | undefined>; /** Toast after it succeeds. */ done?: string; }

const STATUS: RecordField = { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true };
const FEE_VALUES = Object.fromEntries(Object.entries(FEE_FREQUENCY_LABELS).map(([value, label]) => [label, value]));
const text = (value: unknown): string | null => String(value ?? '').trim() || null;
const list = (value: unknown): string[] => String(value || '').split(',').map(item => item.trim()).filter(Boolean);

/** Which module pages are API-backed for a signed-in (non-demo) account. Demo sessions keep the sample rows. */
@Injectable({ providedIn: 'root' })
export class ModuleApiService {
  constructor(private auth: MockAuthService, private courses: CourseApiService, private batches: BatchApiService, private teachers: TeacherApiService, private tests: TestApiService, private dialog: MatDialog) {}

  adapter(key: string, type: BusinessType): ModuleApiAdapter | undefined {
    if (!this.auth.token) return undefined;
    if (type === 'school' && key === 'classes') return this.schoolClasses();
    if (type === 'school' && key === 'sections') return this.schoolSections();
    if ((type === 'coaching' && key === 'tests') || (type === 'school' && key === 'exams')) return this.testsAdapter(type === 'school', true);
    if (type === 'school' && key === 'marks') return this.testsAdapter(true, false);
    return undefined;
  }

  private get token(): string { return this.auth.token!; }

  /** School classes are the Course API with school fields (class from the fixed list, session, term fee). */
  private schoolClasses(): ModuleApiAdapter {
    const toRow = (course: ApiCourse, sections: ApiBatch[]): ModuleRow => ({
      id: Number(course.courseCode), code: course.courseCode, name: course.name,
      sections: sections.filter(batch => batch.course?.courseCode === course.courseCode).map(batch => batch.name.replace(/^Section\s+/, '')).sort().join(', ') || '—',
      fee: CourseApiService.feeLabel(course.feeAmount, course.feeFrequency), feeAmount: course.feeAmount, feeFrequency: FEE_FREQUENCY_LABELS[course.feeFrequency],
      duration: course.duration || '', subjects: course.subjects.join(', '), description: course.description || '',
      students: course.enrolled ?? 0, status: course.status === 'inactive' ? 'Inactive' : 'Active'
    });
    let sections: ApiBatch[] = [];
    return {
      columns: [{ key: 'name', label: 'Class' }, { key: 'sections', label: 'Sections' }, { key: 'fee', label: 'Fee' }, { key: 'subjects', label: 'Subjects' }, { key: 'students', label: 'Students' }, { key: 'status', label: 'Status', badge: true }],
      load: () => forkJoin({ courses: this.courses.list(this.token), batches: this.batches.list(this.token) }).pipe(
        tap(result => sections = result.batches),
        map(({ courses }) => [...courses].sort((a, b) => SCHOOL_CLASSES.indexOf(a.name) - SCHOOL_CLASSES.indexOf(b.name)).map(course => toRow(course, sections)))
      ),
      fields: () => [
        { key: 'name', label: 'Class', type: 'select', options: [...SCHOOL_CLASSES], required: true },
        { key: 'duration', label: 'Session', hint: 'e.g. April – March' },
        { key: 'feeAmount', label: 'Fee amount (₹)', type: 'number', required: true, hint: 'e.g. 18500' },
        { key: 'feeFrequency', label: 'Fee charged', type: 'select', options: SCHOOL_FEE_FREQUENCIES.map(value => FEE_FREQUENCY_LABELS[value]), required: true },
        { key: 'subjects', label: 'Subjects', type: 'tags' },
        { key: 'description', label: 'Description', type: 'textarea' },
        STATUS
      ],
      save: (value, row) => {
        const payload = {
          name: String(value['name'] || ''), duration: text(value['duration']), description: text(value['description']),
          feeAmount: Number(value['feeAmount']) || 0, feeFrequency: (FEE_VALUES[String(value['feeFrequency'])] || 'perTerm') as ApiCourse['feeFrequency'],
          subjects: list(value['subjects']), status: (value['status'] === 'Inactive' ? 'inactive' : 'active') as ApiCourse['status']
        };
        const request = row ? this.courses.update(this.token, String(row['code']), payload) : this.courses.create(this.token, payload);
        return request.pipe(map(course => toRow(course, sections)));
      },
      remove: row => this.courses.remove(this.token, String(row['code']))
    };
  }

  /** School sections are the Batch API with school fields (section letter, class, one class teacher). */
  private schoolSections(): ModuleApiAdapter {
    let classCodes = new Map<string, string>();
    let teacherCodes = new Map<string, string>();
    const toRow = (batch: ApiBatch): ModuleRow => ({
      id: Number(batch.batchCode), code: batch.batchCode, name: batch.name, className: batch.course?.name || '—',
      classTeacher: batch.teachers[0]?.fullName || '—', room: batch.room || '—',
      capacity: batch.capacity ?? '', students: batch.capacity ? `${batch.students} / ${batch.capacity}` : String(batch.students),
      status: batch.status === 'inactive' ? 'Inactive' : 'Active'
    });
    return {
      columns: [{ key: 'name', label: 'Section' }, { key: 'className', label: 'Class' }, { key: 'classTeacher', label: 'Class teacher' }, { key: 'room', label: 'Room' }, { key: 'students', label: 'Students' }, { key: 'status', label: 'Status', badge: true }],
      load: () => forkJoin({ batches: this.batches.list(this.token), courses: this.courses.list(this.token), teachers: this.teachers.list(this.token) }).pipe(
        tap(({ courses, teachers }) => {
          classCodes = new Map([...courses].sort((a, b) => SCHOOL_CLASSES.indexOf(a.name) - SCHOOL_CLASSES.indexOf(b.name)).map(course => [course.name, course.courseCode]));
          teacherCodes = new Map(teachers.filter(teacher => teacher.fullName).map(teacher => [teacher.fullName!, teacher.teacherCode]));
        }),
        map(({ batches }) => [...batches].sort((a, b) => SCHOOL_CLASSES.indexOf(a.course?.name || '') - SCHOOL_CLASSES.indexOf(b.course?.name || '') || a.name.localeCompare(b.name)).map(toRow))
      ),
      blocker: () => classCodes.size ? '' : 'Add a class under Classes first, then create its sections.',
      fields: () => [
        { key: 'className', label: 'Class', type: 'select', options: [...classCodes.keys()], required: true },
        { key: 'name', label: 'Section', type: 'select', options: SCHOOL_SECTION_OPTIONS, required: true },
        { key: 'classTeacher', label: 'Class teacher', type: 'select', options: ['—', ...teacherCodes.keys()] },
        { key: 'room', label: 'Room', hint: 'e.g. 201' },
        { key: 'capacity', label: 'Capacity', type: 'number' },
        STATUS
      ],
      save: (value, row) => {
        const capacity = Number(value['capacity']);
        const teacher = teacherCodes.get(String(value['classTeacher'] || ''));
        const payload = {
          courseCode: classCodes.get(String(value['className'])) || '', name: String(value['name'] || ''),
          teacherCodes: teacher ? [teacher] : [], room: text(value['room']), capacity: capacity > 0 ? capacity : null,
          status: (value['status'] === 'Inactive' ? 'inactive' : 'active') as ApiBatch['status']
        };
        const request = row ? this.batches.update(this.token, String(row['code']), payload) : this.batches.create(this.token, payload);
        return request.pipe(map(toRow));
      },
      remove: row => this.batches.remove(this.token, String(row['code']))
    };
  }

  /**
   * Coaching tests / school exams. Rows open the test form (one subject for coaching, a date sheet for school);
   * the row menu enters marks, publishes results and cancels. `withCreate` is false on the school Marks entry page.
   */
  private testsAdapter(school: boolean, withCreate: boolean): ModuleApiAdapter {
    let courses: ApiCourse[] = [];
    let batches: ApiBatch[] = [];
    const day = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const toRow = (test: ApiTest): ModuleRow => {
      const dates = test.papers.map(paper => paper.date).sort();
      const maxMarks = [...new Set(test.papers.map(paper => paper.maxMarks))];
      const entered = test.papers.reduce((sum, paper) => sum + paper.entered, 0);
      const groups = test.batches.map(batch => school ? batch.name.replace(/^Section\s+/, '') : batch.name).join(', ');
      return {
        id: Number(test.testCode), code: test.testCode, test, name: test.name, term: test.term || '',
        group: school ? `${test.course?.name || '—'} · ${groups ? `Section ${groups}` : 'All sections'}` : groups || '—',
        subject: test.papers.map(paper => paper.subject).join(', '),
        date: dates.length > 1 && dates[0] !== dates[dates.length - 1] ? `${day(dates[0])} – ${day(dates[dates.length - 1])}` : day(dates[0]),
        maxMarks: maxMarks.length === 1 ? maxMarks[0] : maxMarks.join(' / '),
        marksEntered: `${entered} / ${test.students * test.papers.length}`,
        status: TEST_STATUS_LABELS[test.status]
      };
    };
    const reload = (row: ModuleRow) => this.tests.list(this.token).pipe(map(list => { const test = list.find(item => item.testCode === row['code']); return test ? toRow(test) : undefined; }));
    const testOf = (row: ModuleRow) => row['test'] as ApiTest;
    return {
      canCreate: withCreate,
      columns: [{ key: 'name', label: school ? 'Exam' : 'Test' }, { key: 'group', label: school ? 'Class' : 'Batch' }, { key: 'subject', label: school ? 'Subjects' : 'Subject' }, { key: 'date', label: 'Date' }, { key: 'maxMarks', label: 'Max marks' }, { key: 'marksEntered', label: 'Marks entered' }, { key: 'status', label: 'Status', badge: true }],
      load: () => forkJoin({ tests: this.tests.list(this.token), courses: this.courses.list(this.token), batches: this.batches.list(this.token, { status: 'active' }) }).pipe(
        tap(result => { courses = result.courses.filter(course => course.status === 'active'); batches = result.batches; }),
        map(({ tests }) => tests.map(toRow))
      ),
      blocker: () => school ? (courses.length ? '' : 'Add a class under Classes first, then schedule its exams.') : (batches.length ? '' : 'Create a batch first, then schedule its tests.'),
      fields: () => [{ key: 'name', label: school ? 'Exam' : 'Test' }, { key: 'term', label: 'Term' }, { key: 'group', label: school ? 'Class' : 'Batch' }, { key: 'subject', label: 'Subjects' }, { key: 'date', label: 'Date' }, { key: 'maxMarks', label: 'Max marks' }, { key: 'marksEntered', label: 'Marks entered' }, { key: 'status', label: 'Status' }].filter(field => school || field.key !== 'term'),
      edit: row => {
        const data: TestDialogData = { school, test: row ? testOf(row) : undefined, courses, batches };
        return this.dialog.open(TestDialogComponent, { width: '780px', maxWidth: 'calc(100vw - 24px)', data }).afterClosed().pipe(
          switchMap((payload: TestPayload | undefined) => !payload ? of(undefined) : (row ? this.tests.update(this.token, String(row['code']), payload) : this.tests.create(this.token, payload)).pipe(map(toRow)))
        );
      },
      save: () => of({ id: 0 }),
      canEditRow: row => testOf(row).canManage && !testOf(row).resultsPublished,
      rowActions: row => {
        const test = testOf(row);
        const actions: ModuleRowAction[] = [];
        if (!test.cancelled && test.papers.some(paper => paper.canEnterMarks)) actions.push({
          label: test.resultsPublished ? 'View marks' : 'Enter marks', icon: 'edit_square',
          run: () => this.dialog.open(MarksDialogComponent, { width: '920px', maxWidth: 'calc(100vw - 24px)', data: { test } }).afterClosed().pipe(switchMap(changed => changed ? reload(row) : of(undefined)))
        });
        if (test.canManage && !test.cancelled) actions.push(test.resultsPublished
          ? { label: 'Unpublish results', icon: 'visibility_off', done: `Results of “${test.name}” moved back to draft.`, run: () => this.tests.publish(this.token, test.testCode, false).pipe(map(toRow)) }
          : { label: 'Publish results', icon: 'campaign', done: `Results of “${test.name}” published.`, run: () => this.tests.publish(this.token, test.testCode, true).pipe(map(toRow)) });
        if (test.canManage && !test.resultsPublished) actions.push(test.cancelled
          ? { label: school ? 'Restore exam' : 'Restore test', icon: 'restore', done: `“${test.name}” restored.`, run: () => this.tests.update(this.token, test.testCode, { cancelled: false }).pipe(map(toRow)) }
          : { label: school ? 'Cancel exam' : 'Cancel test', icon: 'event_busy', done: `“${test.name}” cancelled.`, run: () => this.tests.update(this.token, test.testCode, { cancelled: true }).pipe(map(toRow)) });
        return actions;
      },
      remove: row => this.tests.remove(this.token, String(row['code']))
    };
  }
}

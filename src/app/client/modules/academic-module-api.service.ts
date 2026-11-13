import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, forkJoin, map, of, switchMap, tap, throwError } from 'rxjs';
import { ModuleRow } from './module-registry';
import type { ModuleApiAdapter, ModuleRowAction } from './module-api.service';
import { RecordField } from '../management/record-dialog.component';
import { BusinessType } from '../../core/models/business-type';
import { MockAuthService } from '../../core/mock-auth.service';
import { dayLabel, fromApiDay, isoDay } from '../../core/api-client';
import { ApiCourse, CourseApiService } from '../../core/course-api.service';
import { ApiBatch, BatchApiService } from '../../core/batch-api.service';
import { ApiTeacher, TeacherApiService } from '../../core/teacher-api.service';
import { MaterialApiService, MATERIAL_ACCEPT, MAX_MATERIAL_BYTES } from '../../core/material-api.service';
import { ApiSession, ApiSessionStatus, SessionApiService } from '../../core/session-api.service';
import { ApiSubject, SubjectApiService, SubjectPayload } from '../../core/subject-api.service';
import { ApiPeriod, PeriodPayload, TimetableApiService } from '../../core/timetable-api.service';
import { ApiEvent, ApiEventAudience, EVENT_AUDIENCE_LABELS, EventApiService } from '../../core/event-api.service';
import { ApiTask, ApiTaskKind, ApiTaskOption, TaskApiService, TaskPayload } from '../../core/task-api.service';
import { SCHOOL_CLASSES } from '../../core/workspace-terms';
import { SubjectDialogComponent, SubjectDialogData } from './subject-dialog.component';
import { PERIOD_DAYS, PeriodDialogComponent, PeriodDialogData } from './period-dialog.component';
import { SubmissionsDialogComponent, SubmissionsDialogData } from './submissions-dialog.component';

const text = (value: unknown): string | null => String(value ?? '').trim() || null;
const list = (value: unknown): string[] => String(value || '').split(',').map(item => item.trim()).filter(Boolean);
const capital = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);
const dayName = (day: string): string => PERIOD_DAYS.find(item => item.value === day)?.label || day;
const timeRange = (start: string | null, end: string | null): string => start && end ? `${BatchApiService.clock(start)} – ${BatchApiService.clock(end)}` : '—';
const classOrder = (name: string | undefined): number => SCHOOL_CLASSES.indexOf(name || '');
const AUDIENCE_VALUES = Object.fromEntries(Object.entries(EVENT_AUDIENCE_LABELS).map(([value, label]) => [label, value])) as Record<string, ApiEventAudience>;
/** Read-only pages (teacher views) never save or delete. */
const readOnly = { save: () => of({ id: 0 }), remove: () => of(null), canCreate: false };
const readFields = (fields: [string, string][]): RecordField[] => fields.map(([key, label]) => ({ key, label }));

/**
 * crm-backend adapters for the academic pages: Academic sessions, Subjects, Timetable, Events (owner),
 * Homework, Assignments, My classes / batches, My subjects and Today's classes (teacher).
 */
@Injectable({ providedIn: 'root' })
export class AcademicModuleApiService {
  constructor(
    private auth: MockAuthService, private dialog: MatDialog, private courses: CourseApiService, private batches: BatchApiService, private teachers: TeacherApiService,
    private materials: MaterialApiService, private sessions: SessionApiService, private subjects: SubjectApiService, private timetable: TimetableApiService,
    private events: EventApiService, private tasks: TaskApiService
  ) {}

  private get token(): string { return this.auth.token!; }

  adapter(key: string, type: BusinessType): ModuleApiAdapter | undefined {
    const school = type === 'school';
    switch (key) {
      case 'sessions': return this.sessionsAdapter();
      case 'subjects': return school ? this.subjectsAdapter() : undefined;
      case 'timetable': return school ? this.timetableAdapter() : undefined;
      case 'events': return this.eventsAdapter();
      case 'homework': return this.tasksAdapter('homework', school);
      case 'assignments': return this.tasksAdapter('assignment', school);
      case 'my-classes': case 'my-batches': return this.myClassesAdapter(school);
      case 'my-subjects': return school ? this.mySubjectsAdapter() : undefined;
      case 'today': return this.todayAdapter(school);
      default: return undefined;
    }
  }

  private sessionsAdapter(): ModuleApiAdapter {
    const toRow = (session: ApiSession): ModuleRow => ({
      id: Number(session.sessionCode), code: session.sessionCode, name: session.name,
      start: fromApiDay(session.startDate), end: fromApiDay(session.endDate), startLabel: dayLabel(session.startDate), endLabel: dayLabel(session.endDate),
      terms: session.terms.join(', '), status: capital(session.status)
    });
    return {
      // Making a session current moves the previous one to completed, so the whole list is read again.
      refreshAfterSave: true,
      columns: [{ key: 'name', label: 'Session' }, { key: 'startLabel', label: 'Starts' }, { key: 'endLabel', label: 'Ends' }, { key: 'terms', label: 'Terms' }, { key: 'status', label: 'Status', badge: true }],
      load: () => this.sessions.list(this.token).pipe(map(rows => rows.map(toRow))),
      fields: () => [
        { key: 'name', label: 'Session name', required: true, hint: 'e.g. 2026–27' },
        { key: 'start', label: 'Start date', type: 'date', required: true },
        { key: 'end', label: 'End date', type: 'date', required: true },
        { key: 'terms', label: 'Terms', type: 'tags', hint: 'e.g. Term 1, Term 2' },
        { key: 'status', label: 'Status', type: 'select', options: ['Current', 'Upcoming', 'Completed'], required: true, hint: 'Only one session is current at a time.' }
      ],
      save: (value, row) => {
        const payload = { name: String(value['name']), startDate: isoDay(value['start']), endDate: isoDay(value['end']), terms: list(value['terms']), status: String(value['status'] || 'Upcoming').toLowerCase() as ApiSessionStatus };
        return (row ? this.sessions.update(this.token, String(row['code']), payload) : this.sessions.create(this.token, payload)).pipe(map(toRow));
      },
      remove: row => this.sessions.remove(this.token, String(row['code']))
    };
  }

  /** Subjects per class with a teacher for each section; added and edited in SubjectDialog. */
  private subjectsAdapter(): ModuleApiAdapter {
    let courses: ApiCourse[] = [], batches: ApiBatch[] = [], teachers: ApiTeacher[] = [];
    const toRow = (subject: ApiSubject): ModuleRow => ({
      id: Number(subject.subjectCode), code: subject.subjectCode, subject, name: subject.optional ? `${subject.name} (optional)` : subject.name, subjectCode: subject.code || '—',
      className: subject.course?.name || '—',
      teachers: subject.sections.length ? subject.sections.map(section => `${section.name.replace(/^Section\s+/, '')}: ${section.teacher?.fullName || 'not assigned'}`).join(' · ') : 'No sections yet',
      periods: subject.periodsPerWeek ? `${subject.scheduled} scheduled · ${subject.periodsPerWeek} / week per section` : `${subject.scheduled} scheduled`,
      status: subject.status === 'inactive' ? 'Inactive' : 'Active'
    });
    return {
      columns: [{ key: 'name', label: 'Subject' }, { key: 'subjectCode', label: 'Code' }, { key: 'className', label: 'Class' }, { key: 'teachers', label: 'Teachers by section' }, { key: 'periods', label: 'Periods' }, { key: 'status', label: 'Status', badge: true }],
      load: () => forkJoin({ subjects: this.subjects.list(this.token), courses: this.courses.list(this.token), batches: this.batches.list(this.token), teachers: this.teachers.list(this.token) }).pipe(
        tap(result => { courses = [...result.courses].sort((a, b) => classOrder(a.name) - classOrder(b.name)); batches = result.batches; teachers = result.teachers; }),
        map(({ subjects }) => subjects.map(toRow))
      ),
      blocker: () => courses.length ? '' : 'Add a class under Classes first, then add its subjects.',
      fields: () => readFields([['name', 'Subject'], ['subjectCode', 'Code'], ['className', 'Class'], ['teachers', 'Teachers by section'], ['periods', 'Periods'], ['status', 'Status']]),
      edit: row => {
        const data: SubjectDialogData = { subject: row?.['subject'] as ApiSubject | undefined, courses: courses.filter(course => course.status === 'active' || course.courseCode === row?.['subject']?.course?.courseCode), batches, teachers };
        return this.dialog.open(SubjectDialogComponent, { width: '720px', maxWidth: 'calc(100vw - 24px)', data }).afterClosed().pipe(
          switchMap((payload: SubjectPayload | undefined) => !payload ? of(undefined) : (row ? this.subjects.update(this.token, String(row['code']), payload) : this.subjects.create(this.token, payload)).pipe(map(toRow)))
        );
      },
      save: () => of({ id: 0 }),
      remove: row => this.subjects.remove(this.token, String(row['code']))
    };
  }

  /** Weekly periods of every section; added and edited in PeriodDialog. */
  private timetableAdapter(): ModuleApiAdapter {
    let sections: ApiBatch[] = [], subjects: ApiSubject[] = [];
    const toRow = (period: ApiPeriod): ModuleRow => {
      const group = period.section ? `${period.section.course?.name || ''} · ${period.section.name}` : '—';
      return {
        id: Number(period.periodCode), code: period.periodCode, period, name: `${period.subject?.name || 'Period'} · ${group}`,
        day: dayName(period.day), time: timeRange(period.startTime, period.endTime), group, subject: period.subject?.name || '—',
        teacher: period.teacher?.fullName || 'Not assigned', room: period.effectiveRoom || '—'
      };
    };
    // Subjects carry "scheduled" counts, so read them again after each change.
    const refreshSubjects = <T>(source: Observable<T>) => source.pipe(switchMap(result => this.subjects.list(this.token).pipe(tap(list => subjects = list), map(() => result))));
    return {
      columns: [{ key: 'day', label: 'Day' }, { key: 'time', label: 'Time' }, { key: 'group', label: 'Class' }, { key: 'subject', label: 'Subject' }, { key: 'teacher', label: 'Teacher' }, { key: 'room', label: 'Room' }],
      load: () => forkJoin({ periods: this.timetable.list(this.token), batches: this.batches.list(this.token, { status: 'active' }), subjects: this.subjects.list(this.token) }).pipe(
        tap(result => { sections = [...result.batches].sort((a, b) => classOrder(a.course?.name) - classOrder(b.course?.name) || a.name.localeCompare(b.name)); subjects = result.subjects; }),
        map(({ periods }) => periods.map(toRow))
      ),
      blocker: () => !sections.length ? 'Add sections under Sections first, then build their timetable.' : !subjects.length ? 'Add subjects under Subjects first, then build the timetable.' : '',
      fields: () => readFields([['day', 'Day'], ['time', 'Time'], ['group', 'Class'], ['subject', 'Subject'], ['teacher', 'Teacher'], ['room', 'Room']]),
      edit: row => {
        const data: PeriodDialogData = { period: row?.['period'] as ApiPeriod | undefined, batches: sections, subjects };
        return this.dialog.open(PeriodDialogComponent, { width: '680px', maxWidth: 'calc(100vw - 24px)', data }).afterClosed().pipe(
          switchMap((payload: PeriodPayload | undefined) => !payload ? of(undefined) : refreshSubjects((row ? this.timetable.update(this.token, String(row['code']), payload) : this.timetable.create(this.token, payload)).pipe(map(toRow))))
        );
      },
      save: () => of({ id: 0 }),
      remove: row => refreshSubjects(this.timetable.remove(this.token, String(row['code'])))
    };
  }

  private eventsAdapter(): ModuleApiAdapter {
    const toRow = (event: ApiEvent): ModuleRow => ({
      id: Number(event.eventCode), code: event.eventCode, name: event.name,
      date: fromApiDay(event.date), dateLabel: event.startTime ? `${dayLabel(event.date)} · ${BatchApiService.clock(event.startTime)}` : dayLabel(event.date),
      startTime: event.startTime || '', venue: event.venue || '', venueLabel: event.venue || '—', audience: EVENT_AUDIENCE_LABELS[event.audience], description: event.description || '',
      state: event.cancelled ? 'Cancelled' : 'Scheduled', status: capital(event.status)
    });
    return {
      columns: [{ key: 'name', label: 'Event' }, { key: 'dateLabel', label: 'Date' }, { key: 'venueLabel', label: 'Venue' }, { key: 'audience', label: 'For' }, { key: 'status', label: 'Status', badge: true }],
      load: () => this.events.list(this.token).pipe(map(rows => rows.map(toRow))),
      fields: () => [
        { key: 'name', label: 'Event name', required: true },
        { key: 'date', label: 'Date', type: 'date', required: true },
        { key: 'startTime', label: 'Starts at', type: 'time' },
        { key: 'venue', label: 'Venue' },
        { key: 'audience', label: 'For', type: 'select', options: Object.values(EVENT_AUDIENCE_LABELS), required: true },
        { key: 'state', label: 'Status', type: 'select', options: ['Scheduled', 'Cancelled'], required: true, hint: 'Past events show as Completed.' },
        { key: 'description', label: 'Details', type: 'textarea' }
      ],
      save: (value, row) => {
        const payload = {
          name: String(value['name']), date: isoDay(value['date']), startTime: text(value['startTime']), venue: text(value['venue']),
          audience: AUDIENCE_VALUES[String(value['audience'])] || 'all', description: text(value['description']), cancelled: value['state'] === 'Cancelled'
        };
        return (row ? this.events.update(this.token, String(row['code']), payload) : this.events.create(this.token, payload)).pipe(map(toRow));
      },
      remove: row => this.events.remove(this.token, String(row['code']))
    };
  }

  /** Homework / assignments: teachers give them to the sections (school) or batches (coaching) and subjects the backend allows. */
  private tasksAdapter(kind: ApiTaskKind, school: boolean): ModuleApiAdapter {
    let options: ApiTaskOption[] = [];
    const homework = kind === 'homework';
    const toRow = (task: ApiTask): ModuleRow => ({
      id: Number(task.taskCode), code: task.taskCode, task, title: task.title, group: task.batch?.label || '—', subject: task.subject,
      due: fromApiDay(task.dueDate), dueLabel: dayLabel(task.dueDate), description: task.description || '',
      file: task.attachment?.name || '', attachment: task.attachment?.name || '—', submitted: `${task.submitted} / ${task.students}`,
      state: task.status === 'closed' ? 'Closed' : 'Assigned', status: task.status === 'closed' ? 'Closed' : task.overdue ? 'Overdue' : 'Assigned'
    });
    const upload = (file: unknown): Observable<{ url: string; name: string } | undefined> => {
      if (!(file instanceof File)) return of(undefined);
      if (file.size > MAX_MATERIAL_BYTES) return throwError(() => new Error(`“${file.name}” is larger than 25 MB.`));
      return this.materials.upload(this.token, file).pipe(map(saved => ({ url: saved.url, name: saved.name })));
    };
    const groupLabel = school ? 'Class / section' : 'Batch';
    return {
      columns: [{ key: 'title', label: 'Title' }, { key: 'group', label: school ? 'Class' : 'Batch' }, { key: 'subject', label: 'Subject' }, { key: 'dueLabel', label: 'Due' }, ...(homework ? [] : [{ key: 'submitted', label: 'Submitted' }, { key: 'attachment', label: 'Attachment' }]), { key: 'status', label: 'Status', badge: true }],
      load: () => forkJoin({ tasks: this.tasks.list(this.token, { kind }), options: this.tasks.options(this.token) }).pipe(
        tap(result => options = result.options),
        map(({ tasks }) => tasks.map(toRow))
      ),
      blocker: () => options.length ? '' : school
        ? 'You have no sections yet. Ask the owner to assign you a subject under Subjects, or make you a class teacher.'
        : 'You have no batches yet. Ask the owner to add you to a batch.',
      fields: () => [
        { key: 'title', label: 'Title', required: true },
        { key: 'group', label: groupLabel, type: 'select', options: options.map(option => option.label), required: true },
        { key: 'subject', label: 'Subject', type: 'select', options: [...new Set(options.flatMap(option => option.subjects))], required: true, hint: 'Only subjects you teach in that class are accepted.' },
        { key: 'due', label: 'Due date', type: 'date', required: true },
        { key: 'description', label: 'Instructions', type: 'textarea' },
        ...(homework ? [] : [{ key: 'file', label: 'Attachment', type: 'file' as const, accept: MATERIAL_ACCEPT, hint: 'PDF, Word, PowerPoint, Excel, text or image · up to 25 MB' }]),
        { key: 'state', label: 'Status', type: 'select', options: ['Assigned', 'Closed'], required: true }
      ],
      save: (value, row) => {
        const option = options.find(item => item.label === value['group']);
        if (!option) return throwError(() => new Error(`Choose a ${groupLabel.toLowerCase()} from the list.`));
        return upload(value['fileFile']).pipe(switchMap(attachment => {
          const payload: Partial<TaskPayload> = {
            title: String(value['title']), batchCode: option.batchCode, subject: String(value['subject']), dueDate: isoDay(value['due']),
            description: text(value['description']), status: value['state'] === 'Closed' ? 'closed' : 'assigned', ...(attachment ? { attachment } : {})
          };
          return row ? this.tasks.update(this.token, String(row['code']), payload) : this.tasks.create(this.token, { ...payload, kind } as TaskPayload);
        }), map(toRow));
      },
      canEditRow: row => (row['task'] as ApiTask).canManage,
      rowActions: row => {
        const task = row['task'] as ApiTask;
        const actions: ModuleRowAction[] = [];
        // Assignments: students upload their work from the portal; the teacher checks it here.
        if (!homework && task.canManage) actions.push({
          label: 'View submissions', icon: 'fact_check',
          run: () => {
            const data: SubmissionsDialogData = { taskCode: task.taskCode, title: task.title, group: task.batch?.label || '' };
            return this.dialog.open(SubmissionsDialogComponent, { width: '880px', maxWidth: 'calc(100vw - 24px)', data }).afterClosed().pipe(
              switchMap(changed => changed ? this.tasks.list(this.token, { kind }).pipe(map(list => { const fresh = list.find(item => item.taskCode === task.taskCode); return fresh ? toRow(fresh) : undefined; })) : of(undefined))
            );
          }
        });
        if (task.attachment) actions.push({ label: 'Open attachment', icon: 'attach_file', run: () => { window.open(task.attachment!.url, '_blank', 'noopener'); return of(undefined); } });
        return actions;
      },
      remove: row => this.tasks.remove(this.token, String(row['code']))
    };
  }

  /** Teacher: sections they teach or class-teach (school) or their batches (coaching). */
  private myClassesAdapter(school: boolean): ModuleApiAdapter {
    return {
      ...readOnly,
      columns: school
        ? [{ key: 'name', label: 'Class' }, { key: 'subject', label: 'My subjects' }, { key: 'timing', label: 'Periods / week' }, { key: 'students', label: 'Students' }, { key: 'room', label: 'Room' }]
        : [{ key: 'name', label: 'Batch' }, { key: 'subject', label: 'Subject' }, { key: 'timing', label: 'Timing' }, { key: 'students', label: 'Students' }, { key: 'room', label: 'Room' }],
      load: () => this.timetable.myClasses(this.token).pipe(map(rows => rows.map((row, index) => ({
        id: index + 1, code: row.batchCode, name: row.group,
        subject: school ? [...row.subjects, ...(row.classTeacher ? ['Class teacher'] : [])].join(', ') || '—' : row.subjects.join(', ') || row.course?.name || '—',
        timing: school
          ? (row.periodsPerWeek ? `${row.scheduled} scheduled of ${row.periodsPerWeek}` : `${row.scheduled ?? 0} scheduled`)
          : `${BatchApiService.daysLabel(row.days)} · ${timeRange(row.startTime, row.endTime)}`,
        students: row.capacity ? `${row.students} / ${row.capacity}` : row.students, room: row.room || '—'
      })))),
      fields: () => readFields([['name', school ? 'Class' : 'Batch'], ['subject', school ? 'My subjects' : 'Subject'], ['timing', school ? 'Periods / week' : 'Timing'], ['students', 'Students'], ['room', 'Room']])
    };
  }

  /** Teacher (school): one row per subject and section they teach. */
  private mySubjectsAdapter(): ModuleApiAdapter {
    return {
      ...readOnly,
      columns: [{ key: 'name', label: 'Subject' }, { key: 'className', label: 'Class' }, { key: 'periods', label: 'Periods / week' }, { key: 'scheduled', label: 'On timetable' }, { key: 'students', label: 'Students' }],
      load: () => this.subjects.mine(this.token).pipe(map(rows => rows.map((row, index) => ({
        id: index + 1, code: row.subjectCode, name: row.name, className: `${row.course?.name || ''} · ${row.section.name}`,
        periods: row.periodsPerWeek ?? '—', scheduled: row.scheduled, students: row.section.students
      })))),
      fields: () => readFields([['name', 'Subject'], ['className', 'Class'], ['periods', 'Periods / week'], ['scheduled', 'On timetable'], ['students', 'Students']])
    };
  }

  /** Today's periods (school) or batches meeting today (coaching). */
  private todayAdapter(school: boolean): ModuleApiAdapter {
    return {
      ...readOnly,
      columns: [{ key: 'time', label: 'Time' }, { key: 'group', label: school ? 'Class' : 'Batch' }, { key: 'subject', label: 'Subject' }, { key: 'room', label: 'Room' }],
      load: () => this.timetable.today(this.token).pipe(map(rows => rows.map((row, index) => ({
        id: index + 1, code: row.key, name: row.group, time: timeRange(row.startTime, row.endTime), group: row.group, subject: row.subject, room: row.room || '—'
      })))),
      fields: () => readFields([['time', 'Time'], ['group', school ? 'Class' : 'Batch'], ['subject', 'Subject'], ['room', 'Room']])
    };
  }
}

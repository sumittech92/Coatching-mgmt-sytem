import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, map, of, tap } from 'rxjs';
import * as XLSX from 'xlsx';
import { ModuleRow } from '../modules/module-registry';
import type { ModuleApiAdapter } from '../modules/module-api.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { WebsiteContentService } from '../../core/website-content.service';
import { ToastService } from '../../core/toast.service';
import { BatchApiService } from '../../core/batch-api.service';
import { CourseApiService } from '../../core/course-api.service';
import { dayLabel, fromApiDay, isoDay } from '../../core/api-client';
import { ApiEntrance, CANDIDATE_RESULT_LABELS, EntranceApiService, PRIMARY_CLASSES } from '../../core/entrance-api.service';
import { EntranceCandidatesDialogComponent } from './entrance-candidates-dialog.component';
import { printAdmitSlips, printResults } from './entrance-print';

const text = (value: unknown): string | null => String(value ?? '').trim() || null;
const num = (value: unknown): number => Number(value) || 0;
const capital = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/** Owner pages on the generic module page that aren't academic records: Entrance tests (school and coaching). */
@Injectable({ providedIn: 'root' })
export class OperationsModuleApiService {
  constructor(private auth: MockAuthService, private dialog: MatDialog, private tenant: TenantContextService, private content: WebsiteContentService, private toast: ToastService,
    private entrances: EntranceApiService, private courses: CourseApiService) {}

  private get token(): string { return this.auth.token!; }
  private get institution(): string { return this.content.profile.settings['name'] || this.auth.user?.instituteName || this.tenant.current.businessName; }

  adapter(key: string, school: boolean): ModuleApiAdapter | undefined {
    return key === 'entrance' ? this.entranceAdapter(school) : undefined;
  }

  /** Schools: Nursery – Class 5. Coaching: the institute's own courses (entrance / scholarship tests). */
  private entranceAdapter(school: boolean): ModuleApiAdapter {
    let classes: string[] = school ? [...PRIMARY_CLASSES] : [];
    const toRow = (test: ApiEntrance): ModuleRow => ({
      id: Number(test.entranceCode), code: test.entranceCode, test, name: test.name, className: test.className,
      date: fromApiDay(test.date), dateLabel: test.startTime ? `${dayLabel(test.date)} · ${BatchApiService.clock(test.startTime)}${test.endTime ? ' – ' + BatchApiService.clock(test.endTime) : ''}` : dayLabel(test.date),
      startTime: test.startTime || '', endTime: test.endTime || '', venue: test.venue || '', venueLabel: test.venue || '—',
      maxMarks: test.maxMarks, passMarks: test.passMarks, marksLabel: `${test.passMarks} / ${test.maxMarks}`, instructions: test.instructions || '',
      candidatesLabel: test.candidates.length ? `${test.candidates.length} · ${test.qualified} qualified` : 'None yet',
      state: test.cancelled ? 'Cancelled' : 'Scheduled', status: capital(test.status)
    });
    const exportResults = (test: ApiEntrance) => {
      if (!test.candidates.length) { this.toast.info('Add candidates first.'); return of(undefined); }
      const rows = [...test.candidates].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9)).map(candidate => ({
        Rank: candidate.rank ?? '', 'Roll no.': candidate.rollNo || '', Candidate: candidate.studentName, Parent: candidate.parentName || '', Mobile: candidate.phoneNumber || '',
        [`Marks (of ${test.maxMarks})`]: candidate.marks ?? '', Result: CANDIDATE_RESULT_LABELS[candidate.result || 'pending'], Remarks: candidate.remarks || ''
      }));
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Results');
      XLSX.writeFile(book, `${test.name.replace(/[^\w-]+/g, '-').toLowerCase()}-results-${isoDay(new Date())}.xlsx`);
      return of(undefined);
    };
    return {
      columns: [{ key: 'name', label: 'Test' }, { key: 'className', label: school ? 'Class' : 'Course' }, { key: 'dateLabel', label: 'Date' }, { key: 'venueLabel', label: 'Venue' }, { key: 'marksLabel', label: 'Pass / max' }, { key: 'candidatesLabel', label: 'Candidates' }, { key: 'status', label: 'Status', badge: true }],
      load: () => forkJoin({ tests: this.entrances.list(this.token), courses: school ? of([]) : this.courses.list(this.token) }).pipe(
        tap(({ courses }) => { if (!school) classes = courses.filter(course => course.status === 'active').map(course => course.name); }),
        map(({ tests }) => tests.map(toRow))
      ),
      blocker: () => classes.length ? '' : 'Add a course first, then create its entrance test.',
      fields: () => [
        { key: 'name', label: 'Test name', required: true, hint: school ? 'e.g. Admission test 2027–28' : 'e.g. Scholarship test (NEST)' },
        { key: 'className', label: school ? 'Class' : 'Course', type: 'select', options: classes, required: true, hint: school ? 'Nursery to Class 5 only' : 'Candidates come from this course’s enquiries' },
        { key: 'date', label: 'Date', type: 'date', required: true, future: true },
        { key: 'venue', label: 'Venue', hint: school ? 'e.g. Primary block, Room 3' : 'e.g. Main centre, Hall 2' },
        { key: 'startTime', label: 'Starts at', type: 'time' },
        { key: 'endTime', label: 'Ends at', type: 'time' },
        { key: 'maxMarks', label: 'Max marks', type: 'number', required: true },
        { key: 'passMarks', label: school ? 'Pass marks' : 'Qualifying marks', type: 'number', required: true },
        { key: 'state', label: 'Status', type: 'select', options: ['Scheduled', 'Cancelled'], required: true, hint: 'Past tests show as Completed.' },
        { key: 'instructions', label: 'Instructions (printed on admit slips)', type: 'textarea' }
      ],
      save: (value, row) => {
        const maxMarks = num(value['maxMarks']), passMarks = num(value['passMarks']);
        if (maxMarks < 1) throw new Error('Max marks must be at least 1.');
        if (passMarks > maxMarks) throw new Error(`${school ? 'Pass' : 'Qualifying'} marks cannot be more than max marks.`);
        if (value['startTime'] && value['endTime'] && String(value['endTime']) <= String(value['startTime'])) throw new Error('End time must be after the start time.');
        const body = {
          name: String(value['name']), className: String(value['className']), date: isoDay(value['date']), startTime: text(value['startTime']), endTime: text(value['endTime']),
          venue: text(value['venue']), maxMarks, passMarks, instructions: text(value['instructions']), cancelled: value['state'] === 'Cancelled'
        };
        return (row ? this.entrances.update(this.token, String(row['code']), body) : this.entrances.create(this.token, body)).pipe(map(toRow));
      },
      remove: row => this.entrances.remove(this.token, String(row['code'])),
      rowActions: row => {
        const test = row['test'] as ApiEntrance;
        return [
          { label: 'Candidates & marks', icon: 'how_to_reg', done: 'Candidates and marks saved.',
            run: () => this.dialog.open(EntranceCandidatesDialogComponent, { width: '1000px', maxWidth: 'calc(100vw - 24px)', data: test }).afterClosed().pipe(map((saved?: ApiEntrance) => saved ? toRow(saved) : undefined)) },
          { label: 'Print admit slips', icon: 'badge', run: () => { if (!test.candidates.length) this.toast.info('Add candidates first.'); else printAdmitSlips(test, this.institution, this.content.customLogo); return of(undefined); } },
          { label: 'Print result list', icon: 'print', run: () => { if (!test.candidates.length) this.toast.info('Add candidates first.'); else printResults(test, this.institution, this.content.customLogo); return of(undefined); } },
          { label: 'Export results', icon: 'download', run: () => exportResults(test) }
        ];
      },
      summary: rows => {
        const tests = rows.map(item => item['test'] as ApiEntrance);
        const candidates = tests.reduce((sum, test) => sum + test.candidates.length, 0);
        return [
          { label: 'Entrance tests', value: rows.length },
          { label: 'Upcoming', value: tests.filter(test => test.status === 'scheduled').length },
          { label: 'Candidates', value: candidates },
          { label: 'Qualified', value: tests.reduce((sum, test) => sum + test.qualified, 0) }
        ];
      }
    };
  }
}

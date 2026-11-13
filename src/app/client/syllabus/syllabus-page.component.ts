import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import * as XLSX from 'xlsx';
import { forkJoin, of } from 'rxjs';
import { MockAuthService } from '../../core/mock-auth.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmationDialogService } from '../../core/confirmation-dialog.service';
import { CourseApiService } from '../../core/course-api.service';
import { ApiSyllabus, SyllabusApiService, SyllabusCell, SyllabusGroup, SyllabusPayload, SyllabusStatus } from '../../core/syllabus-api.service';
import { SyllabusEditorDialogComponent, SyllabusEditorData, SyllabusCourseOption } from './syllabus-editor-dialog.component';
import { SyllabusChecklistDialogComponent, SyllabusChecklistData } from './syllabus-checklist-dialog.component';

/**
 * Syllabus progress: for every class / course, each section's / batch's % of chapters done per subject, with
 * On track / Behind against the chapters' target months. Owners manage chapter lists; teachers tick chapters for the
 * subjects they teach and may add their own chapters.
 */
@Component({ selector: 'app-syllabus-page', templateUrl: './syllabus-page.component.html', styleUrls: ['./syllabus-page.component.scss'] })
export class SyllabusPageComponent implements OnInit {
  tab: 'progress' | 'lists' = 'progress';
  groups: SyllabusGroup[] = [];
  syllabi: ApiSyllabus[] = [];
  /** Classes / courses with their subjects, for the editor. */
  courses: SyllabusCourseOption[] = [];
  courseFilter = '';
  loading = false;

  constructor(private auth: MockAuthService, private tenant: TenantContextService, private toast: ToastService, private confirm: ConfirmationDialogService,
    private dialog: MatDialog, private api: SyllabusApiService, private courseApi: CourseApiService) {}

  get live(): boolean { return !!this.auth.token; }
  get isOwner(): boolean { return this.auth.role === 'Owner'; }
  get isSchool(): boolean { return this.tenant.isSchool; }
  get workspaceLabel(): string { return this.isSchool ? 'School' : 'Coaching'; }
  get groupWord(): string { return this.isSchool ? 'section' : 'batch'; }
  get classWord(): string { return this.isSchool ? 'class' : 'course'; }

  ngOnInit(): void { if (this.live) this.load(); }

  load(): void {
    const token = this.auth.token!;
    this.loading = true;
    forkJoin({ groups: this.api.overview(token), syllabi: this.api.list(token), courses: this.isOwner ? this.courseApi.list(token) : of(null) }).subscribe({
      next: ({ groups, syllabi, courses }) => {
        this.loading = false;
        this.groups = groups;
        this.syllabi = syllabi;
        // Owners pick any class / course subject; teachers the subjects they teach (from their grid).
        this.courses = courses
          ? courses.filter(course => course.status === 'active').map(course => ({ courseCode: course.courseCode, name: course.name, subjects: course.subjects }))
          : groups.map(group => ({ courseCode: group.course.courseCode, name: group.course.name, subjects: group.subjects }));
        if (this.courseFilter && !this.groups.some(group => group.course.courseCode === this.courseFilter)) this.courseFilter = '';
      },
      error: (error: Error) => { this.loading = false; this.toast.error(error.message); }
    });
  }

  get shownGroups(): SyllabusGroup[] { return this.groups.filter(group => !this.courseFilter || group.course.courseCode === this.courseFilter); }
  get shownSyllabi(): ApiSyllabus[] { return this.syllabi.filter(item => !this.courseFilter || item.course?.courseCode === this.courseFilter); }
  private get cells(): SyllabusCell[] { return this.shownGroups.flatMap(group => group.rows.flatMap(row => row.cells)); }
  /** Summary chips: average % of subjects that have a syllabus, behind count, subjects without a syllabus. */
  get average(): number { const set = this.cells.filter(cell => cell.syllabusCode); return set.length ? Math.round(set.reduce((sum, cell) => sum + cell.percent, 0) / set.length) : 0; }
  get behind(): number { return this.cells.filter(cell => cell.status === 'Behind').length; }
  get notSet(): number { return new Set(this.shownGroups.flatMap(group => group.rows.flatMap(row => row.cells.filter(cell => !cell.syllabusCode).map(cell => `${group.course.courseCode}:${cell.subject}`)))).size; }

  tone(status: SyllabusStatus): 'success' | 'danger' | 'neutral' | 'info' { return status === 'On track' ? 'success' : status === 'Behind' ? 'danger' : status === 'No targets' ? 'info' : 'neutral'; }
  barClass(cell: SyllabusCell): string { return cell.status === 'Behind' ? 'bar behind' : cell.percent >= 100 ? 'bar complete' : 'bar'; }

  /** A grid cell: open its checklist, or (no syllabus yet) start one. */
  openCell(group: SyllabusGroup, cell: SyllabusCell, batchCode: string): void {
    if (cell.syllabusCode) { this.openChecklist(cell.syllabusCode, batchCode); return; }
    if (!cell.canMark && !this.isOwner) return;
    this.openEditor(undefined, group.course.courseCode, cell.subject);
  }

  openChecklist(code: string, batchCode?: string): void {
    const data: SyllabusChecklistData = { code, batchCode };
    this.dialog.open(SyllabusChecklistDialogComponent, { width: '760px', maxWidth: 'calc(100vw - 24px)', data }).afterClosed().subscribe(changed => { if (changed) this.load(); });
  }

  openEditor(syllabus?: ApiSyllabus, courseCode?: string, subject?: string): void {
    const data: SyllabusEditorData = { syllabus, courses: this.courses, courseCode, subject, owner: this.isOwner, school: this.isSchool };
    this.dialog.open(SyllabusEditorDialogComponent, { width: '860px', maxWidth: 'calc(100vw - 24px)', data }).afterClosed().subscribe((payload: SyllabusPayload | undefined) => {
      if (!payload) return;
      const token = this.auth.token!;
      const request = syllabus ? this.api.saveChapters(token, syllabus.syllabusCode, payload.chapters) : this.api.create(token, payload);
      request.subscribe({
        next: saved => { this.toast.success(`Syllabus for ${saved.course?.name} · ${saved.subject} saved (${saved.chapters.length} chapters).`); this.load(); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }

  remove(syllabus: ApiSyllabus): void {
    this.confirm.confirm({ title: 'Delete syllabus?', message: `Delete the ${syllabus.course?.name} · ${syllabus.subject} syllabus? Its chapters and every ${this.groupWord}'s progress are removed.`, confirmLabel: 'Delete', destructive: true }).subscribe(ok => {
      if (!ok) return;
      this.api.remove(this.auth.token!, syllabus.syllabusCode).subscribe({
        next: () => { this.toast.success(`${syllabus.course?.name} · ${syllabus.subject} syllabus deleted.`); this.load(); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }

  exportExcel(): void {
    const rows: (string | number)[][] = [[this.isSchool ? 'Class' : 'Course', this.isSchool ? 'Section' : 'Batch', 'Subject', 'Chapters done', 'Chapters', '% done', '% expected', 'Status']];
    this.shownGroups.forEach(group => group.rows.forEach(row => row.cells.forEach(cell => rows.push([group.course.name, row.label, cell.subject, cell.done, cell.total, cell.syllabusCode ? cell.percent : '', cell.expected ?? '', cell.status]))));
    if (rows.length === 1) { this.toast.error('Nothing to export yet.'); return; }
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Syllabus progress');
    XLSX.writeFile(book, `syllabus-progress-${new Date().toISOString().slice(0, 10)}.xlsx`);
    this.toast.success(`Exported ${rows.length - 1} rows to Excel.`);
  }

  monthLabel(month: string | null): string {
    if (!month) return '—';
    const [year, value] = month.split('-').map(Number);
    return new Date(year, value - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }
  /** Last target month of a syllabus (when it should be finished). */
  finishBy(syllabus: ApiSyllabus): string { const months = syllabus.chapters.map(chapter => chapter.targetMonth).filter(Boolean).sort(); return this.monthLabel(months[months.length - 1] || null); }
  trackByCode(_: number, item: { syllabusCode: string }): string { return item.syllabusCode; }
}

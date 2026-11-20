import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { RecordDialogComponent } from '../management/record-dialog.component';
import { OnlineClassDialogComponent, OnlineClassDialogData } from './online-class-dialog.component';
import { ConfirmationDialogService } from '../../core/confirmation-dialog.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { ToastService } from '../../core/toast.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { ApiBatch, BatchApiService } from '../../core/batch-api.service';
import { ApiCourse, CourseApiService } from '../../core/course-api.service';
import { ApiTeacher, TeacherApiService } from '../../core/teacher-api.service';
import { dayLabel, isoDay } from '../../core/api-client';
import { ApiOnlineClass, OnlineClassApiService, OnlineClassPayload } from '../../core/online-class-api.service';

type Tab = 'today' | 'upcoming' | 'past';

/** Live classes on Google Meet: the owner sees every class, a teacher their own. */
@Component({ selector: 'app-online-classes-page', templateUrl: './online-classes-page.component.html', styleUrls: ['./online-classes-page.component.scss'] })
export class OnlineClassesPageComponent implements OnInit, OnDestroy {
  tab = 0;
  loading = false;
  classes: ApiOnlineClass[] = [];
  batches: ApiBatch[] = []; courses: ApiCourse[] = []; teachers: ApiTeacher[] = [];
  search = '';
  private refresh?: ReturnType<typeof setInterval>;

  constructor(private api: OnlineClassApiService, private batchApi: BatchApiService, private courseApi: CourseApiService, private teacherApi: TeacherApiService,
    private dialog: MatDialog, private confirm: ConfirmationDialogService, public auth: MockAuthService, private toast: ToastService, private tenant: TenantContextService) {}

  get owner(): boolean { return this.auth.role === 'Owner'; }
  get school(): boolean { return this.tenant.isSchool; }
  private get token(): string | null { return this.auth.token; }

  ngOnInit(): void {
    this.load();
    // Live / joinable states move with the clock; re-read the list every minute.
    this.refresh = setInterval(() => this.reloadClasses(), 60000);
  }
  ngOnDestroy(): void { if (this.refresh) clearInterval(this.refresh); }

  load(): void {
    const token = this.token;
    if (!token) return;
    this.loading = true;
    forkJoin({
      classes: this.api.list(token), batches: this.batchApi.list(token, { status: 'active' }), courses: this.courseApi.list(token),
      teachers: this.owner ? this.teacherApi.list(token) : of([] as ApiTeacher[])
    }).subscribe({
      next: result => { this.loading = false; Object.assign(this, result); this.teachers = result.teachers.filter(teacher => teacher.status !== 'inactive'); if (!this.today.length && this.upcoming.length) this.tab = 1; },
      error: (error: Error) => { this.loading = false; this.toast.error(error.message); }
    });
  }
  private reloadClasses(): void { const token = this.token; if (token) this.api.list(token).subscribe({ next: list => this.classes = list, error: () => { /* keep the list shown */ } }); }

  // ---------------------------------------------------------------- Lists

  private matches(item: ApiOnlineClass): boolean {
    const q = this.search.trim().toLowerCase();
    return !q || `${item.topic} ${item.subject} ${item.teacherName || ''} ${item.batches.map(batch => batch.name).join(' ')}`.toLowerCase().includes(q);
  }
  private todayKey = isoDay(new Date());
  get today(): ApiOnlineClass[] { return this.classes.filter(item => item.date.slice(0, 10) === this.todayKey && this.matches(item)); }
  get upcoming(): ApiOnlineClass[] { return this.classes.filter(item => item.date.slice(0, 10) > this.todayKey && this.matches(item)); }
  get past(): ApiOnlineClass[] { return this.classes.filter(item => item.date.slice(0, 10) < this.todayKey && this.matches(item)).reverse(); }
  listFor(tab: Tab): ApiOnlineClass[] { return tab === 'today' ? this.today : tab === 'upcoming' ? this.upcoming : this.past; }
  get liveCount(): number { return this.classes.filter(item => item.status === 'live').length; }

  day(item: ApiOnlineClass): string { return dayLabel(item.date); }
  clock(time: string): string { return BatchApiService.clock(time); }
  groups(item: ApiOnlineClass): string { return item.batches.map(batch => this.school && batch.courseName ? `${batch.courseName} · ${batch.name}` : batch.name).join(', ') || '—'; }
  tone(item: ApiOnlineClass): 'success' | 'info' | 'neutral' | 'danger' { return item.status === 'live' ? 'success' : item.status === 'scheduled' ? 'info' : item.status === 'cancelled' ? 'danger' : 'neutral'; }
  statusLabel(item: ApiOnlineClass): string { return item.status === 'live' ? 'Live now' : item.status.charAt(0).toUpperCase() + item.status.slice(1); }

  // ---------------------------------------------------------------- Actions

  open(item?: ApiOnlineClass): void {
    const token = this.token;
    if (!token) return;
    if (!this.batches.length) { this.toast.warning(this.school ? 'Create a section first, then schedule its online classes.' : 'Create a batch first, then schedule its online classes.'); return; }
    const data: OnlineClassDialogData = { item, batches: this.batches, courses: this.courses, teachers: this.teachers, owner: this.owner, school: this.school };
    this.dialog.open(OnlineClassDialogComponent, { width: '780px', maxWidth: 'calc(100vw - 24px)', data }).afterClosed().subscribe((payload?: OnlineClassPayload) => {
      if (!payload) return;
      if (item) {
        this.api.update(token, item.classCode, payload).subscribe({ next: saved => { this.replace(saved); this.toast.success('Class updated.'); }, error: (error: Error) => this.toast.error(error.message) });
        return;
      }
      this.api.create(token, payload).subscribe({
        next: created => { this.classes = [...this.classes, ...created].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)); this.toast.success(created.length > 1 ? `${created.length} classes scheduled.` : 'Class scheduled. Students see it in their portal.'); },
        error: (error: Error) => this.toast.error(error.message)
      });
    });
  }

  /** Marks the class live and opens the Meet for the teacher. */
  start(item: ApiOnlineClass): void {
    const token = this.token;
    if (!token) return;
    const tab = window.open('about:blank', '_blank');
    this.api.start(token, item.classCode).subscribe({
      next: saved => { this.replace(saved); if (tab && saved.meetLink) tab.location.href = saved.meetLink; else if (saved.meetLink) window.open(saved.meetLink, '_blank', 'noopener'); this.toast.success('Class is live. Students can join now.'); },
      error: (error: Error) => { tab?.close(); this.toast.error(error.message); }
    });
  }
  openMeet(item: ApiOnlineClass): void { if (item.meetLink) window.open(item.meetLink, '_blank', 'noopener'); }

  complete(item: ApiOnlineClass): void {
    const token = this.token;
    if (!token) return;
    this.dialog.open(RecordDialogComponent, { width: '520px', maxWidth: 'calc(100vw - 24px)', data: { title: `Finish · ${item.topic}`, submitLabel: item.completedAt ? 'Save recording' : 'Mark completed', successMessage: '', record: { recordingLink: item.recordingLink || '' },
      fields: [{ key: 'recordingLink', label: 'Recording link', hint: 'Google Drive or YouTube link, so students who missed it can watch' }] } })
      .afterClosed().subscribe(value => {
        if (!value) return;
        const link = String(value.recordingLink || '').trim();
        if (link && !/^https:\/\//.test(link)) { this.toast.error('Paste a full link starting with https://'); return; }
        this.api.complete(token, item.classCode, link || null).subscribe({ next: saved => { this.replace(saved); this.toast.success(link ? 'Recording saved for students.' : 'Class marked completed.'); }, error: (error: Error) => this.toast.error(error.message) });
      });
  }

  attendance(item: ApiOnlineClass): void {
    const token = this.token;
    if (!token) return;
    this.api.attendance(token, item.classCode).subscribe({
      next: list => {
        const rows = list.map((entry, index) => `${index + 1}. ${entry.name} · joined ${new Date(entry.joinedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`);
        this.dialog.open(RecordDialogComponent, { width: '520px', maxWidth: 'calc(100vw - 24px)', data: { title: `Who joined · ${item.topic}`, submitLabel: 'Done', readonly: true,
          record: { count: `${list.length} student${list.length === 1 ? '' : 's'}`, list: rows.length ? rows.join('\n') : 'No student has joined this class yet.' },
          fields: [{ key: 'count', label: 'Joined' }, { key: 'list', label: 'Students (in the order they joined)', type: 'textarea' }] } });
      },
      error: (error: Error) => this.toast.error(error.message)
    });
  }

  cancel(item: ApiOnlineClass): void {
    const token = this.token;
    if (!token) return;
    const cancel = !item.cancelled;
    this.confirm.confirm(cancel ? { title: 'Cancel class?', message: `Cancel “${item.topic}” on ${this.day(item)}? Students see it as cancelled.`, confirmLabel: 'Cancel class', destructive: true } : { title: 'Restore class?', message: `Restore “${item.topic}”?`, confirmLabel: 'Restore' })
      .subscribe(ok => { if (ok) this.api.update(token, item.classCode, { cancelled: cancel }).subscribe({ next: saved => { this.replace(saved); this.toast.success(cancel ? 'Class cancelled.' : 'Class restored.'); }, error: (error: Error) => this.toast.error(error.message) }); });
  }

  remove(item: ApiOnlineClass, series = false): void {
    const token = this.token;
    if (!token) return;
    this.confirm.confirm({ title: series ? 'Delete this and later classes?' : 'Delete class?', message: series ? `Delete “${item.topic}” on ${this.day(item)} and every later class of this weekly series?` : `Delete “${item.topic}” on ${this.day(item)}? This cannot be undone.`, confirmLabel: 'Delete', destructive: true })
      .subscribe(ok => {
        if (!ok) return;
        this.api.remove(token, item.classCode, series).subscribe({
          next: result => { this.classes = this.classes.filter(entry => series && item.seriesId ? !(entry.seriesId === item.seriesId && entry.date >= item.date) : entry !== item); this.toast.success(`${result.deleted} class${result.deleted === 1 ? '' : 'es'} deleted.`); },
          error: (error: Error) => this.toast.error(error.message)
        });
      });
  }
  private replace(saved: ApiOnlineClass): void { this.classes = this.classes.map(item => item.classCode === saved.classCode ? saved : item); }
}

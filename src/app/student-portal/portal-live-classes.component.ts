import { Component, OnDestroy, OnInit } from '@angular/core';
import { MockAuthService } from '../core/mock-auth.service';
import { ToastService } from '../core/toast.service';
import { BatchApiService } from '../core/batch-api.service';
import { dayLabel, isoDay } from '../core/api-client';
import { ApiOnlineClass, OnlineClassApiService } from '../core/online-class-api.service';

/** Student portal: today's, upcoming and past online classes. Join opens Google Meet and marks the student present. */
@Component({ selector: 'app-portal-live-classes', templateUrl: './portal-live-classes.component.html', styleUrls: ['./portal-live-classes.component.scss'] })
export class PortalLiveClassesComponent implements OnInit, OnDestroy {
  tab = 0;
  loading = false;
  joining = '';
  classes: ApiOnlineClass[] = [];
  now = Date.now();
  private timer?: ReturnType<typeof setInterval>;
  private readonly todayKey = isoDay(new Date());

  constructor(private api: OnlineClassApiService, public auth: MockAuthService, private toast: ToastService) {}

  ngOnInit(): void {
    this.load();
    // Countdowns tick every 30 s; the list is re-read every 2 minutes so Join switches on by itself.
    let ticks = 0;
    this.timer = setInterval(() => { this.now = Date.now(); if (++ticks % 4 === 0) this.load(true); }, 30000);
  }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  load(quiet = false): void {
    const token = this.auth.token;
    if (!token) return;
    if (!quiet) this.loading = true;
    this.api.portalList(token).subscribe({
      next: list => { this.loading = false; this.classes = list; if (!quiet && !this.today.length && this.upcoming.length) this.tab = 1; },
      error: (error: Error) => { this.loading = false; if (!quiet) this.toast.error(error.message); }
    });
  }

  get today(): ApiOnlineClass[] { return this.classes.filter(item => item.date.slice(0, 10) === this.todayKey); }
  get upcoming(): ApiOnlineClass[] { return this.classes.filter(item => item.date.slice(0, 10) > this.todayKey); }
  get past(): ApiOnlineClass[] { return this.classes.filter(item => item.date.slice(0, 10) < this.todayKey).reverse(); }
  get isStudent(): boolean { return this.auth.role === 'Student'; }

  day(item: ApiOnlineClass): string { return dayLabel(item.date); }
  clock(time: string): string { return BatchApiService.clock(time); }
  groups(item: ApiOnlineClass): string { return item.batches.map(batch => batch.name).join(', '); }
  /** "Starts in 25 min" for today's classes that haven't opened yet. */
  countdown(item: ApiOnlineClass): string {
    const [h, m] = item.startTime.split(':').map(Number);
    const start = new Date(); start.setHours(h, m, 0, 0);
    const mins = Math.round((start.getTime() - this.now) / 60000);
    if (mins <= 0) return 'Starting now';
    return mins >= 60 ? `Starts in ${Math.floor(mins / 60)} h ${mins % 60} min` : `Starts in ${mins} min`;
  }

  join(item: ApiOnlineClass): void {
    const token = this.auth.token;
    if (!token || this.joining) return;
    // Open the tab now (inside the click) so pop-up blockers allow it, then point it at the Meet.
    const tab = window.open('about:blank', '_blank');
    this.joining = item.classCode;
    this.api.join(token, item.classCode).subscribe({
      next: result => { this.joining = ''; item.joined = true; if (tab) tab.location.href = result.meetLink; else window.open(result.meetLink, '_blank', 'noopener'); this.toast.success('Joining on Google Meet. You are marked present.'); },
      error: (error: Error) => { this.joining = ''; tab?.close(); this.toast.error(error.message); }
    });
  }
  /** Clicking the link itself goes through Join while the class is open, so the student is marked present. */
  openLink(event: Event, item: ApiOnlineClass): void {
    if (this.isStudent && item.joinable && !item.joined) { event.preventDefault(); this.join(item); }
  }
  copy(item: ApiOnlineClass): void {
    if (!item.meetLink) return;
    navigator.clipboard?.writeText(item.meetLink).then(() => this.toast.success('Meet link copied.'), () => this.toast.info(item.meetLink!));
  }
  watch(item: ApiOnlineClass): void { if (item.recordingLink) window.open(item.recordingLink, '_blank', 'noopener'); }
}

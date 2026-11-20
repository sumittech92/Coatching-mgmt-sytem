import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MockAuthService } from '../../../core/mock-auth.service';
import { ToastService } from '../../../core/toast.service';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';
import { TenantContextService } from '../../../core/tenant-context.service';
import { WebsiteContentService } from '../../../core/website-content.service';
import { dayLabel } from '../../../core/api-client';
import { ApiMockPaper, MockPaperApiService, PaperDifficulty, PaperKind, PaperLength, PaperOptions } from '../../../core/mock-paper-api.service';
import { printMockPaper } from '../../../core/mock-paper-print';

const PAPER_CLASSES = ['Class 9', 'Class 10', 'Class 11', 'Class 12'];
const HINTS = ['Reading the chapters…', 'Picking the board pattern…', 'Writing questions…', 'Balancing marks across sections…', 'Preparing the answer key…'];

/**
 * Mock test papers written by AI (school, Classes 9–12): pick board, subject and chapters, generate, then print / save as PDF.
 * `portal`: a student's own papers (class fixed, at most 3 downloads per paper). Otherwise the owner / teacher view of the school.
 */
@Component({ selector: 'app-mock-paper-workspace', templateUrl: './mock-paper-workspace.component.html', styleUrls: ['./mock-paper-workspace.component.scss'] })
export class MockPaperWorkspaceComponent implements OnInit, OnDestroy {
  @Input() portal = false;
  options?: PaperOptions;
  papers: ApiMockPaper[] = [];
  loading = false; generating = false; downloading = '';
  elapsed = 0; private timer?: ReturnType<typeof setInterval>;
  // Form
  board = ''; className = ''; subject = ''; customSubject = ''; kind: PaperKind = 'chapter'; chapters: string[] = []; customChapter = '';
  length: PaperLength = 'standard'; difficulty: PaperDifficulty = 'mixed';
  // List filters
  search = ''; filterClass = ''; filterSubject = '';
  readonly difficulties: { value: PaperDifficulty; label: string }[] = [{ value: 'mixed', label: 'Mixed' }, { value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }];
  readonly lengths: PaperLength[] = ['short', 'standard', 'board'];

  constructor(private api: MockPaperApiService, public auth: MockAuthService, private toast: ToastService, private confirm: ConfirmationDialogService, private tenant: TenantContextService, private content: WebsiteContentService) {}

  private get token(): string | null { return this.auth.token; }

  ngOnInit(): void {
    try { this.board = localStorage.getItem('mock-paper-board') || ''; } catch { /* storage optional */ }
    this.load();
  }
  ngOnDestroy(): void { this.stopTimer(); }

  load(): void {
    const token = this.token;
    if (!token) return;
    this.loading = true;
    forkJoin({ options: this.api.options(token, this.portal), papers: this.api.list(token, this.portal) }).subscribe({
      next: ({ options, papers }) => {
        this.loading = false; this.options = options; this.papers = papers;
        if (!options.boards.includes(this.board)) this.board = options.boards[0];
        if (!this.className) this.className = options.classes[0]?.className || '';
        this.pickFirstSubject();
      },
      error: (error: Error) => { this.loading = false; this.toast.error(error.message); }
    });
  }

  // ---------------------------------------------------------------- Form

  /** Students outside Classes 9–12 can't use mock papers. */
  get eligible(): boolean { return !this.portal || PAPER_CLASSES.includes(this.className); }
  get classOptions(): string[] { return this.options?.classes.map(item => item.className) || []; }
  get subjects(): { subject: string; chapters: string[] }[] { return this.options?.classes.find(item => item.className === this.className)?.subjects || []; }
  get chapterOptions(): string[] {
    const known = this.subjects.find(item => item.subject === this.subject)?.chapters || [];
    return [...known, ...this.chapters.filter(chapter => !known.includes(chapter))];
  }
  get subjectName(): string { return (this.subject === '__other' ? this.customSubject : this.subject).trim(); }
  get size() { return this.options?.sizes[this.length]; }
  sizeLabel(length: PaperLength): string { const size = this.options?.sizes[length]; return size ? `${size.label} · ${size.marks} marks · ${size.minutes >= 60 ? size.minutes / 60 + ' hr' : size.minutes + ' min'}` : length; }
  classChanged(): void { this.pickFirstSubject(); }
  private pickFirstSubject(): void { this.subject = this.subjects[0]?.subject || '__other'; this.chapters = []; }
  subjectChanged(): void { this.chapters = []; }
  toggleChapter(chapter: string, on: boolean): void { this.chapters = on ? [...this.chapters, chapter] : this.chapters.filter(item => item !== chapter); }
  selectAllChapters(): void { this.chapters = this.chapters.length === this.chapterOptions.length ? [] : [...this.chapterOptions]; }
  addChapter(): void {
    const name = this.customChapter.trim();
    if (!name) return;
    if (this.chapters.length >= 15) { this.toast.info('Choose up to 15 chapters for one paper.'); return; }
    if (!this.chapters.some(item => item.toLowerCase() === name.toLowerCase())) this.chapters = [...this.chapters, name];
    this.customChapter = '';
  }

  generate(): void {
    const token = this.token;
    if (!token || this.generating) return;
    if (!this.subjectName) { this.toast.error('Choose or type the subject.'); return; }
    if (this.kind === 'chapter' && !this.chapters.length) { this.toast.error('Choose at least one chapter, or pick “Full syllabus”.'); return; }
    if (this.chapters.length > 15) { this.toast.error('Choose up to 15 chapters for one paper.'); return; }
    try { localStorage.setItem('mock-paper-board', this.board); } catch { /* storage optional */ }
    this.generating = true; this.elapsed = 0;
    this.timer = setInterval(() => this.elapsed++, 1000);
    this.api.generate(token, this.portal, {
      board: this.board, ...(this.portal ? {} : { className: this.className }), subject: this.subjectName, kind: this.kind,
      chapters: this.kind === 'chapter' ? this.chapters : [], length: this.length, difficulty: this.difficulty
    }).subscribe({
      next: paper => {
        this.stopTimer(); this.generating = false; this.papers = [paper, ...this.papers];
        this.toast.success(`“${paper.title}” is ready. Download it below${this.portal ? ` (up to ${paper.maxDownloads} times)` : ''}.`);
      },
      error: (error: Error) => { this.stopTimer(); this.generating = false; this.toast.error(error.message); }
    });
  }
  get hint(): string { return HINTS[Math.min(HINTS.length - 1, Math.floor(this.elapsed / 12))]; }
  private stopTimer(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; }

  // ---------------------------------------------------------------- Papers

  get filtered(): ApiMockPaper[] {
    const q = this.search.trim().toLowerCase();
    return this.papers.filter(paper => (!this.filterClass || paper.className === this.filterClass) && (!this.filterSubject || paper.subject === this.filterSubject)
      && (!q || `${paper.title} ${paper.subject} ${paper.chapters.join(' ')} ${paper.createdByName}`.toLowerCase().includes(q)));
  }
  get paperSubjects(): string[] { return [...new Set(this.papers.map(paper => paper.subject))].sort(); }
  scope(paper: ApiMockPaper): string { return paper.kind === 'full' ? 'Full syllabus' : paper.chapters.join(', '); }
  day(value: string): string { return dayLabel(value); }
  levelLabel(value: PaperDifficulty): string { return this.difficulties.find(item => item.value === value)?.label || value; }

  /** Students get a warning as downloads run out, and are stopped at the limit. */
  download(paper: ApiMockPaper, withAnswers: boolean): void {
    const token = this.token;
    if (!token || this.downloading) return;
    if (paper.downloadsLeft === 0) { this.toast.warning(`You have downloaded this paper ${paper.maxDownloads} times. Generate a new paper to keep practising.`); return; }
    const go = () => {
      this.downloading = paper.paperCode;
      this.api.download(token, this.portal, paper.paperCode).subscribe({
        next: full => {
          this.downloading = '';
          Object.assign(paper, { downloads: full.downloads, downloadsLeft: full.downloadsLeft });
          printMockPaper(full, this.content.profile.settings['name'] || this.auth.user?.instituteName || this.tenant.current.businessName, withAnswers);
          if (full.downloadsLeft !== null) {
            const message = `Download ${full.downloads} of ${full.maxDownloads}. ${full.downloadsLeft ? `${full.downloadsLeft} download${full.downloadsLeft === 1 ? '' : 's'} left for this paper.` : 'That was the last download of this paper.'}`;
            (full.downloadsLeft ? this.toast.info.bind(this.toast) : this.toast.warning.bind(this.toast))(message + ' Choose “Save as PDF” in the print window to keep a copy.');
          }
        },
        error: (error: Error) => { this.downloading = ''; this.toast.error(error.message); }
      });
    };
    // A normal heads-up before the last allowed download.
    if (paper.downloadsLeft === 1) {
      this.confirm.confirm({ title: 'Last download', message: `This is the last time you can download “${paper.title}”. Save it as a PDF in the print window so you keep a copy.`, confirmLabel: 'Download now' }).subscribe(ok => { if (ok) go(); });
      return;
    }
    go();
  }
}

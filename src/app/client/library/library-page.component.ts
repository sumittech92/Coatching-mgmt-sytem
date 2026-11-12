import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { RecordDialogComponent, RecordField } from '../management/record-dialog.component';
import { ConfirmationDialogService } from '../../core/confirmation-dialog.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { MockDataService } from '../../core/mock-data.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { ToastService } from '../../core/toast.service';
import { LOAN_DAYS, LibraryBook, LibraryIssue, LibraryRequest, LibraryService, LibraryView } from '../../core/library.service';
import { BookInput, LibraryApiService } from '../../core/library-api.service';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';
interface Member { id: string; name: string; type: 'Student' | 'Teacher'; }
const AUTO_ACCESSION = 'Next available copy';

/**
 * Library: book catalogue, issue / return / renew, and book requests from students. Owners manage it; teachers can look things up.
 * Signed-in accounts use crm-backend (per-institute loan days, fine and book limit; school copies carry accession numbers); demo sessions use sample data.
 */
@Component({ selector: 'app-library-page', templateUrl: './library-page.component.html', styleUrls: ['./library-page.component.scss'] })
export class LibraryPageComponent implements OnInit {
  tab = 0;
  bookSearch = ''; categoryFilter = '';
  loanSearch = ''; loanFilter: '' | 'Issued' | 'Overdue' | 'Returned' = '';
  loading = false;
  private readonly teachers: Record<string, Member[]> = {
    school: [{ id: 'T-101', name: 'Meena Joshi', type: 'Teacher' }, { id: 'T-102', name: 'Arjun Menon', type: 'Teacher' }, { id: 'T-104', name: 'Kavita Rao', type: 'Teacher' }],
    coaching: [{ id: 'T-201', name: 'Priya Nair', type: 'Teacher' }, { id: 'T-202', name: 'Ankit Rao', type: 'Teacher' }]
  };

  constructor(private demo: LibraryService, private api: LibraryApiService, private dialog: MatDialog, private confirm: ConfirmationDialogService, private auth: MockAuthService, private students: MockDataService, private tenant: TenantContextService, private toast: ToastService) {}

  ngOnInit(): void { if (this.live) this.reload(); }

  /** Real accounts read and write crm-backend. */
  get live(): boolean { return !!this.auth.token; }
  get library(): LibraryView { return this.live ? this.api : this.demo; }
  get loanDays(): number { return this.library.loanDays; }
  get finePerDay(): number { return this.library.finePerDay; }
  get maxBooks(): number { return this.live ? this.api.settings.maxBooks : 0; }
  get canEdit(): boolean { return this.auth.role === 'Owner'; }
  get isSchool(): boolean { return this.tenant.isSchool; }
  get workspaceLabel(): string { return this.isSchool ? 'School' : 'Coaching'; }
  get categories(): string[] { return [...new Set(this.library.books.map(book => book.category))].sort(); }
  get members(): Member[] {
    if (this.live) return this.api.members.map(member => ({ id: member.code, name: member.name, type: member.type === 'teacher' ? 'Teacher' as const : 'Student' as const }));
    return [...this.students.students.map(s => ({ id: s.studentId, name: s.name, type: 'Student' as const })), ...(this.teachers[this.tenant.current.businessType] || [])];
  }

  get books(): LibraryBook[] {
    const q = this.bookSearch.trim().toLowerCase();
    return this.library.books.filter(book => (!q || `${book.title} ${book.author} ${book.isbn} ${(book.accessionNumbers || []).join(' ')}`.toLowerCase().includes(q)) && (!this.categoryFilter || book.category === this.categoryFilter));
  }
  get loans(): LibraryIssue[] {
    const q = this.loanSearch.trim().toLowerCase();
    return this.library.issues.filter(item => (!q || `${item.title} ${item.member} ${item.memberId} ${item.accessionNo || ''}`.toLowerCase().includes(q)) && (!this.loanFilter || this.library.status(item) === this.loanFilter));
  }
  get openRequests(): LibraryRequest[] { return this.library.requests.filter(item => item.status === 'Requested'); }

  get totalCopies(): number { return this.library.books.reduce((sum, book) => sum + book.copies, 0); }
  get onLoan(): number { return this.library.issues.filter(item => !item.returned).length; }
  get overdue(): number { return this.library.issues.filter(item => this.library.status(item) === 'Overdue').length; }
  get finesDue(): number { return this.library.issues.filter(item => !item.returned).reduce((sum, item) => sum + this.library.fineFor(item), 0); }

  tone(status: string): Tone { return ({ Issued: 'info', Overdue: 'danger', Returned: 'neutral', Requested: 'warning', Declined: 'neutral' } as Record<string, Tone>)[status] || 'neutral'; }
  showOverdue(): void { this.tab = 1; this.loanFilter = 'Overdue'; }

  private reload(): void {
    this.loading = true;
    this.api.load(this.auth.token!, this.canEdit).subscribe({
      next: () => this.loading = false,
      error: (error: Error) => { this.loading = false; this.toast.error(error.message); }
    });
  }

  /** Runs a server change and reports its error, keeping the page as it was. */
  private run<T>(call: Observable<T>, done: (result: T) => void, retry?: () => void): void {
    call.subscribe({ next: done, error: (error: Error) => { this.toast.error(error.message); retry?.(); } });
  }

  /** Loan period, late fine and books per member (owner, live only). */
  editSettings(): void {
    if (!this.canEdit || !this.live) return;
    const fields: RecordField[] = [
      { key: 'loanDays', label: 'Loan period (days)', type: 'number', required: true },
      { key: 'finePerDay', label: 'Late fine per day (₹)', type: 'number', required: true },
      { key: 'maxBooks', label: 'Books per member at a time', type: 'number', required: true }
    ];
    this.dialog.open(RecordDialogComponent, { width: '560px', maxWidth: 'calc(100vw - 24px)', data: { title: 'Library settings', submitLabel: 'Save settings', fields, record: { ...this.api.settings }, successMessage: '' } })
      .afterClosed().subscribe((value: Record<string, unknown> | undefined) => {
        if (!value) return;
        const settings = { loanDays: Number(value['loanDays']), finePerDay: Number(value['finePerDay']), maxBooks: Number(value['maxBooks']) };
        if (!Number.isInteger(settings.loanDays) || settings.loanDays < 1 || !Number.isInteger(settings.maxBooks) || settings.maxBooks < 1 || settings.finePerDay < 0) { this.toast.error('Use whole numbers: loan days and books of at least 1, fine of 0 or more.'); return; }
        this.run(this.api.saveSettings(this.auth.token!, settings), () => this.toast.success('Library settings saved. New loans use them; open loans keep their due dates.'));
      });
  }

  editBook(book?: LibraryBook, draft?: Record<string, unknown>): void {
    if (!this.canEdit) return;
    const school = this.live && this.isSchool;
    const fields: RecordField[] = [
      { key: 'title', label: 'Title', required: true }, { key: 'author', label: 'Author', required: true },
      { key: 'isbn', label: 'ISBN', hint: '10 or 13 digits' }, { key: 'category', label: 'Category', required: true, hint: 'e.g. Fiction, Physics, Reference' },
      { key: 'shelf', label: 'Shelf / rack', hint: 'e.g. B-2' }, { key: 'copies', label: 'Number of copies', type: 'number', required: true },
      ...(school ? [{ key: 'accession', label: 'Accession numbers', type: 'tags' as const, hint: 'One per copy. Leave empty to number them automatically.' }] : [])
    ];
    const record = draft || (book ? { ...book, accession: (book.accessionNumbers || []).join(', ') } : { copies: 1 });
    this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: book ? 'Edit book' : 'Add book', submitLabel: book ? 'Save changes' : 'Add book', fields, record, successMessage: '' } })
      .afterClosed().subscribe((value: Record<string, unknown> | undefined) => {
        if (!value) return;
        const copies = Number(value['copies']);
        const isbn = String(value['isbn'] || '').replace(/[\s-]/g, '');
        const accession = String(value['accession'] || '').split(',').map(item => item.trim()).filter(Boolean);
        const onLoan = book ? this.library.issuedCount(book.id) : 0;
        const problem = !Number.isInteger(copies) || copies < 1 ? 'Number of copies must be a whole number of at least 1.'
          : copies < onLoan ? `${onLoan} copies are on loan, so copies cannot be less than ${onLoan}.`
          : isbn && !/^(\d{9}[\dX]|\d{13})$/i.test(isbn) ? 'ISBN must have 10 or 13 digits.'
          : school && accession.length > copies ? `You entered ${accession.length} accession numbers for ${copies} copies.`
          : school && new Set(accession).size !== accession.length ? 'Each accession number can be used once.' : '';
        if (problem) { this.toast.error(problem); this.editBook(book, value); return; }
        const input: BookInput = { title: String(value['title']).trim(), author: String(value['author']).trim(), isbn: isbn || null, category: String(value['category']).trim(), shelf: String(value['shelf'] || '').trim() || null, copies, ...(school ? { accessionNumbers: accession } : {}) };
        if (!this.live) { const saved = this.demo.saveBook({ ...input, isbn, shelf: input.shelf || '', copies }, book); this.toast.success(`Book “${saved.title}” ${book ? 'updated' : 'added'}.`); return; }
        this.run(this.api.saveBook(this.auth.token!, input, book), saved => this.toast.success(`Book “${saved.title}” ${book ? 'updated' : 'added'}${school ? ` · accession ${(saved.accessionNumbers || []).join(', ')}` : ''}.`), () => this.editBook(book, value));
      });
  }

  deleteBook(book: LibraryBook): void {
    if (!this.canEdit) return;
    this.confirm.confirm({ title: 'Delete book?', message: `Delete “${book.title}” from the catalogue? ${this.live ? 'Open requests for it are declined. This' : 'This demo'} action cannot be undone.`, confirmLabel: 'Delete', destructive: true }).subscribe(ok => {
      if (!ok) return;
      if (this.live) { this.run(this.api.removeBook(this.auth.token!, book), () => this.toast.success(`Book “${book.title}” deleted.`)); return; }
      const problem = this.demo.removeBook(book);
      if (problem) this.toast.error(problem); else this.toast.success(`Book “${book.title}” deleted.`);
    });
  }

  /** Issue a book. Pass a book or a student request to pre-fill the form. */
  issueBook(book?: LibraryBook, request?: LibraryRequest, draft?: Record<string, unknown>): void {
    if (!this.canEdit) return;
    const label = (m: Member) => `${m.name} · ${m.id}${m.type === 'Teacher' ? ' (Teacher)' : ''}`;
    const available = this.library.books.filter(item => this.library.available(item) > 0 || item === book);
    if (!available.length) { this.toast.info('All copies are on loan. Mark a book returned first.'); return; }
    const member = request ? this.members.find(m => m.id === request.memberId) || { id: request.memberId, name: request.member, type: 'Student' as const } : undefined;
    const chosenBook = book || (request && this.library.books.find(item => item.id === request.bookId));
    const school = this.live && this.isSchool;
    const fields: RecordField[] = [
      { key: 'book', label: 'Book', type: 'select', options: available.map(item => item.title), required: true },
      { key: 'member', label: 'Issue to', type: 'select', options: [...new Set([...(member ? [label(member)] : []), ...this.members.map(label)])], required: true },
      { key: 'date', label: 'Issue date', type: 'date', required: true },
      ...(school ? [{ key: 'accession', label: 'Accession no.', type: 'select' as const, options: [AUTO_ACCESSION, ...(chosenBook?.freeAccessionNumbers || [])], hint: 'Options follow the book chosen when the form opened' }] : [])
    ];
    const record = draft || { book: chosenBook?.title, member: member ? label(member) : '', date: new Date(), accession: AUTO_ACCESSION };
    this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: 'Issue book', submitLabel: 'Issue book', fields, record, successMessage: '' } })
      .afterClosed().subscribe((value: Record<string, unknown> | undefined) => {
        if (!value) return;
        const chosen = this.library.books.find(item => item.title === value['book']);
        const who = [...(member ? [member] : []), ...this.members].find(m => label(m) === value['member']);
        const issuedOn = value['date'] instanceof Date ? value['date'] : new Date(String(value['date']));
        if (!chosen || !who) { this.toast.error('Choose a book and a member.'); this.issueBook(book, request, value); return; }
        if (Number.isNaN(issuedOn.getTime()) || issuedOn.getTime() > Date.now()) { this.toast.error('Issue date cannot be in the future.'); this.issueBook(book, request, value); return; }
        if (!this.live) {
          const problem = this.demo.issue(chosen, who.id, who.name, who.type, issuedOn);
          if (problem) { this.toast.error(problem); this.issueBook(book, request, value); return; }
          this.toast.success(`“${chosen.title}” issued to ${who.name}. Return within ${LOAN_DAYS} days.`);
          return;
        }
        const accession = String(value['accession'] || '');
        const day = `${issuedOn.getFullYear()}-${String(issuedOn.getMonth() + 1).padStart(2, '0')}-${String(issuedOn.getDate()).padStart(2, '0')}`;
        this.run(this.api.issue(this.auth.token!, {
          bookCode: chosen.code!, memberType: who.type === 'Teacher' ? 'teacher' : 'student', memberCode: who.id, issuedOn: day,
          accessionNo: accession && accession !== AUTO_ACCESSION && chosen === chosenBook ? accession : null, requestCode: request?.code || null
        }), loan => this.toast.success(`“${chosen.title}”${loan.accessionNo ? ` (Acc. ${loan.accessionNo})` : ''} issued to ${who.name}. Due ${loan.due}.`), () => this.issueBook(book, request, value));
      });
  }

  returnBook(item: LibraryIssue, waive = false): void {
    if (!this.canEdit) return;
    const fine = this.library.fineFor(item);
    const message = fine && waive ? `Waive the ₹${fine} late fine and mark “${item.title}” returned by ${item.member}?`
      : fine ? `“${item.title}” is ${this.library.daysLate(item)} days late. Collect a fine of ₹${fine} from ${item.member}.` : `Mark “${item.title}” returned by ${item.member}?`;
    this.confirm.confirm({ title: 'Mark as returned?', message, confirmLabel: fine && !waive ? `Returned · ₹${fine} fine` : 'Mark returned' }).subscribe(ok => {
      if (!ok) return;
      if (this.live) { this.run(this.api.returnBook(this.auth.token!, item, waive), saved => this.toast.success(`“${item.title}” returned${saved.fine ? ` · fine ₹${saved.fine}` : saved.waived ? ' · fine waived' : ''}.`)); return; }
      const charged = this.demo.returnBook(item);
      this.toast.success(`“${item.title}” returned${charged ? ` · fine ₹${charged}` : ''}.`);
    });
  }

  renew(item: LibraryIssue): void {
    if (!this.canEdit) return;
    if (this.live) { this.run(this.api.renew(this.auth.token!, item), saved => this.toast.success(`“${item.title}” renewed until ${saved.due}.`)); return; }
    const problem = this.demo.renew(item);
    if (problem) this.toast.error(problem); else this.toast.success(`“${item.title}” renewed until ${item.due}.`);
  }

  decline(request: LibraryRequest): void {
    if (!this.canEdit) return;
    this.confirm.confirm({ title: 'Decline request?', message: `Decline ${request.member}'s request for “${request.title}”?`, confirmLabel: 'Decline', destructive: true }).subscribe(ok => {
      if (!ok) return;
      if (this.live) { this.run(this.api.decline(this.auth.token!, request), () => this.toast.info(`Request from ${request.member} declined.`)); return; }
      this.demo.decline(request);
      this.toast.info(`Request from ${request.member} declined.`);
    });
  }
}

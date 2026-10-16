import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RecordDialogComponent, RecordField } from '../management/record-dialog.component';
import { ConfirmationDialogService } from '../../core/confirmation-dialog.service';
import { MockAuthService } from '../../core/mock-auth.service';
import { MockDataService } from '../../core/mock-data.service';
import { TenantContextService } from '../../core/tenant-context.service';
import { ToastService } from '../../core/toast.service';
import { FINE_PER_DAY, LOAN_DAYS, LibraryBook, LibraryIssue, LibraryRequest, LibraryService } from '../../core/library.service';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';
interface Member { id: string; name: string; type: 'Student' | 'Teacher'; }

/** Library: book catalogue, issue / return / renew, and book requests from students. Owners manage it; teachers can look things up. */
@Component({ selector: 'app-library-page', templateUrl: './library-page.component.html', styleUrls: ['./library-page.component.scss'] })
export class LibraryPageComponent {
  tab = 0;
  bookSearch = ''; categoryFilter = '';
  loanSearch = ''; loanFilter: '' | 'Issued' | 'Overdue' | 'Returned' = '';
  readonly loanDays = LOAN_DAYS;
  readonly finePerDay = FINE_PER_DAY;
  private readonly teachers: Record<string, Member[]> = {
    school: [{ id: 'T-101', name: 'Meena Joshi', type: 'Teacher' }, { id: 'T-102', name: 'Arjun Menon', type: 'Teacher' }, { id: 'T-104', name: 'Kavita Rao', type: 'Teacher' }],
    coaching: [{ id: 'T-201', name: 'Priya Nair', type: 'Teacher' }, { id: 'T-202', name: 'Ankit Rao', type: 'Teacher' }]
  };

  constructor(public library: LibraryService, private dialog: MatDialog, private confirm: ConfirmationDialogService, private auth: MockAuthService, private students: MockDataService, private tenant: TenantContextService, private toast: ToastService) {}

  get canEdit(): boolean { return this.auth.role === 'Owner'; }
  get workspaceLabel(): string { return this.tenant.isSchool ? 'School' : 'Coaching'; }
  get categories(): string[] { return [...new Set(this.library.books.map(book => book.category))].sort(); }
  get members(): Member[] { return [...this.students.students.map(s => ({ id: s.studentId, name: s.name, type: 'Student' as const })), ...(this.teachers[this.tenant.current.businessType] || [])]; }

  get books(): LibraryBook[] {
    const q = this.bookSearch.trim().toLowerCase();
    return this.library.books.filter(book => (!q || `${book.title} ${book.author} ${book.isbn}`.toLowerCase().includes(q)) && (!this.categoryFilter || book.category === this.categoryFilter));
  }
  get loans(): LibraryIssue[] {
    const q = this.loanSearch.trim().toLowerCase();
    return this.library.issues.filter(item => (!q || `${item.title} ${item.member} ${item.memberId}`.toLowerCase().includes(q)) && (!this.loanFilter || this.library.status(item) === this.loanFilter));
  }
  get openRequests(): LibraryRequest[] { return this.library.requests.filter(item => item.status === 'Requested'); }

  get totalCopies(): number { return this.library.books.reduce((sum, book) => sum + book.copies, 0); }
  get onLoan(): number { return this.library.issues.filter(item => !item.returned).length; }
  get overdue(): number { return this.library.issues.filter(item => this.library.status(item) === 'Overdue').length; }
  get finesDue(): number { return this.library.issues.filter(item => !item.returned).reduce((sum, item) => sum + this.library.fineFor(item), 0); }

  tone(status: string): Tone { return ({ Issued: 'info', Overdue: 'danger', Returned: 'neutral', Requested: 'warning', Declined: 'neutral' } as Record<string, Tone>)[status] || 'neutral'; }
  showOverdue(): void { this.tab = 1; this.loanFilter = 'Overdue'; }

  editBook(book?: LibraryBook, draft?: Record<string, unknown>): void {
    if (!this.canEdit) return;
    const fields: RecordField[] = [
      { key: 'title', label: 'Title', required: true }, { key: 'author', label: 'Author', required: true },
      { key: 'isbn', label: 'ISBN', hint: '10 or 13 digits' }, { key: 'category', label: 'Category', required: true, hint: 'e.g. Fiction, Physics, Reference' },
      { key: 'shelf', label: 'Shelf / rack', hint: 'e.g. B-2' }, { key: 'copies', label: 'Number of copies', type: 'number', required: true }
    ];
    this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: book ? 'Edit book' : 'Add book', submitLabel: book ? 'Save changes' : 'Add book', fields, record: draft || book || { copies: 1 }, successMessage: '' } })
      .afterClosed().subscribe((value: Record<string, unknown> | undefined) => {
        if (!value) return;
        const copies = Number(value['copies']);
        const isbn = String(value['isbn'] || '').replace(/[\s-]/g, '');
        const onLoan = book ? this.library.issuedCount(book.id) : 0;
        const problem = !Number.isInteger(copies) || copies < 1 ? 'Number of copies must be a whole number of at least 1.'
          : copies < onLoan ? `${onLoan} copies are on loan, so copies cannot be less than ${onLoan}.`
          : isbn && !/^(\d{9}[\dX]|\d{13})$/i.test(isbn) ? 'ISBN must have 10 or 13 digits.' : '';
        if (problem) { this.toast.error(problem); this.editBook(book, value); return; }
        const saved = this.library.saveBook({ title: String(value['title']).trim(), author: String(value['author']).trim(), isbn, category: String(value['category']).trim(), shelf: String(value['shelf'] || '').trim(), copies }, book);
        this.toast.success(`Book “${saved.title}” ${book ? 'updated' : 'added'}.`);
      });
  }

  deleteBook(book: LibraryBook): void {
    if (!this.canEdit) return;
    this.confirm.confirm({ title: 'Delete book?', message: `Delete “${book.title}” from the catalogue? This demo action cannot be undone.`, confirmLabel: 'Delete', destructive: true }).subscribe(ok => {
      if (!ok) return;
      const problem = this.library.removeBook(book);
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
    const fields: RecordField[] = [
      { key: 'book', label: 'Book', type: 'select', options: available.map(item => item.title), required: true },
      { key: 'member', label: 'Issue to', type: 'select', options: [...new Set([...(member ? [label(member)] : []), ...this.members.map(label)])], required: true },
      { key: 'date', label: 'Issue date', type: 'date', required: true }
    ];
    const record = draft || { book: (book || (request && this.library.books.find(item => item.id === request.bookId)))?.title, member: member ? label(member) : '', date: new Date() };
    this.dialog.open(RecordDialogComponent, { width: '640px', maxWidth: 'calc(100vw - 24px)', data: { title: 'Issue book', submitLabel: 'Issue book', fields, record, successMessage: '' } })
      .afterClosed().subscribe((value: Record<string, unknown> | undefined) => {
        if (!value) return;
        const chosen = this.library.books.find(item => item.title === value['book']);
        const who = [...(member ? [member] : []), ...this.members].find(m => label(m) === value['member']);
        const issuedOn = value['date'] instanceof Date ? value['date'] : new Date(String(value['date']));
        if (!chosen || !who) { this.toast.error('Choose a book and a member.'); this.issueBook(book, request, value); return; }
        if (Number.isNaN(issuedOn.getTime()) || issuedOn.getTime() > Date.now()) { this.toast.error('Issue date cannot be in the future.'); this.issueBook(book, request, value); return; }
        const problem = this.library.issue(chosen, who.id, who.name, who.type, issuedOn);
        if (problem) { this.toast.error(problem); this.issueBook(book, request, value); return; }
        this.toast.success(`“${chosen.title}” issued to ${who.name}. Return within ${LOAN_DAYS} days.`);
      });
  }

  returnBook(item: LibraryIssue): void {
    if (!this.canEdit) return;
    const fine = this.library.fineFor(item);
    this.confirm.confirm({ title: 'Mark as returned?', message: fine ? `“${item.title}” is ${this.library.daysLate(item)} days late. Collect a fine of ₹${fine} from ${item.member}.` : `Mark “${item.title}” returned by ${item.member}?`, confirmLabel: fine ? `Returned · ₹${fine} fine` : 'Mark returned' }).subscribe(ok => {
      if (!ok) return;
      const charged = this.library.returnBook(item);
      this.toast.success(`“${item.title}” returned${charged ? ` · fine ₹${charged}` : ''}.`);
    });
  }

  renew(item: LibraryIssue): void {
    if (!this.canEdit) return;
    const problem = this.library.renew(item);
    if (problem) this.toast.error(problem); else this.toast.success(`“${item.title}” renewed until ${item.due}.`);
  }

  decline(request: LibraryRequest): void {
    if (!this.canEdit) return;
    this.confirm.confirm({ title: 'Decline request?', message: `Decline ${request.member}'s request for “${request.title}”?`, confirmLabel: 'Decline', destructive: true }).subscribe(ok => {
      if (!ok) return;
      this.library.decline(request);
      this.toast.info(`Request from ${request.member} declined.`);
    });
  }
}

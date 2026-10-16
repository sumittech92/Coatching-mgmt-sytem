import { Injectable } from '@angular/core';
import { TenantContextService } from './tenant-context.service';

export interface LibraryBook { id: number; title: string; author: string; isbn: string; category: string; shelf: string; copies: number; }
export type IssueStatus = 'Issued' | 'Overdue' | 'Returned';
export interface LibraryIssue { id: number; bookId: number; title: string; memberId: string; member: string; memberType: 'Student' | 'Teacher'; issued: string; due: string; returned?: string; fine: number; }
export type RequestStatus = 'Requested' | 'Issued' | 'Declined';
export interface LibraryRequest { id: number; bookId: number; title: string; memberId: string; member: string; requested: string; status: RequestStatus; }
interface LibraryState { books: LibraryBook[]; issues: LibraryIssue[]; requests: LibraryRequest[]; }

/** Days a book may be kept, and the late fine per day. */
export const LOAN_DAYS = 14;
export const FINE_PER_DAY = 2;
const STORAGE_KEY = 'demo-library';
const DAY = 86400000;

export const fmtDate = (date: Date): string => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const daysFromToday = (days: number): string => fmtDate(new Date(Date.now() + days * DAY));

function seed(school: boolean): LibraryState {
  const books: LibraryBook[] = school ? [
    { id: 1, title: 'Wings of Fire', author: 'A. P. J. Abdul Kalam', isbn: '9788173711466', category: 'Biography', shelf: 'B-2', copies: 4 },
    { id: 2, title: 'The Story of My Experiments with Truth', author: 'M. K. Gandhi', isbn: '9788172345662', category: 'Biography', shelf: 'B-2', copies: 3 },
    { id: 3, title: 'Malgudi Days', author: 'R. K. Narayan', isbn: '9780143039655', category: 'Fiction', shelf: 'F-1', copies: 5 },
    { id: 4, title: 'NCERT Mathematics · Class 9', author: 'NCERT', isbn: '9788174504890', category: 'Textbook', shelf: 'T-4', copies: 10 },
    { id: 5, title: 'NCERT Science · Class 9', author: 'NCERT', isbn: '9788174504937', category: 'Textbook', shelf: 'T-4', copies: 10 },
    { id: 6, title: 'Panchatantra Tales', author: 'Vishnu Sharma', isbn: '9788184820935', category: 'Children', shelf: 'C-1', copies: 6 },
    { id: 7, title: 'Oxford Student Atlas for India', author: 'Oxford', isbn: '9780199482917', category: 'Reference', shelf: 'R-1', copies: 2 }
  ] : [
    { id: 1, title: 'Concepts of Physics · Vol 1', author: 'H. C. Verma', isbn: '9788177091878', category: 'Physics', shelf: 'P-1', copies: 6 },
    { id: 2, title: 'Problems in General Physics', author: 'I. E. Irodov', isbn: '9788183552349', category: 'Physics', shelf: 'P-2', copies: 3 },
    { id: 3, title: 'Organic Chemistry', author: 'Morrison & Boyd', isbn: '9788131704813', category: 'Chemistry', shelf: 'C-1', copies: 4 },
    { id: 4, title: 'Objective Mathematics', author: 'R. D. Sharma', isbn: '9789383182039', category: 'Mathematics', shelf: 'M-1', copies: 5 },
    { id: 5, title: 'Objective NCERT Biology', author: 'MTG', isbn: '9789388899390', category: 'Biology', shelf: 'B-1', copies: 4 },
    { id: 6, title: 'JEE Main Previous Years Papers', author: 'Arihant', isbn: '9789326191593', category: 'Practice papers', shelf: 'X-1', copies: 8 }
  ];
  const issue = (id: number, book: LibraryBook, memberId: string, member: string, memberType: 'Student' | 'Teacher', issuedAgo: number, returnedAgo?: number, fine = 0): LibraryIssue =>
    ({ id, bookId: book.id, title: book.title, memberId, member, memberType, issued: daysFromToday(-issuedAgo), due: daysFromToday(LOAN_DAYS - issuedAgo), returned: returnedAgo === undefined ? undefined : daysFromToday(-returnedAgo), fine });
  const issues: LibraryIssue[] = school ? [
    issue(1, books[0], 'GPS-2601', 'Ishita Rao', 'Student', 5),
    issue(2, books[2], 'GPS-2601', 'Ishita Rao', 'Student', 20),
    issue(3, books[3], 'GPS-2602', 'Aditya Menon', 'Student', 9),
    issue(4, books[6], 'T-104', 'Kavita Rao', 'Teacher', 3),
    issue(5, books[5], 'GPS-2605', 'Anika Sharma', 'Student', 30, 12, 8)
  ] : [
    issue(1, books[0], 'NS-2401', 'Aarav Sharma', 'Student', 6),
    issue(2, books[3], 'NS-2401', 'Aarav Sharma', 'Student', 18),
    issue(3, books[1], 'NS-2403', 'Rohan Verma', 'Student', 10),
    issue(4, books[4], 'NS-2402', 'Meera Kapoor', 'Student', 25, 9, 4)
  ];
  const requests: LibraryRequest[] = school
    ? [{ id: 1, bookId: 7, title: books[6].title, memberId: 'GPS-2603', member: 'Sana Ahmed', requested: daysFromToday(-1), status: 'Requested' }]
    : [{ id: 1, bookId: 6, title: books[5].title, memberId: 'NS-2405', member: 'Kabir Singh', requested: daysFromToday(-1), status: 'Requested' }];
  return { books, issues, requests };
}

/** Library catalogue, loans and student requests for the current workspace. Shared by the owner Library page and the student portal. */
@Injectable({ providedIn: 'root' })
export class LibraryService {
  private states: Record<string, LibraryState> = this.load();

  constructor(private tenant: TenantContextService) {}

  private get state(): LibraryState {
    const key = this.tenant.current.businessType;
    if (!this.states[key]) { this.states[key] = seed(key === 'school'); this.save(); }
    return this.states[key];
  }
  get books(): LibraryBook[] { return this.state.books; }
  get issues(): LibraryIssue[] { return this.state.issues; }
  get requests(): LibraryRequest[] { return this.state.requests; }

  /** Copies of a book currently out on loan. */
  issuedCount(bookId: number): number { return this.issues.filter(item => item.bookId === bookId && !item.returned).length; }
  available(book: LibraryBook): number { return Math.max(0, book.copies - this.issuedCount(book.id)); }
  status(item: LibraryIssue): IssueStatus { return item.returned ? 'Returned' : this.daysLate(item) > 0 ? 'Overdue' : 'Issued'; }
  daysLate(item: LibraryIssue, on = new Date()): number {
    const due = new Date(item.due).getTime();
    return Number.isNaN(due) ? 0 : Math.max(0, Math.floor((on.getTime() - due) / DAY));
  }
  /** Fine so far for an open loan, or the fine charged at return. */
  fineFor(item: LibraryIssue): number { return item.returned ? item.fine : this.daysLate(item) * FINE_PER_DAY; }

  saveBook(value: Omit<LibraryBook, 'id'>, existing?: LibraryBook): LibraryBook {
    if (existing) { Object.assign(existing, value); this.issues.filter(item => item.bookId === existing.id).forEach(item => item.title = existing.title); this.save(); return existing; }
    const book: LibraryBook = { ...value, id: Date.now() };
    this.books.unshift(book);
    this.save();
    return book;
  }
  removeBook(book: LibraryBook): string {
    if (this.issuedCount(book.id)) return 'This book has copies on loan. Mark them returned before deleting it.';
    this.books.splice(this.books.indexOf(book), 1);
    this.save();
    return '';
  }

  issue(book: LibraryBook, memberId: string, member: string, memberType: 'Student' | 'Teacher', issuedOn = new Date()): string {
    if (!this.available(book)) return `No copies of “${book.title}” are available right now.`;
    if (this.issues.some(item => item.bookId === book.id && item.memberId === memberId && !item.returned)) return `${member} already has a copy of “${book.title}”.`;
    this.issues.unshift({ id: Date.now(), bookId: book.id, title: book.title, memberId, member, memberType, issued: fmtDate(issuedOn), due: fmtDate(new Date(issuedOn.getTime() + LOAN_DAYS * DAY)), fine: 0 });
    this.requests.filter(item => item.bookId === book.id && item.memberId === memberId && item.status === 'Requested').forEach(item => item.status = 'Issued');
    this.save();
    return '';
  }
  returnBook(item: LibraryIssue): number {
    item.fine = this.daysLate(item) * FINE_PER_DAY;
    item.returned = fmtDate(new Date());
    this.save();
    return item.fine;
  }
  renew(item: LibraryIssue): string {
    if (item.returned) return 'This book has already been returned.';
    if (this.daysLate(item) > 0) return 'Overdue books cannot be renewed. Return the book and pay the fine first.';
    item.due = fmtDate(new Date(new Date(item.due).getTime() + LOAN_DAYS * DAY));
    this.save();
    return '';
  }

  request(book: LibraryBook, memberId: string, member: string): string {
    if (this.issues.some(item => item.bookId === book.id && item.memberId === memberId && !item.returned)) return 'You already have this book.';
    if (this.requests.some(item => item.bookId === book.id && item.memberId === memberId && item.status === 'Requested')) return 'You have already requested this book.';
    this.requests.unshift({ id: Date.now(), bookId: book.id, title: book.title, memberId, member, requested: fmtDate(new Date()), status: 'Requested' });
    this.save();
    return '';
  }
  decline(request: LibraryRequest): void { request.status = 'Declined'; this.save(); }

  private load(): Record<string, LibraryState> {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }
  private save(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.states)); } catch { /* storage unavailable: keep in memory */ }
  }
}

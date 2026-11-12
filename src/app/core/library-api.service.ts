import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';
import { IssueStatus, LibraryBook, LibraryIssue, LibraryRequest, LibraryView, fmtDate } from './library.service';

export interface LibrarySettings { loanDays: number; finePerDay: number; maxBooks: number; }
export interface LibraryMember { type: 'student' | 'teacher'; code: string; name: string; }
interface ApiBook { bookCode: string; title: string; author: string; isbn: string | null; category: string; shelf: string | null; copies: number; accessionNumbers?: string[]; freeAccessionNumbers?: string[]; available: number; }
interface ApiLoan { loanCode: string; bookCode: string | null; title: string; accessionNo: string | null; memberType: 'student' | 'teacher'; memberCode: string; memberName: string; issuedOn: string; dueOn: string; returnedOn: string | null; fine: number; fineWaived: boolean; status: 'issued' | 'overdue' | 'returned'; daysLate: number; currentFine: number; }
interface ApiRequest { requestCode: string; bookCode: string | null; title: string; studentCode: string; studentName: string; status: 'requested' | 'issued' | 'declined'; createdAt: string; }
interface ApiResponse<T> { success: boolean; message: string; data: T; }

export interface BookInput { title: string; author: string; isbn?: string | null; category: string; shelf?: string | null; copies?: number; accessionNumbers?: string[]; }
export interface IssueInput { bookCode: string; memberType: 'student' | 'teacher'; memberCode: string; issuedOn?: string | null; accessionNo?: string | null; requestCode?: string | null; }

const STATUS: Record<ApiLoan['status'], IssueStatus> = { issued: 'Issued', overdue: 'Overdue', returned: 'Returned' };
const REQUEST: Record<ApiRequest['status'], LibraryRequest['status']> = { requested: 'Requested', issued: 'Issued', declined: 'Declined' };
const day = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

/**
 * crm-backend library, kept in memory in the shape the Library page and student portal already use.
 * `load()` for staff (owner / teacher), `loadMine()` for a signed-in student. Ids are the numeric form of the 6-digit codes.
 */
@Injectable({ providedIn: 'root' })
export class LibraryApiService implements LibraryView {
  private readonly base = `${environment.apiUrl}/library`;
  books: LibraryBook[] = [];
  issues: LibraryIssue[] = [];
  requests: LibraryRequest[] = [];
  members: LibraryMember[] = [];
  settings: LibrarySettings = { loanDays: 14, finePerDay: 2, maxBooks: 3 };
  /** The signed-in student's code (student portal). */
  myCode = '';

  constructor(private http: HttpClient) {}

  get loanDays(): number { return this.settings.loanDays; }
  get finePerDay(): number { return this.settings.finePerDay; }
  issuedCount(bookId: number): number { return this.issues.filter(item => item.bookId === bookId && !item.returned).length; }
  available(book: LibraryBook): number { return book.availableCopies ?? Math.max(0, book.copies - this.issuedCount(book.id)); }
  status(item: LibraryIssue): IssueStatus { return item.apiStatus || (item.returned ? 'Returned' : 'Issued'); }
  daysLate(item: LibraryIssue): number { return item.lateDays || 0; }
  fineFor(item: LibraryIssue): number { return item.currentFine ?? item.fine; }

  /** Staff: catalogue, loans, requests and settings (owners also get the member list for issuing). */
  load(token: string, owner: boolean): Observable<void> {
    return forkJoin({
      settings: this.get<LibrarySettings>(token, '/settings'), books: this.get<ApiBook[]>(token, '/books'),
      loans: this.get<ApiLoan[]>(token, '/loans'), requests: this.get<ApiRequest[]>(token, '/requests'),
      members: owner ? this.get<LibraryMember[]>(token, '/members') : this.get<LibraryMember[]>(token, '/settings').pipe(map(() => []))
    }).pipe(map(result => {
      this.settings = result.settings; this.members = result.members;
      this.books = result.books.map(book => this.bookRow(book));
      this.issues = result.loans.map(loan => this.loanRow(loan));
      this.requests = result.requests.map(request => this.requestRow(request));
    }));
  }

  /** Student portal: catalogue plus the student's own loans and requests. */
  loadMine(token: string): Observable<void> {
    return this.get<{ settings: LibrarySettings; studentCode: string; books: ApiBook[]; loans: ApiLoan[]; requests: ApiRequest[] }>(token, '/my').pipe(map(result => {
      this.settings = result.settings; this.myCode = result.studentCode;
      this.books = result.books.map(book => this.bookRow(book));
      this.issues = result.loans.map(loan => this.loanRow(loan));
      this.requests = result.requests.map(request => this.requestRow(request));
    }));
  }

  saveSettings(token: string, settings: Partial<LibrarySettings>): Observable<LibrarySettings> {
    return this.send<LibrarySettings>(this.http.patch<ApiResponse<LibrarySettings>>(`${this.base}/settings`, settings, { headers: this.headers(token) })).pipe(tap(saved => this.settings = saved));
  }
  saveBook(token: string, input: BookInput, existing?: LibraryBook): Observable<LibraryBook> {
    const call = existing ? this.http.patch<ApiResponse<ApiBook>>(`${this.base}/books/${existing.code}`, input, { headers: this.headers(token) }) : this.http.post<ApiResponse<ApiBook>>(`${this.base}/books`, input, { headers: this.headers(token) });
    return this.send(call).pipe(map(book => {
      const row = this.bookRow(book);
      if (existing) { Object.assign(existing, row); this.issues.filter(item => item.bookId === existing.id).forEach(item => item.title = row.title); return existing; }
      this.books = [row, ...this.books];
      return row;
    }));
  }
  removeBook(token: string, book: LibraryBook): Observable<unknown> {
    return this.send(this.http.delete<ApiResponse<unknown>>(`${this.base}/books/${book.code}`, { headers: this.headers(token) })).pipe(tap(() => this.books = this.books.filter(item => item !== book)));
  }
  /** Issues a book; refreshes the catalogue counts and requests afterwards. */
  issue(token: string, input: IssueInput): Observable<LibraryIssue> {
    return this.send(this.http.post<ApiResponse<ApiLoan>>(`${this.base}/loans`, input, { headers: this.headers(token) })).pipe(map(loan => {
      const row = this.loanRow(loan);
      this.issues = [row, ...this.issues];
      const book = this.books.find(item => item.code === loan.bookCode);
      if (book) { book.availableCopies = Math.max(0, this.available(book) - 1); book.freeAccessionNumbers = (book.freeAccessionNumbers || []).filter(value => value !== loan.accessionNo); }
      this.requests.filter(item => item.status === 'Requested' && (item.code === input.requestCode || (item.bookId === row.bookId && item.memberId === input.memberCode))).forEach(item => item.status = 'Issued');
      return row;
    }));
  }
  returnBook(token: string, item: LibraryIssue, waiveFine: boolean): Observable<LibraryIssue> {
    return this.send(this.http.post<ApiResponse<ApiLoan>>(`${this.base}/loans/${item.code}/return`, { waiveFine }, { headers: this.headers(token) })).pipe(map(loan => {
      Object.assign(item, this.loanRow(loan));
      const book = this.books.find(entry => entry.id === item.bookId);
      if (book) { book.availableCopies = this.available(book) + 1; if (loan.accessionNo) book.freeAccessionNumbers = [...(book.freeAccessionNumbers || []), loan.accessionNo]; }
      return item;
    }));
  }
  renew(token: string, item: LibraryIssue): Observable<LibraryIssue> {
    return this.send(this.http.post<ApiResponse<ApiLoan>>(`${this.base}/loans/${item.code}/renew`, {}, { headers: this.headers(token) })).pipe(map(loan => Object.assign(item, this.loanRow(loan))));
  }
  decline(token: string, request: LibraryRequest): Observable<unknown> {
    return this.send(this.http.post<ApiResponse<unknown>>(`${this.base}/requests/${request.code}/decline`, {}, { headers: this.headers(token) })).pipe(tap(() => request.status = 'Declined'));
  }
  /** Student portal: request a book. */
  request(token: string, book: LibraryBook): Observable<LibraryRequest> {
    return this.send(this.http.post<ApiResponse<ApiRequest>>(`${this.base}/my/requests`, { bookCode: book.code }, { headers: this.headers(token) })).pipe(map(request => {
      const row = this.requestRow(request);
      this.requests = [row, ...this.requests];
      return row;
    }));
  }

  private bookRow(book: ApiBook): LibraryBook {
    return { id: Number(book.bookCode), code: book.bookCode, title: book.title, author: book.author, isbn: book.isbn || '', category: book.category, shelf: book.shelf || '', copies: book.copies, accessionNumbers: book.accessionNumbers, freeAccessionNumbers: book.freeAccessionNumbers, availableCopies: book.available };
  }
  private loanRow(loan: ApiLoan): LibraryIssue {
    return {
      id: Number(loan.loanCode), code: loan.loanCode, bookId: Number(loan.bookCode), title: loan.title, accessionNo: loan.accessionNo,
      memberId: loan.memberCode, member: loan.memberName, memberType: loan.memberType === 'teacher' ? 'Teacher' : 'Student',
      issued: day(loan.issuedOn), due: day(loan.dueOn), returned: loan.returnedOn ? day(loan.returnedOn) : undefined,
      fine: loan.fine, waived: loan.fineWaived, apiStatus: STATUS[loan.status], lateDays: loan.daysLate, currentFine: loan.currentFine
    };
  }
  private requestRow(request: ApiRequest): LibraryRequest {
    return { id: Number(request.requestCode), code: request.requestCode, bookId: Number(request.bookCode), title: request.title, memberId: request.studentCode, member: request.studentName, requested: fmtDate(new Date(request.createdAt)), status: REQUEST[request.status] };
  }
  private get<T>(token: string, path: string): Observable<T> { return this.send(this.http.get<ApiResponse<T>>(`${this.base}${path}`, { headers: this.headers(token) })); }
  private headers(token: string): HttpHeaders { return new HttpHeaders({ accesstoken: token }); }
  private send<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(map(response => response.data), catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error)))));
  }
}

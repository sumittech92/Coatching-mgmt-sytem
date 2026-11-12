import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';

export type ApiTestStatus = 'scheduled' | 'completed' | 'published' | 'cancelled';
export const TEST_STATUS_LABELS: Record<ApiTestStatus, string> = { scheduled: 'Scheduled', completed: 'Completed', published: 'Results published', cancelled: 'Cancelled' };

export interface ApiTestPaper { paperId: string; subject: string; date: string; maxMarks: number; passMarks: number | null; entered: number; canEnterMarks: boolean; }

/**
 * A coaching test (one batch, one subject) or a school exam (a class, optional sections and a date sheet of papers).
 * `testCode` is the 6-digit ID used in URLs. Status follows the dates; `canManage` says whether this user may edit / publish it.
 */
export interface ApiTest {
  _id: string;
  testCode: string;
  workType: 'school' | 'coaching';
  name: string;
  term: string | null;
  course: { courseCode: string; name: string } | null;
  batches: { batchCode: string; name: string }[];
  papers: ApiTestPaper[];
  students: number;
  status: ApiTestStatus;
  cancelled: boolean;
  resultsPublished: boolean;
  publishedAt: string | null;
  canManage: boolean;
}

export interface TestPayload {
  name: string;
  term?: string | null;
  courseCode?: string | null;
  batchCodes: string[];
  papers: { paperId?: string; subject: string; date: string; maxMarks: number; passMarks?: number | null }[];
  cancelled?: boolean;
}

export interface ApiMarkRow { studentCode: string; fullName: string | null; rollNo: string | null; course: string; batch: string; marks: number | null; absent: boolean; remarks: string | null; }
export interface ApiMarkSheet {
  testCode: string;
  name: string;
  paper: { paperId: string; subject: string; date: string; maxMarks: number; passMarks: number | null };
  /** False once results are published, before the paper's date, or for a subject this user doesn't teach. */
  editable: boolean;
  resultsPublished: boolean;
  students: ApiMarkRow[];
}
export interface MarkEntry { studentCode: string; marks: number | null; absent: boolean; remarks?: string | null; }

/** One student's marks in one paper, for the Results page. */
export interface ApiResult {
  id: string; testCode: string; exam: string; term: string | null; course: string; batch: string;
  studentCode: string; student: string | null; subject: string; examDate: string;
  marks: number | null; total: number; absent: boolean; percentage: number; grade: string; passed: boolean; published: boolean;
}

interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Thin client for crm-backend /test routes (tests / exams, marks and results). */
@Injectable({ providedIn: 'root' })
export class TestApiService {
  private readonly base = `${environment.apiUrl}/test`;

  constructor(private http: HttpClient) {}

  list(accessToken: string): Observable<ApiTest[]> {
    return this.request(this.http.get<ApiResponse<ApiTest[]>>(this.base, { headers: this.headers(accessToken) }));
  }

  create(accessToken: string, payload: TestPayload): Observable<ApiTest> {
    return this.request(this.http.post<ApiResponse<ApiTest>>(`${this.base}/create`, payload, { headers: this.headers(accessToken) }));
  }

  update(accessToken: string, testCode: string, payload: Partial<TestPayload>): Observable<ApiTest> {
    return this.request(this.http.patch<ApiResponse<ApiTest>>(`${this.base}/${testCode}`, payload, { headers: this.headers(accessToken) }));
  }

  remove(accessToken: string, testCode: string): Observable<unknown> {
    return this.request(this.http.delete<ApiResponse<unknown>>(`${this.base}/${testCode}`, { headers: this.headers(accessToken) }));
  }

  marks(accessToken: string, testCode: string, paperId: string): Observable<ApiMarkSheet> {
    return this.request(this.http.get<ApiResponse<ApiMarkSheet>>(`${this.base}/${testCode}/marks`, { headers: this.headers(accessToken), params: { paperId } }));
  }

  saveMarks(accessToken: string, testCode: string, paperId: string, entries: MarkEntry[]): Observable<ApiMarkSheet> {
    return this.request(this.http.put<ApiResponse<ApiMarkSheet>>(`${this.base}/${testCode}/marks`, { paperId, entries }, { headers: this.headers(accessToken) }));
  }

  publish(accessToken: string, testCode: string, publish: boolean): Observable<ApiTest> {
    return this.request(this.http.post<ApiResponse<ApiTest>>(`${this.base}/${testCode}/${publish ? 'publish' : 'unpublish'}`, {}, { headers: this.headers(accessToken) }));
  }

  results(accessToken: string, status?: 'published' | 'draft'): Observable<ApiResult[]> {
    return this.request(this.http.get<ApiResponse<ApiResult[]>>(`${this.base}/results`, { headers: this.headers(accessToken), params: status ? { status } : {} }));
  }

  private headers(accessToken: string): HttpHeaders { return new HttpHeaders({ accesstoken: accessToken }); }

  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';

export type ApiTestStatus = 'scheduled' | 'completed' | 'published' | 'cancelled';
export const TEST_STATUS_LABELS: Record<ApiTestStatus, string> = { scheduled: 'Scheduled', completed: 'Completed', published: 'Results published', cancelled: 'Cancelled' };

/** `students` sit this paper (an optional subject's paper only those who chose it). */
export interface ApiTestPaper { paperId: string; subject: string; date: string; maxMarks: number; passMarks: number | null; entered: number; canEnterMarks: boolean; optional: boolean; students: number; }

/** School admit card settings (owner / principal). `allowed` = students let through despite pending fees. */
export interface ApiAdmitSettings { released: boolean; feeRequired: boolean; instructions: string | null; }

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
  /** School: one exam time for every paper (24-hour "HH:mm"). */
  startTime: string | null;
  endTime: string | null;
  admitCard: (ApiAdmitSettings & { allowed: number }) | null;
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
  startTime?: string | null;
  endTime?: string | null;
  /** Sent by the owner only; the backend refuses changes from teachers. */
  admitCard?: Partial<ApiAdmitSettings>;
  cancelled?: boolean;
}

export type AdmitStatus = 'eligible' | 'allowed' | 'fee_pending' | 'not_released' | 'cancelled';
export const ADMIT_STATUS_LABELS: Record<AdmitStatus, string> = { eligible: 'Can download', allowed: 'Allowed by principal', fee_pending: 'Fee pending', not_released: 'Not released', cancelled: 'Cancelled' };

/** One student on the Admit cards screen (owner: every student; class teacher: their sections). */
export interface ApiAdmitStudent {
  studentCode: string; fullName: string | null; rollNumber: string | null; className: string; section: string;
  optionalSubjects: string[]; papers: number; feeDue: number; feePeriods: string[]; allowed: boolean; status: AdmitStatus;
  downloads: number; lastDownload: { name: string | null; role: string; at: string } | null;
}
export interface ApiAdmitList {
  testCode: string; name: string; term: string | null; className: string | null; firstPaper: string; startTime: string | null; endTime: string | null; cancelled: boolean;
  settings: ApiAdmitSettings; canAllow: boolean; optionalSubjects: string[]; students: ApiAdmitStudent[];
}
/** What an admit card prints (shared by staff and the student portal). */
export interface AdmitCard {
  admitNo: string;
  exam: { testCode: string; name: string; term: string | null; className: string; startTime: string | null; endTime: string | null; instructions: string | null };
  student: { studentCode: string; fullName: string | null; className: string; section: string; rollNumber: string | null; fatherName: string | null; motherName: string | null; dateOfBirth: string | null; gender: string | null; profileImage: string | null };
  papers: { subject: string; date: string; maxMarks: number }[];
  issuedAt: string;
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

  admitCards(accessToken: string, testCode: string): Observable<ApiAdmitList> {
    return this.request(this.http.get<ApiResponse<ApiAdmitList>>(`${this.base}/${testCode}/admit-cards`, { headers: this.headers(accessToken) }));
  }

  /** Owner only: let a fee-pending student download their own admit card. */
  allowAdmitCard(accessToken: string, testCode: string, studentCode: string, allowed: boolean): Observable<ApiAdmitList> {
    return this.request(this.http.post<ApiResponse<ApiAdmitList>>(`${this.base}/${testCode}/admit-cards/allow`, { studentCode, allowed }, { headers: this.headers(accessToken) }));
  }

  /** Class teacher / owner: admit cards for these students (each download is logged). */
  downloadAdmitCards(accessToken: string, testCode: string, studentCodes: string[]): Observable<AdmitCard[]> {
    return this.request(this.http.post<ApiResponse<AdmitCard[]>>(`${this.base}/${testCode}/admit-cards/download`, { studentCodes }, { headers: this.headers(accessToken) }));
  }

  setOptionalSubjects(accessToken: string, testCode: string, studentCode: string, subjects: string[]): Observable<ApiAdmitList> {
    return this.request(this.http.put<ApiResponse<ApiAdmitList>>(`${this.base}/${testCode}/admit-cards/${studentCode}/subjects`, { subjects }, { headers: this.headers(accessToken) }));
  }

  private headers(accessToken: string): HttpHeaders { return new HttpHeaders({ accesstoken: accessToken }); }

  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }
}

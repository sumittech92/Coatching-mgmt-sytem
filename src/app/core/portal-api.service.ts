import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';
import { ApiBatchDay } from './batch-api.service';
import { ApiPeriod } from './timetable-api.service';
import { AdmitCard, AdmitStatus } from './test-api.service';

interface ApiResponse<T> { success: boolean; message: string; data: T; }
export interface PortalFile { url: string; name: string; }

export interface PortalChild { studentCode: string; fullName: string | null; placement: string; }
export interface PortalStudent {
  studentCode: string; fullName: string | null; workType: 'school' | 'coaching'; gender: string | null; dateOfBirth: string | null;
  profileImage: string | null; status: 'active' | 'inactive'; email: string | null; countryCode: string | null; phoneNumber: string | null;
  parentsInfo: { fatherName: string | null; motherName: string | null; countryCode: string | null; phoneNumber: string | null } | null;
  address: { addressLine: string | null; city: string | null; state: string | null; pincode: string | null } | null;
  admissionDate: string | null; rollNumber: string | null; course: string; batch: string; placement: string;
}
export interface PortalMe { children: PortalChild[]; student: PortalStudent; }

export interface PortalGroup {
  batchCode: string; name: string; course: string | null; days: ApiBatchDay[]; startTime: string | null; endTime: string | null;
  startDate: string | null; room: string | null; students: number; teachers: { name: string | null; subjects: string[] }[];
}
export interface PortalClass { session: string | null; rollNumber: string | null; groups: PortalGroup[]; }
export interface PortalSubject { name: string; code: string | null; periodsPerWeek: number | null; teacher: string | null; }

export interface PortalAttendance {
  month: string; present: number; absent: number; late: number; leave: number; percent: number;
  records: { date: string; status: 'present' | 'absent' | 'late' | 'leave'; note: string | null }[];
}

export interface PortalFee {
  id: string; period: string; totalFee: number; discount: number; paid: number; due: number; status: 'Paid' | 'Partial' | 'Pending' | 'Overdue'; dueDate: string | null;
  lastPayment: { receiptNo: string; amount: number; mode: string; date: string; reference: string | null; receivedBy?: string | null } | null;
  payments: { receiptNo: string; amount: number; discount: number; mode: string; date: string; reference: string | null }[];
}
export type PortalSubmissionStatus = 'pending' | 'approved' | 'rejected';
export interface PortalFeeSubmission {
  id: string; studentId: string | null; student: string; course?: string; batch?: string; period: string; amount: number; mode: string; reference: string | null;
  proof: PortalFile | null; note: string | null; submittedBy: string | null; submittedOn: string; status: PortalSubmissionStatus; reviewNote: string | null; receiptNo: string | null;
}
export interface PaymentDetails { upiId: string | null; accountName: string | null; accountNumber: string | null; ifsc: string | null; bankName: string | null; note: string | null; }
export interface PortalFees { fees: PortalFee[]; submissions: PortalFeeSubmission[]; paymentDetails: PaymentDetails; }
export interface FeeSubmissionPayload { period: string; amount: number; mode: string; reference: string | null; proof: PortalFile | null; note: string | null; }

export interface PortalAdmitInfo { released: boolean; status: AdmitStatus; feeDue: number; canDownload: boolean; message: string | null; }
export interface PortalTest {
  testCode: string; name: string; term: string | null; status: string; resultsPublished: boolean; startTime: string | null; endTime: string | null;
  papers: { subject: string; date: string; maxMarks: number; optional: boolean; upcoming: boolean }[];
  /** School only. */
  admitCard: PortalAdmitInfo | null;
}
/** School: the class's optional subjects and the student's choice (locked while an exam is going on). */
export interface PortalOptionalSubjects { options: string[]; chosen: string[]; locked: boolean; message: string | null; }
export interface PortalResult {
  testCode: string; exam: string; term: string | null; subject: string; date: string; marks: number | null; maxMarks: number; absent: boolean;
  percentage: number; grade: string; remarks: string | null; rank: number | null; outOf: number;
}
export interface PortalMaterial { materialCode: string; title: string; description: string | null; subject: string | null; type: string; file: PortalFile | null; link: string | null; date: string; }
export interface PortalNotice { noticeCode: string; title: string; description: string; type: string; date: string; pinned: boolean; }
export interface PortalUpdate { kind: 'post' | 'event'; title: string; body: string; date: string; startTime?: string | null; imageUrl: string | null; link: string | null; }
/** Syllabus covered in one subject of the student's section / batch. */
export interface PortalSyllabus {
  subject: string; course: string | null; percent: number; expected: number | null; status: 'On track' | 'Behind' | 'No targets' | 'Not set'; done: number; total: number;
  chapters: { title: string; targetMonth: string | null; completedOn: string | null }[];
}
export interface PortalTask {
  taskCode: string; kind: 'homework' | 'assignment'; title: string; subject: string; description: string | null; givenOn: string; dueDate: string;
  attachment: PortalFile | null; status: 'assigned' | 'closed'; overdue: boolean;
  submission: { file: PortalFile; submittedAt: string; status: 'submitted' | 'checked'; remark: string | null } | null;
}

/** Client for crm-backend /portal: the signed-in student's own data, or (parents) the chosen child's. */
@Injectable({ providedIn: 'root' })
export class PortalApiService {
  private readonly base = `${environment.apiUrl}/portal`;
  constructor(private http: HttpClient) {}

  me(token: string, child?: string): Observable<PortalMe> { return this.get(token, '/me', child); }
  classInfo(token: string, child?: string): Observable<PortalClass> { return this.get(token, '/class', child); }
  subjects(token: string, child?: string): Observable<PortalSubject[]> { return this.get(token, '/subjects', child); }
  timetable(token: string, child?: string): Observable<ApiPeriod[]> { return this.get(token, '/timetable', child); }
  attendance(token: string, month: string, child?: string): Observable<PortalAttendance> { return this.get(token, '/attendance', child, { month }); }
  fees(token: string, child?: string): Observable<PortalFees> { return this.get(token, '/fees', child); }
  tests(token: string, child?: string): Observable<PortalTest[]> { return this.get(token, '/tests', child); }
  results(token: string, child?: string): Observable<PortalResult[]> { return this.get(token, '/results', child); }
  materials(token: string, child?: string): Observable<PortalMaterial[]> { return this.get(token, '/materials', child); }
  notices(token: string, child?: string): Observable<PortalNotice[]> { return this.get(token, '/notices', child); }
  updates(token: string, child?: string): Observable<PortalUpdate[]> { return this.get(token, '/updates', child); }
  tasks(token: string, child?: string): Observable<PortalTask[]> { return this.get(token, '/tasks', child); }
  syllabus(token: string, child?: string): Observable<PortalSyllabus[]> { return this.get(token, '/syllabus', child); }

  optionalSubjects(token: string, child?: string): Observable<PortalOptionalSubjects> { return this.get(token, '/optional-subjects', child); }
  /** Student login only. */
  saveOptionalSubjects(token: string, subjects: string[]): Observable<PortalOptionalSubjects> {
    return this.request(this.http.put<ApiResponse<PortalOptionalSubjects>>(`${this.base}/optional-subjects`, { subjects }, { headers: this.headers(token) }));
  }
  /** Student login only: the student's own admit card (logged). */
  admitCard(token: string, testCode: string): Observable<AdmitCard> {
    return this.request(this.http.post<ApiResponse<AdmitCard>>(`${this.base}/tests/${testCode}/admit-card`, {}, { headers: this.headers(token) }));
  }

  submitFee(token: string, payload: FeeSubmissionPayload, child?: string): Observable<PortalFeeSubmission> {
    return this.request(this.http.post<ApiResponse<PortalFeeSubmission>>(`${this.base}/fees/submissions`, payload, { headers: this.headers(token), params: child ? { student: child } : {} }));
  }
  submitTask(token: string, taskCode: string, file: PortalFile): Observable<PortalTask> {
    return this.request(this.http.post<ApiResponse<PortalTask>>(`${this.base}/tasks/${taskCode}/submission`, { file }, { headers: this.headers(token) }));
  }
  /** Assignment work or payment proof: PDF, DOC, DOCX, JPG or PNG up to 10 MB. */
  upload(token: string, file: File): Observable<PortalFile> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.request(this.http.post<ApiResponse<PortalFile>>(`${environment.apiUrl}/upload/portal`, form, { headers: this.headers(token) }));
  }

  private get<T>(token: string, path: string, child?: string, extra: Record<string, string> = {}): Observable<T> {
    return this.request(this.http.get<ApiResponse<T>>(`${this.base}${path}`, { headers: this.headers(token), params: { ...extra, ...(child ? { student: child } : {}) } }));
  }
  private headers(token: string): HttpHeaders { return new HttpHeaders({ accesstoken: token }); }
  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(map(response => response.data), catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error)))));
  }
}

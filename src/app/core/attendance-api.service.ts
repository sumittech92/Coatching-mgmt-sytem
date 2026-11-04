import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';

export type ApiAttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface ApiRegisterStudent { _id: string; studentId: string; fullName: string | null; course: string; batch: string; group: string; status: ApiAttendanceStatus | null; note: string | null; percent: number; }
export interface ApiRegister { date: string; students: ApiRegisterStudent[]; }
export interface ApiMonthlyStudent { studentId: string; fullName: string | null; course: string; batch: string; group: string; days: Record<string, ApiAttendanceStatus>; present: number; absent: number; late: number; leave: number; percent: number; }
export interface ApiMonthly { month: string; days: number; students: ApiMonthlyStudent[]; }
export interface ApiAttendanceTrendPoint { date: string; present: number; absent: number; late: number; leave: number; marked: number; rate: number; }
export interface ApiAttendanceSummary { month: string; rate: number; previousRate: number | null; trend: ApiAttendanceTrendPoint[]; groups: { name: string; rate: number }[]; }
export interface ApiStudentAttendance { month: string; student: { studentId: string; fullName: string | null; course: string; batch: string }; present: number; absent: number; late: number; leave: number; percent: number; records: { date: string; status: ApiAttendanceStatus; note: string | null }[]; }
export interface MarkAttendancePayload { date: string; records: { studentId: string; status: ApiAttendanceStatus; note?: string | null }[]; }

interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Thin client for crm-backend /attendance routes (Owner, Teacher or Super Admin token). The backend scopes results to the owner's institute. */
@Injectable({ providedIn: 'root' })
export class AttendanceApiService {
  private readonly base = `${environment.apiUrl}/attendance`;

  constructor(private http: HttpClient) {}

  /** Daily register; `date` is YYYY-MM-DD. */
  register(accessToken: string, date: string): Observable<ApiRegister> {
    return this.request(this.http.get<ApiResponse<ApiRegister>>(this.base, { headers: this.headers(accessToken), params: new HttpParams().set('date', date) }));
  }

  mark(accessToken: string, payload: MarkAttendancePayload): Observable<{ date: string; saved: number }> {
    return this.request(this.http.post<ApiResponse<{ date: string; saved: number }>>(`${this.base}/mark`, payload, { headers: this.headers(accessToken) }));
  }

  /** `month` is YYYY-MM. */
  monthly(accessToken: string, month: string): Observable<ApiMonthly> {
    return this.request(this.http.get<ApiResponse<ApiMonthly>>(`${this.base}/monthly`, { headers: this.headers(accessToken), params: new HttpParams().set('month', month) }));
  }

  summary(accessToken: string, month: string): Observable<ApiAttendanceSummary> {
    return this.request(this.http.get<ApiResponse<ApiAttendanceSummary>>(`${this.base}/summary`, { headers: this.headers(accessToken), params: new HttpParams().set('month', month) }));
  }

  student(accessToken: string, studentCode: string, month: string): Observable<ApiStudentAttendance> {
    return this.request(this.http.get<ApiResponse<ApiStudentAttendance>>(`${this.base}/student/${studentCode}`, { headers: this.headers(accessToken), params: new HttpParams().set('month', month) }));
  }

  private headers(accessToken: string): HttpHeaders { return new HttpHeaders({ accesstoken: accessToken }); }

  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }
}

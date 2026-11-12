import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';

export type ApiBatchDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type ApiBatchStatus = 'active' | 'inactive';
export const BATCH_DAYS: ApiBatchDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** School sections the owner can create. */
export const SCHOOL_SECTION_OPTIONS = 'ABCDEFGH'.split('').map(letter => `Section ${letter}`);

/**
 * A coaching batch or school section as crm-backend returns it. `batchCode` is the 6-digit ID used in URLs.
 * Schools leave days, times and dates empty; `teachers` then holds the one class teacher.
 */
export interface ApiBatch {
  _id: string;
  batchCode: string;
  workType: 'school' | 'coaching';
  name: string;
  course: { courseCode: string; name: string } | null;
  teachers: { teacherCode: string; fullName: string | null }[];
  days: ApiBatchDay[];
  startTime: string | null;
  endTime: string | null;
  startDate: string | null;
  endDate: string | null;
  room: string | null;
  capacity: number | null;
  status: ApiBatchStatus;
  /** Students whose batch / section matches. */
  students: number;
}

export interface BatchPayload {
  courseCode: string;
  name: string;
  teacherCodes: string[];
  days?: ApiBatchDay[];
  startTime?: string | null;
  endTime?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  room?: string | null;
  capacity?: number | null;
  status: ApiBatchStatus;
}

interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Thin client for crm-backend /batch routes. The backend scopes batches to the signed-in owner (or the teacher's institute). */
@Injectable({ providedIn: 'root' })
export class BatchApiService {
  private readonly base = `${environment.apiUrl}/batch`;
  /** Active batches for dropdowns in other modules, shared until a batch changes. */
  private active$?: Observable<ApiBatch[]>;
  private activeToken?: string;

  constructor(private http: HttpClient) {}

  list(accessToken: string, filters: { courseCode?: string; status?: ApiBatchStatus } = {}): Observable<ApiBatch[]> {
    const params: Record<string, string> = {};
    if (filters.courseCode) params['courseCode'] = filters.courseCode;
    if (filters.status) params['status'] = filters.status;
    return this.request(this.http.get<ApiResponse<ApiBatch[]>>(this.base, { headers: this.headers(accessToken), params }));
  }

  create(accessToken: string, payload: BatchPayload): Observable<ApiBatch> {
    return this.request(this.http.post<ApiResponse<ApiBatch>>(`${this.base}/create`, payload, { headers: this.headers(accessToken) })).pipe(tap(() => this.active$ = undefined));
  }

  update(accessToken: string, batchCode: string, payload: Partial<BatchPayload>): Observable<ApiBatch> {
    return this.request(this.http.patch<ApiResponse<ApiBatch>>(`${this.base}/${batchCode}`, payload, { headers: this.headers(accessToken) })).pipe(tap(() => this.active$ = undefined));
  }

  remove(accessToken: string, batchCode: string): Observable<unknown> {
    return this.request(this.http.delete<ApiResponse<unknown>>(`${this.base}/${batchCode}`, { headers: this.headers(accessToken) })).pipe(tap(() => this.active$ = undefined));
  }

  /** Active batches / sections for dropdowns. Emits an empty list on error, so callers keep their built-in options. */
  active(accessToken: string | null | undefined): Observable<ApiBatch[]> {
    if (!accessToken) return of([]);
    if (this.activeToken !== accessToken) { this.active$ = undefined; this.activeToken = accessToken; }
    this.active$ ??= this.http.get<ApiResponse<ApiBatch[]>>(this.base, { headers: this.headers(accessToken), params: { status: 'active' } }).pipe(
      map(response => response.data),
      catchError(() => { this.active$ = undefined; return of([] as ApiBatch[]); }),
      shareReplay(1)
    );
    return this.active$;
  }

  /** "Class 9 · Section A" for school sections, the batch name for coaching. */
  static label(batch: ApiBatch): string {
    return batch.workType === 'school' && batch.course ? `${batch.course.name} · ${batch.name}` : batch.name;
  }

  /** "07:00" -> "7:00 am" */
  static clock(time: string | null): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'am' : 'pm'}`;
  }

  /** "Mon, Wed, Fri" or "Mon – Fri" for a run of three or more days. */
  static daysLabel(days: ApiBatchDay[]): string {
    const order = days.map(day => BATCH_DAYS.indexOf(day)).sort((a, b) => a - b);
    const consecutive = order.length >= 3 && order.every((value, index) => index === 0 || value === order[index - 1] + 1);
    return consecutive ? `${BATCH_DAYS[order[0]]} – ${BATCH_DAYS[order[order.length - 1]]}` : order.map(index => BATCH_DAYS[index]).join(', ');
  }

  private headers(accessToken: string): HttpHeaders { return new HttpHeaders({ accesstoken: accessToken }); }

  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }
}

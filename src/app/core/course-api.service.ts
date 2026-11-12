import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';

export type ApiFeeFrequency = 'monthly' | 'quarterly' | 'perTerm' | 'annual' | 'oneTime';
export type ApiCourseStatus = 'active' | 'inactive';

/** Fee frequencies each institute type can pick, with their labels. */
export const FEE_FREQUENCY_LABELS: Record<ApiFeeFrequency, string> = { monthly: 'Monthly', quarterly: 'Quarterly', perTerm: 'Per term', annual: 'Annual', oneTime: 'One-time (full course)' };
export const COACHING_FEE_FREQUENCIES: ApiFeeFrequency[] = ['monthly', 'quarterly', 'oneTime'];
export const SCHOOL_FEE_FREQUENCIES: ApiFeeFrequency[] = ['perTerm', 'monthly', 'annual'];
/** Short suffix shown after the amount, e.g. "₹4,500 / month". */
export const FEE_FREQUENCY_SUFFIX: Record<ApiFeeFrequency, string> = { monthly: ' / month', quarterly: ' / quarter', perTerm: ' / term', annual: ' / year', oneTime: ' (full course)' };

/** A coaching course or school class as crm-backend returns it. `courseCode` is the 6-digit ID used in URLs. */
export interface ApiCourse {
  _id: string;
  courseCode: string;
  workType: 'school' | 'coaching';
  name: string;
  description: string | null;
  duration: string | null;
  feeAmount: number;
  feeFrequency: ApiFeeFrequency;
  subjects: string[];
  status: ApiCourseStatus;
  /** Students whose course / class matches this name. */
  enrolled: number;
  createdAt?: string;
}

export interface CoursePayload {
  name: string;
  description?: string | null;
  duration?: string | null;
  feeAmount: number;
  feeFrequency: ApiFeeFrequency;
  subjects: string[];
  status: ApiCourseStatus;
}

interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Thin client for crm-backend /course routes. The backend scopes courses to the signed-in owner (or the teacher's institute). */
@Injectable({ providedIn: 'root' })
export class CourseApiService {
  private readonly base = `${environment.apiUrl}/course`;
  /** Active course names for dropdowns in other modules, shared until a course changes. */
  private names$?: Observable<string[]>;
  private namesToken?: string;

  constructor(private http: HttpClient) {}

  list(accessToken: string): Observable<ApiCourse[]> {
    return this.request(this.http.get<ApiResponse<ApiCourse[]>>(this.base, { headers: this.headers(accessToken) }));
  }

  get(accessToken: string, courseCode: string): Observable<ApiCourse> {
    return this.request(this.http.get<ApiResponse<ApiCourse>>(`${this.base}/${courseCode}`, { headers: this.headers(accessToken) }));
  }

  create(accessToken: string, payload: CoursePayload): Observable<ApiCourse> {
    return this.request(this.http.post<ApiResponse<ApiCourse>>(`${this.base}/create`, payload, { headers: this.headers(accessToken) })).pipe(tap(() => this.names$ = undefined));
  }

  update(accessToken: string, courseCode: string, payload: Partial<CoursePayload>): Observable<ApiCourse> {
    return this.request(this.http.patch<ApiResponse<ApiCourse>>(`${this.base}/${courseCode}`, payload, { headers: this.headers(accessToken) })).pipe(tap(() => this.names$ = undefined));
  }

  remove(accessToken: string, courseCode: string): Observable<unknown> {
    return this.request(this.http.delete<ApiResponse<unknown>>(`${this.base}/${courseCode}`, { headers: this.headers(accessToken) })).pipe(tap(() => this.names$ = undefined));
  }

  /**
   * Names of the owner's active courses / classes for dropdowns (Admissions, Students, Batches, Results, Materials).
   * Emits an empty list on error or when none are added yet, so callers keep their built-in options.
   */
  activeNames(accessToken: string | null | undefined): Observable<string[]> {
    if (!accessToken) return of([]);
    // A different sign-in (another owner) must not reuse the previous owner's list.
    if (this.namesToken !== accessToken) { this.names$ = undefined; this.namesToken = accessToken; }
    this.names$ ??= this.http.get<ApiResponse<ApiCourse[]>>(this.base, { headers: this.headers(accessToken), params: { status: 'active' } }).pipe(
      map(response => response.data.map(course => course.name)),
      catchError(() => { this.names$ = undefined; return of([] as string[]); }),
      shareReplay(1)
    );
    return this.names$;
  }

  /** "₹4,500 / month" */
  static feeLabel(amount: number, frequency: ApiFeeFrequency): string {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}${FEE_FREQUENCY_SUFFIX[frequency] || ''}`;
  }

  private headers(accessToken: string): HttpHeaders { return new HttpHeaders({ accesstoken: accessToken }); }

  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }
}

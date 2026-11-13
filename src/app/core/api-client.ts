import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';

export interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Shared CRUD calls for crm-backend resources shaped as `POST /create`, `GET /`, `PATCH /:id`, `DELETE /:id`. */
export abstract class ApiClient<T, P> {
  protected abstract readonly path: string;
  constructor(protected http: HttpClient) {}

  protected get base(): string { return `${environment.apiUrl}/${this.path}`; }

  list(accessToken: string, params: Record<string, string> = {}): Observable<T[]> { return this.get<T[]>(accessToken, '', params); }
  create(accessToken: string, payload: P): Observable<T> { return this.request(this.http.post<ApiResponse<T>>(`${this.base}/create`, payload, { headers: this.headers(accessToken) })); }
  update(accessToken: string, code: string, payload: Partial<P>): Observable<T> { return this.request(this.http.patch<ApiResponse<T>>(`${this.base}/${code}`, payload, { headers: this.headers(accessToken) })); }
  remove(accessToken: string, code: string): Observable<unknown> { return this.request(this.http.delete<ApiResponse<unknown>>(`${this.base}/${code}`, { headers: this.headers(accessToken) })); }

  protected get<R>(accessToken: string, suffix: string, params: Record<string, string> = {}): Observable<R> {
    return this.request(this.http.get<ApiResponse<R>>(`${this.base}${suffix}`, { headers: this.headers(accessToken), params }));
  }

  protected headers(accessToken: string): HttpHeaders { return new HttpHeaders({ accesstoken: accessToken }); }

  protected request<R>(call: Observable<ApiResponse<R>>): Observable<R> {
    return call.pipe(map(response => response.data), catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error)))));
  }
}

/** Local calendar date as YYYY-MM-DD (toISOString would shift it a day back in IST). */
export const isoDay = (value: unknown): string => {
  const date = value instanceof Date ? value : new Date(String(value));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
/** "2026-10-19T00:00:00Z" from the API -> a local Date on that calendar day. */
export const fromApiDay = (value: string): Date => { const [year, month, day] = value.slice(0, 10).split('-').map(Number); return new Date(year, month - 1, day); };
/** "2026-10-19T00:00:00Z" -> "19 Oct 2026" */
export const dayLabel = (value: string | null | undefined): string => value ? fromApiDay(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

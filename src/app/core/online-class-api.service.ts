import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './api-client';
import { AuthApiService } from './auth-api.service';

export type OnlineClassStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';
/** A Google Meet link: https://meet.google.com/abc-defg-hij */
export const MEET_LINK = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(\?\S*)?$/;

export interface ApiOnlineClass {
  _id: string; classCode: string; subject: string; topic: string; teacherName: string | null; date: string; startTime: string; endTime: string;
  meetLink?: string; description: string | null; recordingLink: string | null; startedAt: string | null; completedAt: string | null; cancelled: boolean;
  seriesId: string | null; batches: { batchCode: string; name: string; courseName: string | null }[]; status: OnlineClassStatus; joinable: boolean;
  /** Staff only. */ joinCount?: number;
  /** Student portal only. */ joined?: boolean;
}
export interface OnlineClassPayload {
  batchCodes: string[]; subject: string; topic: string; teacherCode?: string | null; date: string; startTime: string; endTime: string;
  meetLink: string; description: string | null; repeatDays?: string[]; repeatWeeks?: number;
}

/** Client for crm-backend /online-class (owner and teachers) and /portal/online-classes (students). */
@Injectable({ providedIn: 'root' })
export class OnlineClassApiService {
  private readonly base = `${environment.apiUrl}/online-class`;
  private readonly portal = `${environment.apiUrl}/portal/online-classes`;
  constructor(private http: HttpClient) {}

  list(token: string): Observable<ApiOnlineClass[]> { return this.call(this.http.get<ApiResponse<ApiOnlineClass[]>>(this.base, this.opts(token))); }
  /** One class, or one per repeat day. */
  create(token: string, payload: OnlineClassPayload): Observable<ApiOnlineClass[]> { return this.call(this.http.post<ApiResponse<ApiOnlineClass[]>>(`${this.base}/create`, payload, this.opts(token))); }
  update(token: string, code: string, payload: Partial<OnlineClassPayload> & { cancelled?: boolean; recordingLink?: string | null }): Observable<ApiOnlineClass> { return this.call(this.http.patch<ApiResponse<ApiOnlineClass>>(`${this.base}/${code}`, payload, this.opts(token))); }
  remove(token: string, code: string, series = false): Observable<{ deleted: number }> { return this.call(this.http.delete<ApiResponse<{ deleted: number }>>(`${this.base}/${code}${series ? '?series=true' : ''}`, this.opts(token))); }
  start(token: string, code: string): Observable<ApiOnlineClass> { return this.call(this.http.post<ApiResponse<ApiOnlineClass>>(`${this.base}/${code}/start`, {}, this.opts(token))); }
  complete(token: string, code: string, recordingLink: string | null): Observable<ApiOnlineClass> { return this.call(this.http.post<ApiResponse<ApiOnlineClass>>(`${this.base}/${code}/complete`, { recordingLink }, this.opts(token))); }
  attendance(token: string, code: string): Observable<{ name: string; joinedAt: string }[]> { return this.call(this.http.get<ApiResponse<{ name: string; joinedAt: string }[]>>(`${this.base}/${code}/attendance`, this.opts(token))); }

  /** Student / parent portal. `child` is the parent's chosen child code. */
  portalList(token: string, child?: string): Observable<ApiOnlineClass[]> { return this.call(this.http.get<ApiResponse<ApiOnlineClass[]>>(this.portal, { ...this.opts(token), params: child ? { student: child } : {} })); }
  join(token: string, code: string): Observable<{ meetLink: string; topic: string }> { return this.call(this.http.post<ApiResponse<{ meetLink: string; topic: string }>>(`${this.portal}/${code}/join`, {}, this.opts(token))); }

  private opts(token: string) { return { headers: new HttpHeaders({ accesstoken: token }) }; }
  private call<T>(request: Observable<ApiResponse<T>>): Observable<T> {
    return request.pipe(map(response => response.data), catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error)))));
  }
}

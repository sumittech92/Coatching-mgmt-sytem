import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';

export type ApiNoticeType = 'general' | 'holiday' | 'exam' | 'feeReminder' | 'newBatch' | 'ptm' | 'important';
export type ApiNoticeAudience = 'everyone' | 'students' | 'teachers';
export type ApiNoticeState = 'draft' | 'scheduled' | 'live' | 'expired';
export const NOTICE_TYPE_LABELS: Record<ApiNoticeType, string> = { general: 'General', holiday: 'Holiday', exam: 'Exam', feeReminder: 'Fee Reminder', newBatch: 'New Batch', ptm: 'PTM', important: 'Important' };
export const NOTICE_AUDIENCE_LABELS: Record<ApiNoticeAudience, string> = { everyone: 'Everyone', students: 'Students & parents', teachers: 'Teachers only' };
export const NOTICE_STATE_LABELS: Record<ApiNoticeState, string> = { draft: 'Draft', scheduled: 'Scheduled', live: 'Published', expired: 'Expired' };

/** A notice as crm-backend returns it. `state` follows the publish / expiry dates; `canManage` says whether this user may change it. */
export interface ApiNotice {
  _id: string;
  noticeCode: string;
  workType: 'school' | 'coaching';
  title: string;
  description: string;
  type: ApiNoticeType;
  audience: ApiNoticeAudience;
  course: { courseCode: string; name: string } | null;
  batches: { batchCode: string; name: string }[];
  publishDate: string;
  expiryDate: string | null;
  pinned: boolean;
  showOnWebsite: boolean;
  status: 'published' | 'draft';
  state: ApiNoticeState;
  canManage: boolean;
}

export interface NoticePayload {
  title: string;
  description: string;
  type: ApiNoticeType;
  audience: ApiNoticeAudience;
  courseCode?: string | null;
  batchCodes: string[];
  publishDate?: string | null;
  expiryDate?: string | null;
  pinned: boolean;
  showOnWebsite?: boolean;
  status: 'published' | 'draft';
}

interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Thin client for crm-backend /notice routes. */
@Injectable({ providedIn: 'root' })
export class NoticeApiService {
  private readonly base = `${environment.apiUrl}/notice`;

  constructor(private http: HttpClient) {}

  list(accessToken: string): Observable<ApiNotice[]> {
    return this.request(this.http.get<ApiResponse<ApiNotice[]>>(this.base, { headers: this.headers(accessToken) }));
  }

  create(accessToken: string, payload: NoticePayload): Observable<ApiNotice> {
    return this.request(this.http.post<ApiResponse<ApiNotice>>(`${this.base}/create`, payload, { headers: this.headers(accessToken) }));
  }

  update(accessToken: string, noticeCode: string, payload: Partial<NoticePayload>): Observable<ApiNotice> {
    return this.request(this.http.patch<ApiResponse<ApiNotice>>(`${this.base}/${noticeCode}`, payload, { headers: this.headers(accessToken) }));
  }

  remove(accessToken: string, noticeCode: string): Observable<unknown> {
    return this.request(this.http.delete<ApiResponse<unknown>>(`${this.base}/${noticeCode}`, { headers: this.headers(accessToken) }));
  }

  private headers(accessToken: string): HttpHeaders { return new HttpHeaders({ accesstoken: accessToken }); }

  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }
}

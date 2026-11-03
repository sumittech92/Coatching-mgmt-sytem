import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';

export type ApiEnquiryStatus = 'new' | 'contacted' | 'interested' | 'joined' | 'rejected';
export type ApiEnquirySource = 'website' | 'referral' | 'instagram' | 'walkIn' | 'phone';

/** An admission enquiry as crm-backend returns it. `enquiryCode` is the 6-digit ID used in URLs. */
export interface ApiEnquiry {
  _id: string;
  enquiryCode: string;
  workType: 'school' | 'coaching';
  adminId: string;
  studentName: string;
  parentName: string | null;
  countryCode: string;
  phoneNumber: string;
  email: string | null;
  className: string | null;
  previousSchool: string | null;
  message: string | null;
  source: ApiEnquirySource;
  status: ApiEnquiryStatus;
  enquiryDate: string;
  followUpDate: string | null;
  createdAt?: string;
}

export interface EnquiryPayload {
  studentName?: string;
  parentName?: string | null;
  countryCode?: string;
  phoneNumber?: string;
  className?: string | null;
  previousSchool?: string | null;
  message?: string | null;
  source?: ApiEnquirySource;
  status?: ApiEnquiryStatus;
  enquiryDate?: string | null;
  followUpDate?: string | null;
}

/** What a visitor fills on the public website. */
export interface PublicEnquiryPayload { studentName: string; parentName: string; countryCode: string; phoneNumber: string; className: string; message?: string; }
export interface PublicSite { siteSlug: string; instituteName: string; workType: 'school' | 'coaching'; }

interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Thin client for crm-backend /admission routes. Owner token for the list; the /public routes need no sign-in. */
@Injectable({ providedIn: 'root' })
export class AdmissionApiService {
  private readonly base = `${environment.apiUrl}/admission`;

  constructor(private http: HttpClient) {}

  list(accessToken: string): Observable<ApiEnquiry[]> {
    return this.request(this.http.get<ApiResponse<ApiEnquiry[]>>(this.base, { headers: this.headers(accessToken) }));
  }

  create(accessToken: string, payload: EnquiryPayload): Observable<ApiEnquiry> {
    return this.request(this.http.post<ApiResponse<ApiEnquiry>>(`${this.base}/create`, payload, { headers: this.headers(accessToken) }));
  }

  update(accessToken: string, enquiryCode: string, payload: EnquiryPayload): Observable<ApiEnquiry> {
    return this.request(this.http.patch<ApiResponse<ApiEnquiry>>(`${this.base}/${enquiryCode}`, payload, { headers: this.headers(accessToken) }));
  }

  remove(accessToken: string, enquiryCode: string): Observable<unknown> {
    return this.request(this.http.delete<ApiResponse<unknown>>(`${this.base}/${enquiryCode}`, { headers: this.headers(accessToken) }));
  }

  /** Institute name and work type behind a public website address. */
  publicSite(siteSlug: string): Observable<PublicSite> {
    return this.request(this.http.get<ApiResponse<PublicSite>>(`${this.base}/public/${encodeURIComponent(siteSlug)}`));
  }

  /** Website enquiry form. A repeat from the same mobile refreshes the open enquiry (`updated: true`). */
  submitPublic(siteSlug: string, payload: PublicEnquiryPayload): Observable<{ enquiryCode: string; updated: boolean }> {
    return this.request(this.http.post<ApiResponse<{ enquiryCode: string; updated: boolean }>>(`${this.base}/public/${encodeURIComponent(siteSlug)}/enquiry`, payload));
  }

  private headers(accessToken: string): HttpHeaders { return new HttpHeaders({ accesstoken: accessToken }); }

  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }
}

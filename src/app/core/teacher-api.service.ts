import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiUser, AuthApiService } from './auth-api.service';

export type ApiTeacherStatus = 'active' | 'inactive' | 'pending' | 'onLeave';

export interface ApiTeacherSchoolInfo { employeeId?: string | null; designation: string | null; department: string | null; qualification: string[]; subjects: string[]; classesTaught: string[]; }
export interface ApiTeacherCoachingInfo { qualification: string[]; experience: number | null; subjects: string[]; classesTaught: string[]; }

/** A teacher profile as crm-backend returns it. `teacherCode` is the 6-digit ID used in URLs. */
export interface ApiTeacher {
  _id: string;
  teacherCode: string;
  workType: 'school' | 'coaching';
  teacherId: string;
  fullName: string | null;
  email: string | null;
  countryCode: string | null;
  phoneNumber: string | null;
  joiningDate: string | null;
  status: ApiTeacherStatus;
  profileImage: string | null;
  gender: 'male' | 'female' | null;
  schoolInfo?: ApiTeacherSchoolInfo;
  coachingInfo?: ApiTeacherCoachingInfo;
  createdAt?: string;
}

export interface TeacherPayload {
  fullName: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
  joiningDate?: string | null;
  status: ApiTeacherStatus;
  schoolInfo?: Omit<ApiTeacherSchoolInfo, 'employeeId'>;
  coachingInfo?: ApiTeacherCoachingInfo;
}
export type CreateTeacherPayload = TeacherPayload & { password: string };

interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Thin client for crm-backend /teacher routes (Owner / Super Admin token required). The backend scopes results to the owner's work type. */
@Injectable({ providedIn: 'root' })
export class TeacherApiService {
  private readonly base = `${environment.apiUrl}/teacher`;

  constructor(private http: HttpClient) {}

  list(accessToken: string): Observable<ApiTeacher[]> {
    return this.request(this.http.get<ApiResponse<ApiTeacher[]>>(this.base, { headers: this.headers(accessToken) }));
  }

  get(accessToken: string, teacherCode: string): Observable<ApiTeacher> {
    return this.request(this.http.get<ApiResponse<ApiTeacher>>(`${this.base}/${teacherCode}`, { headers: this.headers(accessToken) }));
  }

  create(accessToken: string, payload: CreateTeacherPayload): Observable<{ id: string; user: ApiUser; teacher: ApiTeacher }> {
    return this.request(this.http.post<ApiResponse<{ id: string; user: ApiUser; teacher: ApiTeacher }>>(`${this.base}/create`, payload, { headers: this.headers(accessToken) }));
  }

  update(accessToken: string, teacherCode: string, payload: Partial<TeacherPayload>): Observable<ApiTeacher> {
    return this.request(this.http.patch<ApiResponse<ApiTeacher>>(`${this.base}/${teacherCode}`, payload, { headers: this.headers(accessToken) }));
  }

  remove(accessToken: string, teacherCode: string): Observable<unknown> {
    return this.request(this.http.delete<ApiResponse<unknown>>(`${this.base}/${teacherCode}`, { headers: this.headers(accessToken) }));
  }

  private headers(accessToken: string): HttpHeaders { return new HttpHeaders({ accesstoken: accessToken }); }

  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }
}

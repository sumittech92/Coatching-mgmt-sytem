import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiUser, AuthApiService } from './auth-api.service';

type Nullable<T> = { [K in keyof T]?: T[K] | null };

export interface CreateStudentPayload {
  fullName: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
  password: string;
  profileImage?: string;
  gender?: 'male' | 'female' | 'other' | null;
  dateOfBirth?: string | null;
  status?: ApiStudentStatus;
  /** Agreed fee (coaching: per month, school: per term) and discount / concession. */
  feePlan?: { amount: number | null; discount: number };
  /** Family portal login on the parent mobile (password needed for a new parent account). */
  parentLogin?: { enabled: boolean; password?: string | null };
  parentsInfo?: Nullable<{ fatherName: string; motherName: string; countryCode: string; phoneNumber: string }>;
  address?: Nullable<{ addressLine: string; city: string; state: string; pincode: string }>;
  schoolInfo?: Nullable<{ schoolName: string; board: string; className: string; section: string; admissionDate: string; rollNumber: string; currentTerm: string; admissionCategory: string }>;
  coachingInfo?: Nullable<{ coachingName: string; className: string; course: string; batchTiming: string; admissionDate: string; schoolName: string; board: string }>;
}

export type ApiStudentStatus = 'active' | 'inactive';
export type ApiFeeStatus = 'paid' | 'pending' | 'overdue';
/** Password is optional on update: the owner sets a new login password. */
export type UpdateStudentPayload = Partial<CreateStudentPayload>;

/** The fields of a crm-backend student profile the Fees and Attendance pages use. `studentCode` is the 6-digit ID. */
export interface ApiStudentSummary { _id: string; studentCode: string; fullName: string | null; workType: 'school' | 'coaching'; }

/**
 * A full student profile with the login email / mobile and attendance %. Owners also get the fee plan and fee status
 * (from Fees records); teachers only see students of their own sections / batches, without fee details.
 */
export interface ApiStudent extends ApiStudentSummary {
  email: string | null;
  countryCode: string | null;
  phoneNumber: string | null;
  profileImage: string | null;
  gender: 'male' | 'female' | 'other' | null;
  dateOfBirth: string | null;
  status: ApiStudentStatus;
  feePlan?: { amount: number | null; discount: number };
  parentsInfo?: { fatherName: string | null; motherName: string | null; countryCode: string | null; phoneNumber: string | null };
  address?: { addressLine: string | null; city: string | null; state: string | null; pincode: string | null };
  schoolInfo?: { schoolName: string | null; board: string | null; className: string | null; section: string | null; admissionDate: string | null; rollNumber: string | null; currentTerm: string | null; admissionCategory: string | null };
  coachingInfo?: { coachingName: string | null; className: string | null; course: string | null; batchTiming: string | null; admissionDate: string | null; schoolName: string | null; board: string | null };
  /** Present / late out of marked days, or null before any attendance is taken. */
  attendance: number | null;
  /** Parent login account, when the owner gave the parent one. */
  parentId?: string | null;
  feeStatus?: ApiFeeStatus;
  feeDue?: number;
  createdAt?: string;
}

interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Thin client for crm-backend /student routes. Owners manage students; teachers can read their own sections' / batches' students. */
@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly base = `${environment.apiUrl}/student`;

  constructor(private http: HttpClient) {}

  list(accessToken: string): Observable<ApiStudent[]> {
    const headers = new HttpHeaders({ accesstoken: accessToken });
    return this.http.get<ApiResponse<ApiStudent[]>>(this.base, { headers }).pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }

  create(accessToken: string, payload: CreateStudentPayload): Observable<{ user: ApiUser; student: unknown }> {
    const headers = new HttpHeaders({ accesstoken: accessToken });
    return this.http.post<ApiResponse<{ user: ApiUser; student: unknown }>>(`${this.base}/create`, payload, { headers }).pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }

  get(accessToken: string, studentCode: string): Observable<ApiStudent> {
    return this.request(this.http.get<ApiResponse<ApiStudent>>(`${this.base}/${studentCode}`, { headers: new HttpHeaders({ accesstoken: accessToken }) }));
  }

  update(accessToken: string, studentCode: string, payload: UpdateStudentPayload): Observable<unknown> {
    return this.request(this.http.patch<ApiResponse<unknown>>(`${this.base}/${studentCode}`, payload, { headers: new HttpHeaders({ accesstoken: accessToken }) }));
  }

  remove(accessToken: string, studentCode: string): Observable<unknown> {
    return this.request(this.http.delete<ApiResponse<unknown>>(`${this.base}/${studentCode}`, { headers: new HttpHeaders({ accesstoken: accessToken }) }));
  }

  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(map(response => response.data), catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error)))));
  }
}

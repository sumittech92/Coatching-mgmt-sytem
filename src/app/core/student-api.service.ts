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
  parentsInfo?: Nullable<{ fatherName: string; motherName: string; countryCode: string; phoneNumber: string }>;
  address?: Nullable<{ addressLine: string; city: string; state: string; pincode: string }>;
  schoolInfo?: Nullable<{ schoolName: string; board: string; className: string; section: string; admissionDate: string; rollNumber: string; currentTerm: string; admissionCategory: string }>;
  coachingInfo?: Nullable<{ coachingName: string; className: string; course: string; batchTiming: string; admissionDate: string; schoolName: string; board: string }>;
}

interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Thin client for crm-backend /student routes (Owner / Super Admin token required). */
@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly base = `${environment.apiUrl}/student`;

  constructor(private http: HttpClient) {}

  create(accessToken: string, payload: CreateStudentPayload): Observable<{ user: ApiUser; student: unknown }> {
    const headers = new HttpHeaders({ accesstoken: accessToken });
    return this.http.post<ApiResponse<{ user: ApiUser; student: unknown }>>(`${this.base}/create`, payload, { headers }).pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export type ApiRole = 'superAdmin' | 'admin' | 'teacher' | 'student' | 'parent';

export interface ApiUser {
  _id: string;
  /** The Auth model field. Older responses used full_Name; read the name through MockAuthService.displayName. */
  fullName?: string | null;
  full_Name: string | null;
  profileImage: string;
  email: string | null;
  countryCode: string | null;
  phoneNumber: string | null;
  workPlace: 'college' | 'school' | 'coaching' | null;
  address: string | null;
  role: ApiRole | null;
  isBlocked: boolean;
  workType?: 'coaching' | 'school' | null;
  createdAt?: string;
  lastLogin?: number;
}

interface ApiResponse<T> { success: boolean; message: string; data: T; }

export interface RegisterPayload { fullName: string; email: string; password: string; countryCode: string; phoneNumber: string; role: 'student' | 'teacher'; }
/** Owner account created by a Super Admin. The backend always saves the role as "admin". */
export interface CreateAdminPayload { fullName: string; email: string; password: string; countryCode: string; phoneNumber: string; workType?: 'coaching' | 'school'; }
// Mobile sign-in: the UI no longer shows a country code, so callers send the default (+91).
export type LoginPayload = { password: string } & ({ email: string } | { countryCode: string; phoneNumber: string });

/** Thin client for crm-backend /auth routes. Errors are rethrown as plain Error with the API's message. */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly base = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  // The backend currently strips `role` and saves every account as a student.
  register(payload: RegisterPayload): Observable<ApiUser> {
    return this.post<ApiUser>('register', payload);
  }

  login(payload: LoginPayload): Observable<{ user: ApiUser; accessToken: string }> {
    return this.post('login', payload);
  }

  /** Returns a short-lived reset token that verify-otp needs. */
  forgotPassword(phoneNumber: string): Observable<{ accessToken: string }> {
    return this.post('forgot-password', { phoneNumber });
  }

  /** Exchanges the reset token + OTP for a verified token that reset-password needs. */
  verifyOtp(resetToken: string, otp: string): Observable<{ accessToken: string }> {
    return this.post('verify-otp', { otp }, resetToken);
  }

  resetPassword(verifiedToken: string, newPassword: string, confirmPassword: string): Observable<unknown> {
    return this.post('reset-password', { newPassword, confirmPassword }, verifiedToken);
  }

  /** Signed-in password change. Needs POST /auth/change-password on crm-backend (not added yet). */
  changePassword(accessToken: string, currentPassword: string, newPassword: string, confirmPassword: string): Observable<unknown> {
    return this.post('change-password', { currentPassword, newPassword, confirmPassword }, accessToken);
  }

  /** Super Admin only. */
  createAdmin(accessToken: string, payload: CreateAdminPayload): Observable<ApiUser> {
    return this.post('create-admin', { ...payload, role: 'admin' }, accessToken);
  }

  logout(accessToken: string): Observable<unknown> {
    return this.post('logout', {}, accessToken);
  }

  private post<T>(path: string, body: object, token?: string): Observable<T> {
    const headers = token ? new HttpHeaders({ accesstoken: token }) : undefined;
    return this.http.post<ApiResponse<T>>(`${this.base}/${path}`, body, { headers }).pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }

  static messageFor(error: HttpErrorResponse): string {
    if (error.status === 0) return 'Cannot reach the server. Check that the backend is running and try again.';
    if (error.status === 404) return 'This action is not available on the server yet.';
    return error.error?.message || 'Something went wrong. Please try again.';
  }
}

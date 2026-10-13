import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export type ApiRole = 'superAdmin' | 'admin' | 'teacher' | 'student' | 'parent';

export interface ApiUser {
  _id: string;
  full_Name: string | null;
  profileImage: string;
  email: string | null;
  countryCode: string | null;
  phoneNumber: string | null;
  workPlace: 'college' | 'school' | 'coaching' | null;
  address: string | null;
  role: ApiRole | null;
  isBlocked: boolean;
}

interface ApiResponse<T> { success: boolean; message: string; data: T; }

export interface RegisterPayload { fullName: string; email: string; password: string; countryCode: string; phoneNumber: string; role: 'student' | 'teacher'; }
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

  private static messageFor(error: HttpErrorResponse): string {
    if (error.status === 0) return 'Cannot reach the server. Check that the backend is running and try again.';
    return error.error?.message || 'Something went wrong. Please try again.';
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';

export type ReportType = 'fees' | 'attendance' | 'admissions' | 'academic';
export interface ReportColumn { key: string; label: string; type?: 'text' | 'number' | 'money' | 'percent' | 'date'; }
export interface ReportTable { key: string; title: string; columns: ReportColumn[]; rows: Record<string, unknown>[]; }
export interface Report { type: ReportType; from: string; to: string; summary: { label: string; value: string | number; hint?: string }[]; tables: ReportTable[]; }

interface DashItem { time: string; title: string; detail: string; status: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info'; }
/** Owner home page figures from crm-backend. */
export interface OwnerDashboard {
  role: 'owner'; workType: 'school' | 'coaching';
  students: { total: number; newThisMonth: number }; teachers: number; classes: { courses: number; batches: number };
  attendanceToday: { marked: number; present: number; percent: number };
  fees: { today: number; month: number; pending: number; pendingStudents: number; monthRate: number };
  enquiries: { new: number; followUpsDue: number; thisMonth: number };
  recentAdmissions: { name: string; course: string; time: string; initials: string }[];
  pendingFees: { name: string; detail: string; amount: number }[];
  attendanceByGroup: { name: string; present: number; total: number }[];
  attendanceWeek: { day: string; present: number; absent: number; marked: number }[];
  feeBuckets: { day: string; amount: number; height: number }[];
  upcomingTests: { date: string; title: string; detail: string; status: string }[];
  recentPosts: { title: string; date: string; type: string }[];
  notices: { day: string; month: string; title: string; detail: string }[];
  schoolStages: { name: string; detail: string; icon: string; tone: string }[];
}
/** Teacher "My dashboard" from crm-backend. */
export interface TeacherDashboard { role: 'teacher'; name: string; today: DashItem[]; groups: DashItem[]; work: DashItem[]; }

interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Thin client for crm-backend /report (reports and dashboard summaries). */
@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private readonly base = `${environment.apiUrl}/report`;

  constructor(private http: HttpClient) {}

  report(token: string, type: ReportType, from: string, to: string): Observable<Report> {
    return this.request(this.http.get<ApiResponse<Report>>(`${this.base}/${type}`, { headers: this.headers(token), params: { from, to } }));
  }

  dashboard(token: string): Observable<OwnerDashboard | TeacherDashboard> {
    return this.request(this.http.get<ApiResponse<OwnerDashboard | TeacherDashboard>>(`${this.base}/dashboard/summary`, { headers: this.headers(token) }));
  }

  private headers(token: string): HttpHeaders { return new HttpHeaders({ accesstoken: token }); }
  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(map(response => response.data), catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error)))));
  }
}

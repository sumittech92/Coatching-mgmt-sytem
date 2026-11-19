import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './api-client';
import { AuthApiService } from './auth-api.service';

export type ApiSubscriptionStatus = 'active' | 'dueSoon' | 'expired' | 'cancelled';
export const SUBSCRIPTION_STATUS_LABELS: Record<ApiSubscriptionStatus, string> = { active: 'Active', dueSoon: 'Due soon', expired: 'Expired', cancelled: 'Cancelled' };

export interface ApiSubscriptionPayment { _id?: string; paidOn: string; amount: number; months: number; reference: string | null; }
export interface ApiSubscription {
  _id: string; subscriptionCode: string; adminId: string; plan: string; amount: number; startDate: string; renewalDate: string;
  cancelled: boolean; note: string | null; payments: ApiSubscriptionPayment[]; status: ApiSubscriptionStatus; paidTotal: number;
  institute: { _id: string; instituteName: string | null; fullName: string | null; workType: 'school' | 'coaching' | null } | null;
}

/** An owner account as the Super Admin sees it: institute, brand, counts and plan. */
export interface ApiWorkspace {
  _id: string; fullName: string | null; email: string | null; countryCode: string | null; phoneNumber: string | null;
  workType: 'school' | 'coaching' | null; instituteName: string | null; siteSlug: string | null; customDomain: string | null;
  isBlocked: boolean; isSuspended: boolean; disabledModules: string[]; createdAt: string; lastLogin?: number;
  address: string | null; brandColor: string; secondaryColor: string; logo: string | null;
  students: number; teachers: number; subscription: ApiSubscription | null;
}
export interface WorkspacePayload {
  instituteName?: string; fullName?: string; email?: string; phoneNumber?: string; address?: string | null;
  brandColor?: string; secondaryColor?: string; logo?: string | null; disabledModules?: string[];
}
export interface SubscriptionPayload { adminId: string; plan: string; amount: number; startDate: string; renewalDate: string; cancelled?: boolean; note?: string | null; }
export interface RenewPayload { months: number; amount?: number; paidOn?: string; reference?: string | null; }

export interface ApiPlan { name: string; amount: number; description: string | null; }
export interface ApiPlatformSettings { plans: ApiPlan[]; supportPhone: string | null; supportEmail: string | null; reminderDays: number; }

export interface PlatformSummary {
  workspaces: { total: number; school: number; coaching: number; active: number; inactive: number; newThisMonth: number };
  users: { students: number; teachers: number; parents: number };
  subscriptions: { total: number; active: number; dueSoon: number; expired: number; mrr: number };
  revenue: { thisMonth: number; total: number; byMonth: { month: string; amount: number }[] };
  growth: { month: string; count: number }[];
  recentWorkspaces: ApiWorkspace[];
  topWorkspaces: ApiWorkspace[];
  renewals: ApiSubscription[];
  activity: { kind: 'workspace' | 'payment'; title: string; detail: string; at: string }[];
}

/** Client for crm-backend /platform (Super Admin only). */
@Injectable({ providedIn: 'root' })
export class PlatformApiService {
  private readonly base = `${environment.apiUrl}/platform`;
  constructor(private http: HttpClient) {}

  summary(token: string): Observable<PlatformSummary> { return this.call(this.http.get<ApiResponse<PlatformSummary>>(`${this.base}/summary`, this.options(token))); }
  workspaces(token: string): Observable<ApiWorkspace[]> { return this.call(this.http.get<ApiResponse<ApiWorkspace[]>>(`${this.base}/workspaces`, this.options(token))); }
  workspace(token: string, id: string): Observable<ApiWorkspace> { return this.call(this.http.get<ApiResponse<ApiWorkspace>>(`${this.base}/workspaces/${id}`, this.options(token))); }
  updateWorkspace(token: string, id: string, payload: WorkspacePayload): Observable<ApiWorkspace> { return this.call(this.http.patch<ApiResponse<ApiWorkspace>>(`${this.base}/workspaces/${id}`, payload, this.options(token))); }
  setActive(token: string, id: string, active: boolean): Observable<ApiWorkspace> { return this.call(this.http.patch<ApiResponse<ApiWorkspace>>(`${this.base}/workspaces/${id}/status`, { active }, this.options(token))); }

  subscriptions(token: string): Observable<ApiSubscription[]> { return this.call(this.http.get<ApiResponse<ApiSubscription[]>>(`${this.base}/subscriptions`, this.options(token))); }
  createSubscription(token: string, payload: SubscriptionPayload): Observable<ApiSubscription> { return this.call(this.http.post<ApiResponse<ApiSubscription>>(`${this.base}/subscriptions/create`, payload, this.options(token))); }
  updateSubscription(token: string, code: string, payload: Partial<SubscriptionPayload>): Observable<ApiSubscription> { return this.call(this.http.patch<ApiResponse<ApiSubscription>>(`${this.base}/subscriptions/${code}`, payload, this.options(token))); }
  renewSubscription(token: string, code: string, payload: RenewPayload): Observable<ApiSubscription> { return this.call(this.http.post<ApiResponse<ApiSubscription>>(`${this.base}/subscriptions/${code}/renew`, payload, this.options(token))); }
  removeSubscription(token: string, code: string): Observable<unknown> { return this.call(this.http.delete<ApiResponse<unknown>>(`${this.base}/subscriptions/${code}`, this.options(token))); }

  settings(token: string): Observable<ApiPlatformSettings> { return this.call(this.http.get<ApiResponse<ApiPlatformSettings>>(`${this.base}/settings`, this.options(token))); }
  updateSettings(token: string, payload: Partial<ApiPlatformSettings>): Observable<ApiPlatformSettings> { return this.call(this.http.put<ApiResponse<ApiPlatformSettings>>(`${this.base}/settings`, payload, this.options(token))); }

  private options(token: string) { return { headers: new HttpHeaders({ accesstoken: token }) }; }
  private call<T>(request: Observable<ApiResponse<T>>): Observable<T> {
    return request.pipe(map(response => response.data), catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error)))));
  }
}

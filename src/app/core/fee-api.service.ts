import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';
import { PaymentDetails, PortalFeeSubmission, PortalSubmissionStatus } from './portal-api.service';

export type ApiFeeStatus = 'Paid' | 'Partial' | 'Pending' | 'Overdue';
export interface ApiFeePayment { id: string; receiptNo: string; amount: number; discount: number; mode: string; date: string; reference: string | null; note?: string | null; }

/** A fee (one student, one month / term) as crm-backend returns it. Dates are YYYY-MM-DD. */
export interface ApiFee {
  id: string;
  studentId: string;
  student: string;
  course: string;
  batch: string;
  phone: string;
  period: string;
  totalFee: number;
  discount: number;
  paid: number;
  due: number;
  status: ApiFeeStatus;
  dueDate: string | null;
  note: string | null;
  lastPayment: Omit<ApiFeePayment, 'id'> | null;
  payments: ApiFeePayment[];
}
export interface ApiFeeSummary { todayCollection: number; monthCollection: number; totalCollected: number; pendingFees: number; pendingStudentCount: number; overdueFees: number; month: string; }
export interface CreateFeePayload { studentIds: string[]; period: string; totalFee: number; discount?: number; dueDate?: string | null; note?: string | null; }
export interface CollectFeePayload { studentIds: string[]; period: string; amount: number; discount?: number; mode: string; date: string; reference?: string | null; note?: string | null; totalFee?: number | null; dueDate?: string | null; }
export type UpdateFeePayload = Partial<Pick<CreateFeePayload, 'totalFee' | 'discount' | 'dueDate' | 'note'>>;

interface ApiResponse<T> { success: boolean; message: string; data: T; }

/** Thin client for crm-backend /fee routes (Owner / Super Admin token). The backend scopes results to the owner's institute. */
@Injectable({ providedIn: 'root' })
export class FeeApiService {
  private readonly base = `${environment.apiUrl}/fee`;

  constructor(private http: HttpClient) {}

  list(accessToken: string): Observable<ApiFee[]> {
    return this.request(this.http.get<ApiResponse<ApiFee[]>>(this.base, { headers: this.headers(accessToken) }));
  }

  summary(accessToken: string): Observable<ApiFeeSummary> {
    return this.request(this.http.get<ApiResponse<ApiFeeSummary>>(`${this.base}/summary`, { headers: this.headers(accessToken) }));
  }

  forStudent(accessToken: string, studentCode: string): Observable<ApiFee[]> {
    return this.request(this.http.get<ApiResponse<ApiFee[]>>(`${this.base}/student/${studentCode}`, { headers: this.headers(accessToken) }));
  }

  create(accessToken: string, payload: CreateFeePayload): Observable<ApiFee[]> {
    return this.request(this.http.post<ApiResponse<ApiFee[]>>(`${this.base}/create`, payload, { headers: this.headers(accessToken) }));
  }

  /** Records a payment; creates the fee first when `totalFee` is given and none exists for the period. */
  collect(accessToken: string, payload: CollectFeePayload): Observable<ApiFee[]> {
    return this.request(this.http.post<ApiResponse<ApiFee[]>>(`${this.base}/collect`, payload, { headers: this.headers(accessToken) }));
  }

  update(accessToken: string, id: string, payload: UpdateFeePayload): Observable<ApiFee> {
    return this.request(this.http.patch<ApiResponse<ApiFee>>(`${this.base}/${id}`, payload, { headers: this.headers(accessToken) }));
  }

  /** Payments students / parents reported from the portal. */
  submissions(accessToken: string, status?: PortalSubmissionStatus): Observable<PortalFeeSubmission[]> {
    return this.request(this.http.get<ApiResponse<PortalFeeSubmission[]>>(`${this.base}/submissions`, { headers: this.headers(accessToken), params: status ? { status } : {} }));
  }
  /** Records the payment (with a receipt) and marks the submission approved. */
  approveSubmission(accessToken: string, id: string): Observable<{ submission: PortalFeeSubmission; fee: ApiFee }> {
    return this.request(this.http.post<ApiResponse<{ submission: PortalFeeSubmission; fee: ApiFee }>>(`${this.base}/submissions/${id}/approve`, {}, { headers: this.headers(accessToken) }));
  }
  rejectSubmission(accessToken: string, id: string, reason?: string): Observable<PortalFeeSubmission> {
    return this.request(this.http.post<ApiResponse<PortalFeeSubmission>>(`${this.base}/submissions/${id}/reject`, { reason: reason || null }, { headers: this.headers(accessToken) }));
  }
  /** UPI / bank details shown in the portal's Pay fees form. */
  paymentDetails(accessToken: string): Observable<PaymentDetails> {
    return this.request(this.http.get<ApiResponse<PaymentDetails>>(`${this.base}/settings`, { headers: this.headers(accessToken) }));
  }
  savePaymentDetails(accessToken: string, details: Partial<PaymentDetails>): Observable<PaymentDetails> {
    return this.request(this.http.put<ApiResponse<PaymentDetails>>(`${this.base}/settings`, details, { headers: this.headers(accessToken) }));
  }

  remove(accessToken: string, id: string): Observable<unknown> {
    return this.request(this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}`, { headers: this.headers(accessToken) }));
  }

  private headers(accessToken: string): HttpHeaders { return new HttpHeaders({ accesstoken: accessToken }); }

  private request<T>(call: Observable<ApiResponse<T>>): Observable<T> {
    return call.pipe(
      map(response => response.data),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(AuthApiService.messageFor(error))))
    );
  }
}
